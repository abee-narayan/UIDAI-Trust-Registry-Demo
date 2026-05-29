"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

type TrustEntity = {
  id: string;
  name: string;
  type: "Proprietary" | "OpenID4VP (Centralized)" | "OpenID4VP (Federated)";
  status: "Active" | "Revoked" | "Pending";
  domain: string;
  cryptoData?: string;
};

export default function Home() {
  const [entities, setEntities] = useState<TrustEntity[]>([]);
  const [wallets, setWallets] = useState<TrustEntity[]>([]);
  const [activeTab, setActiveTab] = useState<'verifiers' | 'wallets'>('verifiers');
  const [selectedEntity, setSelectedEntity] = useState<TrustEntity | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Revocation state
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState('');

  const fetchVerifiers = async () => {
      try {
        const response = await fetch('/api/verifiers');
        if (response.ok) {
          const data = await response.json();
          // Map to match TrustEntity structure
          const formatted = data.map((v: any) => ({
            id: v.id,
            name: v.name,
            type: v.integrationMethod,
            status: v.status || "Active",
            domain: v.domain || "N/A",
            logoUrl: v.logoUrl,
            cryptoData: v.certificatePem
          }));
          
          const allEntities = [
            ...formatted,
            { id: "VER-1001", name: "Ministry of Health", type: "proprietary", status: "Active", domain: "health.gov.in", cryptoData: JSON.stringify({ jwk: { kty: "RSA", e: "AQAB", n: "mock_modulus...", alg: "RS256" } }, null, 2) },
            { id: "VER-1002", name: "State Bank of India", type: "federated", status: "Active", domain: "sbi.co.in", cryptoData: JSON.stringify({ federation_fetch_endpoint: "/api/federation/fetch?sub=https://sbi.co.in" }, null, 2) },
          ];
          setEntities(allEntities.reverse());
        }
      } catch (err) {
        console.error(err);
      }
  };

  const fetchWallets = async () => {
      try {
        const response = await fetch('/api/wallets');
        if (response.ok) {
          const data = await response.json();
          const formatted = data.map((w: any) => ({
            id: w.id,
            name: w.name,
            type: w.integrationMethod,
            status: w.status || "Active",
            domain: w.domain || "N/A",
            logoUrl: w.logoUrl,
            cryptoData: w.certificatePem
          }));
          setWallets(formatted.reverse());
        }
      } catch (err) {
        console.error(err);
      }
  };

  useEffect(() => {
    fetchVerifiers();
    fetchWallets();
  }, []);

  const handleRevoke = async (entityId: string, entityType: 'verifiers' | 'wallets') => {
    const typeLabel = entityType === 'verifiers' ? 'Verifier' : 'Wallet';
    const password = window.prompt(`Enter Admin Password to revoke this ${typeLabel}:`);
    if (!password) return;

    try {
      setIsRevoking(true);
      setRevokeError('');
      
      const endpoint = entityType === 'verifiers' ? '/api/verifiers/revoke' : '/api/wallets/revoke';
      const bodyPayload = entityType === 'verifiers' ? { verifierId: entityId } : { walletId: entityId };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`
        },
        body: JSON.stringify(bodyPayload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke');
      }

      alert(`${typeLabel} successfully revoked.`);
      if (entityType === 'verifiers') await fetchVerifiers();
      else await fetchWallets();
      setSelectedEntity(prev => prev ? { ...prev, status: "Revoked" } : null);
    } catch (err: any) {
      setRevokeError(err.message);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRotateKey = async () => {
    const password = window.prompt("Enter Admin Password to rotate the Trust Anchor Key:");
    if (!password) return;

    try {
      const response = await fetch('/api/admin/rotate-key', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to rotate key');
      }

      alert("Trust Anchor Key successfully rotated. All active verifier certificates have been regenerated.");
      await fetchVerifiers(); // refresh
      await fetchWallets(); // refresh
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const activeEntities = activeTab === 'verifiers' ? entities : wallets;
  const totalPages = Math.ceil(activeEntities.length / itemsPerPage);
  const currentEntities = activeEntities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="animate-fade-in">
      <header style={{ textAlign: "center", margin: "4rem 0" }}>
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: "3rem", marginBottom: "1rem" }}
          className="gradient-text"
        >
          Trust Infrastructure
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ color: "var(--text-secondary)", fontSize: "1.125rem", maxWidth: "600px", margin: "0 auto", paddingBottom: "2rem" }}
        >
          The authoritative source for Aadhaar Verifiers and Wallets. Enabling seamless verifiable credential exchange through cryptographically secured trust lists and OpenID Federation.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <a href="/onboarding-verifier" className="btn-primary" style={{ textDecoration: 'none', padding: '0.8rem 2rem', fontSize: '1.1rem', borderRadius: '12px' }}>
            Onboard New Verifier
          </a>
          <a href="/onboarding-wallet" className="btn-primary" style={{ textDecoration: 'none', padding: '0.8rem 2rem', fontSize: '1.1rem', borderRadius: '12px', background: 'linear-gradient(to right, #10B981, #059669)' }}>
            Onboard New Wallet
          </a>
          <button onClick={handleRotateKey} className="btn-secondary" style={{ padding: '0.8rem 2rem', fontSize: '1.1rem', borderRadius: '12px' }}>
            Rotate Trust Anchor Key
          </button>
        </motion.div>
      </header>

      <section className="grid-cards">
        <motion.div 
          className="card"
          whileHover={{ y: -5 }}
        >
          <div className="icon-box">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
          <h3>Proprietary Specs</h3>
          <p style={{ marginBottom: "1.5rem" }}>UIDAI Trust List API JSON endpoint for existing entities using static JWK based trust.</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <a href="/api/lote?type=verifier" target="_blank" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', textDecoration: 'none' }}>API (Verifiers)</a>
            <a href="/api/lote?type=wallet" target="_blank" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', textDecoration: 'none', borderColor: '#10B981', color: '#10B981' }}>API (Wallets)</a>
          </div>
        </motion.div>

        <motion.div 
          className="card"
          whileHover={{ y: -5 }}
        >
          <div className="icon-box">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
          </div>
          <h3>OpenID Federation</h3>
          <p style={{ marginBottom: "1.5rem" }}>Dynamic trust establishment with Subordinate Entity Statements for participants.</p>
          <a href="/.well-known/openid-federation" target="_blank" className="btn-secondary" style={{ display: 'inline-block', fontSize: '0.8rem', padding: '0.5rem 1rem', textDecoration: 'none' }}>View Anchor Config</a>
        </motion.div>

        <motion.div 
          className="card"
          whileHover={{ y: -5 }}
        >
          <div className="icon-box">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <h3>Centralized OpenID4VP</h3>
          <p style={{ marginBottom: "1.5rem" }}>X.509 certificate hosting within the centralized LoTE for static participants.</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <a href="/api/lote?type=verifier" target="_blank" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', textDecoration: 'none' }}>X.509 (Verifiers)</a>
            <a href="/api/lote?type=wallet" target="_blank" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', textDecoration: 'none', borderColor: '#10B981', color: '#10B981' }}>X.509 (Wallets)</a>
          </div>
        </motion.div>
      </section>

      <section style={{ margin: "5rem 0" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: "1.5rem" }}>
          <h2>{activeTab === 'verifiers' ? 'Trusted Verifiers' : 'Trusted Wallets'}</h2>
          
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '12px' }}>
            <button 
              onClick={() => {setActiveTab('verifiers'); setCurrentPage(1);}} 
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s',
                background: activeTab === 'verifiers' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'verifiers' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              Verifiers
            </button>
            <button 
              onClick={() => {setActiveTab('wallets'); setCurrentPage(1);}} 
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s',
                background: activeTab === 'wallets' ? '#10B981' : 'transparent',
                color: activeTab === 'wallets' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              Wallets
            </button>
          </div>
        </div>

        <div className="glass-panel">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Client ID / Name</th>
                  <th>Domain</th>
                  <th>Integration Type</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentEntities.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No {activeTab} found in the registry.
                    </td>
                  </tr>
                ) : (
                  currentEntities.map((entity: any) => (
                    <tr key={entity.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {entity.logoUrl ? (
                            <img src={entity.logoUrl} alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', background: '#fff' }} />
                          ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '1.2rem' }}>🏛️</span>
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{entity.name}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{entity.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{entity.domain}</td>
                      <td>
                        <span className="badge badge-info">{entity.type}</span>
                      </td>
                      <td>
                        <span className={`badge ${entity.status === 'Active' ? 'badge-success' : 'badge-info'}`} style={entity.status === 'Revoked' ? { background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' } : {}}>
                          {entity.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn-secondary" style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }} onClick={() => setSelectedEntity(entity)}>Details</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', gap: '1rem', borderTop: '1px solid var(--border)' }}>
              <button 
                className="btn-secondary" 
                style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                disabled={currentPage <= 1} 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button 
                className="btn-secondary" 
                style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                disabled={currentPage >= totalPages} 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {selectedEntity && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setSelectedEntity(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="glass-panel" style={{ padding: '2.5rem', minWidth: '450px', background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>{selectedEntity.name}</h2>
              <div style={{ display: 'grid', gap: '1rem', color: 'var(--text-secondary)' }}>
                <p><strong style={{ color: 'var(--text-primary)' }}>Client ID:</strong> {selectedEntity.id}</p>
                <p><strong style={{ color: 'var(--text-primary)' }}>Domain:</strong> {selectedEntity.domain}</p>
                <p><strong style={{ color: 'var(--text-primary)' }}>Integration Type:</strong> {selectedEntity.type}</p>
                <p><strong style={{ color: 'var(--text-primary)' }}>Status:</strong> {selectedEntity.status}</p>
                {selectedEntity.cryptoData && (
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Cryptographic Data:</strong>
                    <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontSize: '0.85rem', marginTop: '0.5rem', color: '#10B981', border: '1px solid var(--border)' }}>
                      {selectedEntity.cryptoData}
                    </pre>
                  </div>
                )}
              </div>
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {revokeError && <span style={{ color: '#f87171', fontSize: '0.85rem' }}>{revokeError}</span>}
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  {selectedEntity.status !== 'Revoked' && (
                    <button 
                      className="btn-secondary" 
                      style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                      onClick={() => handleRevoke(selectedEntity.id, activeTab)}
                      disabled={isRevoking}
                    >
                      {isRevoking ? 'Revoking...' : `Revoke ${activeTab === 'verifiers' ? 'Verifier' : 'Wallet'}`}
                    </button>
                  )}
                  <button className="btn-primary" onClick={() => { setSelectedEntity(null); setRevokeError(''); }}>Close Details</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
