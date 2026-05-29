"use client";

import { useState } from 'react';

export default function Navbar() {
  const [modalType, setModalType] = useState<'onboard' | 'lote' | 'crl' | null>(null);

  const renderModalContent = () => {
    if (!modalType) return null;

    if (modalType === 'onboard') {
      return (
        <>
          <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>Select Onboarding Flow</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <a href="/onboarding-verifier" onClick={() => setModalType(null)} className="btn-secondary" style={{ padding: '1rem', fontSize: '1.1rem', textDecoration: 'none', display: 'block' }}>
              Onboard as a Verifier
            </a>
            <a href="/onboarding-wallet" onClick={() => setModalType(null)} className="btn-primary" style={{ padding: '1rem', fontSize: '1.1rem', textDecoration: 'none', display: 'block', background: 'linear-gradient(to right, #10B981, #059669)' }}>
              Onboard as a Wallet
            </a>
          </div>
        </>
      );
    }

    const title = modalType === 'lote' ? 'View Trust List API' : 'View Revocation List (CRL)';
    const apiPath = modalType === 'lote' ? '/api/lote' : '/api/crl';

    return (
      <>
        <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>{title}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <a href={`${apiPath}?type=verifier`} target="_blank" onClick={() => setModalType(null)} className="btn-secondary" style={{ padding: '1rem', fontSize: '1.1rem', textDecoration: 'none', display: 'block' }}>
            View for Verifiers
          </a>
          <a href={`${apiPath}?type=wallet`} target="_blank" onClick={() => setModalType(null)} className="btn-primary" style={{ padding: '1rem', fontSize: '1.1rem', textDecoration: 'none', display: 'block', background: 'linear-gradient(to right, #10B981, #059669)' }}>
            View for Wallets
          </a>
        </div>
      </>
    );
  };

  return (
    <>
      <nav className="navbar animate-fade-in">
        <div className="navbar-brand">
          <a href="/"><span className="gradient-text">Aadhaar Trust Registry</span></a>
        </div>
        <div className="navbar-links">
          <a href="/" className="active">Dashboard</a>
          <a href="/docs">Developer Docs</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setModalType('lote'); }}>UIDAI Trust List API</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setModalType('crl'); }}>Revocation List (CRL)</a>
          <a href="/.well-known/openid-federation" target="_blank" rel="noreferrer">OpenID Federation</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setModalType('onboard'); }}>Onboard</a>
        </div>
      </nav>

      {modalType && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModalType(null)}>
          <div className="glass-panel" style={{ padding: '2.5rem', minWidth: '400px', background: 'var(--surface)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            {renderModalContent()}
            <button className="btn-secondary" style={{ marginTop: '1.5rem', width: '100%', padding: '0.8rem', fontSize: '1rem' }} onClick={() => setModalType(null)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
