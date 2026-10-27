'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateKeyPair, generateCSR, downloadFile } from '@/lib/clientCrypto';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function WalletOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [csrLoading, setCsrLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Data
  const [walletName, setWalletName] = useState('');
  const [domainName, setDomainName] = useState('');
  const [androidPackageName, setAndroidPackageName] = useState('');
  const [callbackUrl, setCallbackUrl] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [encryptionKey, setEncryptionKey] = useState('');
  
  // Keys & CSR
  const [algorithm, setAlgorithm] = useState('RS256');
  const [keys, setKeys] = useState<{privateKey: string | null; publicKey: string | null; isSymmetric: boolean; alg: string} | null>(null);
  const [keysGenerated, setKeysGenerated] = useState(false);
  const [csrPem, setCsrPem] = useState('');
  
  // Custom Key
  const [customPublicKey, setCustomPublicKey] = useState('');

  // Integration & Logo
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [integrationMethod, setIntegrationMethod] = useState('openid4vci');

  const handleGenerateKeys = async (overrideAlg?: string) => {
    const targetAlg = overrideAlg || algorithm;
    try {
      setLoading(true);
      setError('');
      if (overrideAlg) setAlgorithm(overrideAlg);
      const generatedKeys = await generateKeyPair(targetAlg);
      setKeys(generatedKeys);
      setKeysGenerated(true);
      setCsrPem('');
    } catch (err: any) {
      setError(err.message || 'Failed to generate keys');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCSR = async () => {
    if (!keys?.privateKey || !keys?.publicKey) {
      setError('Please generate an ECDSA key pair first before generating a CSR.');
      return;
    }
    try {
      setCsrLoading(true);
      setError('');
      const csr = await generateCSR({
        privateKeyPem: keys.privateKey,
        publicKeyPem: keys.publicKey,
        alg: keys.alg,
        commonName: walletName || 'Wallet',
        domainName: domainName || 'example.com',
        contactInfo,
      });
      setCsrPem(csr);
    } catch (err: any) {
      setError(err.message || 'Failed to generate CSR');
    } finally {
      setCsrLoading(false);
    }
  };

  const handleCsrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const text = await e.target.files[0].text();
      setCsrPem(text.trim());
    }
  };

  const handleIntegrationChange = (method: string) => {
    setIntegrationMethod(method);
    setError('');
    if (method === 'openid-federation' && !algorithm.startsWith('ES')) {
      setAlgorithm('ES256');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogo(file);
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
    }
  };

  const handleSubmit = async () => {
    const finalPublicKey = customPublicKey.trim() || keys?.publicKey || '';

    if (!walletName || !domainName || !integrationMethod || !logo) {
      setError('Please fill in all required fields (including domain, logo, and integration method).');
      return;
    }

    if (integrationMethod === 'openid-federation') {
      if (keys && !keys.alg.startsWith('ES') && !csrPem.trim()) {
        setError('OpenID Federation requires ECDSA keys and a Certificate Signing Request (CSR).');
        return;
      }
      if (!csrPem.trim()) {
        setError('Please generate or provide a CSR (.csr) file for OpenID Federation to get your signed X.509 certificate.');
        return;
      }
    } else if (!finalPublicKey) {
      setError('Please generate or provide a Public Key.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const formData = new FormData();
      formData.append('walletName', walletName);
      formData.append('domainName', domainName);
      formData.append('androidPackageName', androidPackageName);
      formData.append('callbackUrl', callbackUrl);
      formData.append('contactInfo', contactInfo);
      formData.append('encryptionKey', encryptionKey);
      if (finalPublicKey) {
        formData.append('publicKey', finalPublicKey);
      }
      if (csrPem.trim()) {
        formData.append('csr', csrPem.trim());
      }
      formData.append('integrationMethod', integrationMethod);
      formData.append('logo', logo);

      const response = await fetch('/api/wallets/onboard', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to onboard');
      }

      // Handle ZIP download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${walletName.replace(/\s+/g, '_')}_x509_certificate.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      // Navigate back to registry
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'An error occurred during onboarding.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && (!walletName || !domainName)) return setError('Please enter your wallet name and domain name');
    setError('');
    setStep(s => s + 1);
  };
  
  const prevStep = () => setStep(s => s - 1);

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        
        {/* Header */}
        <div className={styles.header}>
          <h2 className={`gradient-text ${styles.title}`}>
            Wallet Onboarding
          </h2>
          <p className={styles.subtitle}>
            Join the UIDAI Trust Registry in 3 simple steps
          </p>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressContainer}>
          <div className={styles.progressSteps}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={`${styles.stepItem} ${step === i ? styles.active : ''} ${step > i ? styles.completed : ''}`}>
                <div className={styles.stepCircle}>
                  {i}
                </div>
                <span className={styles.stepLabel}>
                  {i === 1 ? 'Details' : i === 2 ? 'Keys' : 'Integration'}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.progressBarTrack}>
            <motion.div 
              className={styles.progressBarFill}
              initial={{ width: '0%' }}
              animate={{ width: `${((step - 1) / 2) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {error && (
          <div className={styles.errorBox}>
            {error}
          </div>
        )}

        {/* Card Content */}
        <div className={styles.card}>
          <div className={styles.cardBody}>
            <AnimatePresence mode="wait">
              {/* STEP 1: Details */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className={styles.stepHeader}>
                    <span className={styles.stepIcon}>🏛️</span>
                    <span>Basic Details</span>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Wallet Name</label>
                    <input
                      type="text"
                      value={walletName}
                      onChange={(e) => setWalletName(e.target.value)}
                      placeholder="e.g. Acme Wallet"
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Domain Name</label>
                    <input
                      type="text"
                      value={domainName}
                      onChange={(e) => setDomainName(e.target.value)}
                      placeholder="e.g. acme.com"
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Android Package Name</label>
                    <input
                      type="text"
                      value={androidPackageName}
                      onChange={(e) => setAndroidPackageName(e.target.value)}
                      placeholder="e.g. com.example.wallet"
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Wallet Callback URL</label>
                    <input
                      type="text"
                      value={callbackUrl}
                      onChange={(e) => setCallbackUrl(e.target.value)}
                      placeholder="e.g. examplewallet://"
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Contact Information</label>
                    <input
                      type="text"
                      value={contactInfo}
                      onChange={(e) => setContactInfo(e.target.value)}
                      placeholder="Email or Phone Number"
                      className={styles.input}
                    />
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Key Generation */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className={styles.stepHeader}>
                    <span className={styles.stepIcon}>🔑</span>
                    <span>Cryptographic Keys</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    Generate an RSA or ECDSA key pair. The private key never leaves your browser.
                    We will submit the public key to UIDAI to issue your X.509 Certificate.
                  </p>
                  
                  <div className={styles.grid2}>
                    <select 
                      value={algorithm}
                      onChange={(e) => setAlgorithm(e.target.value)}
                      className={styles.select}
                    >
                      <option value="RS256">RSA (RS256)</option>
                      <option value="RS384">RSA (RS384)</option>
                      <option value="RS512">RSA (RS512)</option>
                      <option value="ES256">ECDSA (P-256)</option>
                      <option value="ES384">ECDSA (P-384)</option>
                      <option value="EdDSA">EdDSA</option>
                    </select>

                    <button
                      onClick={() => handleGenerateKeys()}
                      disabled={loading}
                      className="btn-primary"
                    >
                      {loading ? 'Generating...' : 'Generate Pair'}
                    </button>
                  </div>

                  {keysGenerated && keys && (
                    <div className={styles.successBox}>
                      <div className={styles.successTitle}>
                        <span>✔️</span> Keys generated successfully ({keys.alg})
                      </div>
                      
                      <div className={styles.grid2}>
                        <div>
                          <label className={styles.label}>Private Key (Store Safely)</label>
                          <textarea 
                            readOnly 
                            value={keys.privateKey || ''} 
                            className={styles.textarea}
                          />
                          <button
                            onClick={() => downloadFile(keys.privateKey || '', `${keys.alg}_private_key.pem`)}
                            className={styles.btnDownload}
                          >
                            ⬇ Download Private Key
                          </button>
                        </div>
                        
                        <div>
                          <label className={styles.label}>Public Key</label>
                          <textarea 
                            readOnly 
                            value={keys.publicKey || ''} 
                            className={styles.textarea}
                          />
                          <button
                            onClick={() => downloadFile(keys.publicKey || '', `${keys.alg}_public_key.pem`)}
                            className={styles.btnDownload}
                          >
                            ⬇ Download Public Key
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 3: Integration & Finish */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className={styles.stepHeader}>
                    <span className={styles.stepIcon}>⚙️</span>
                    <span>Logo & Integration</span>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Upload Logo</label>
                    <div className={styles.uploadArea}>
                      <div className={styles.uploadBox}>
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" />
                        ) : (
                          <span style={{ fontSize: '2rem' }}>⬆️</span>
                        )}
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className={styles.uploadInput}
                        />
                      </div>
                      <div className={styles.uploadText}>
                        <p>Upload your organization's logo.</p>
                        <p style={{ opacity: 0.7, marginTop: '0.25rem' }}>Recommended: 256x256px PNG or SVG</p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.formGroup} style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
                    <label className={styles.label}>Wallet Public Encryption Key</label>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                      Provide the public encryption key used by your wallet for verifiable credentials.
                    </p>
                    <textarea 
                      value={encryptionKey}
                      onChange={(e) => setEncryptionKey(e.target.value)}
                      placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
                      className={styles.textarea}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
                    <label className={styles.label}>Provide Own Public Key (Optional)</label>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                      If you prefer not to use the browser-generated keys from Step 2, you can paste your own Public Key (in PEM format) here.
                    </p>
                    <textarea 
                      value={customPublicKey}
                      onChange={(e) => setCustomPublicKey(e.target.value)}
                      placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
                      className={styles.textarea}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
                    <label className={styles.label}>Integration Method</label>
                    <div className={styles.radioGrid}>
                      {['openid4vci', 'openid-federation'].map((method) => (
                        <label 
                          key={method}
                          className={`${styles.radioCard} ${integrationMethod === method ? styles.active : ''}`}
                        >
                          <input 
                            type="radio" 
                            name="integration" 
                            value={method} 
                            checked={integrationMethod === method}
                            onChange={(e) => handleIntegrationChange(e.target.value)}
                            style={{ display: 'none' }}
                          />
                          <span className={styles.radioLabel}>
                            {method === 'openid4vci' ? 'OpenID4VCI' : 'OpenID Federation'}
                          </span>
                        </label>
                      ))}
                    </div>
                    {integrationMethod === 'openid-federation' && (
                      <div className={styles.successBox} style={{ marginTop: '1.25rem', borderColor: 'var(--primary)', background: 'rgba(255, 123, 0, 0.04)' }}>
                        <div className={styles.successTitle} style={{ color: 'var(--primary)' }}>
                          <span>🔐</span> OpenID Federation — ECDSA Keys & CSR Signing
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                          For OpenID Federation, please select and generate an <strong>ECDSA</strong> key pair, then generate a <strong>Certificate Signing Request (.csr)</strong>. The Trust Registry will verify and sign your CSR to issue your X.509 Certificate.
                        </p>

                        <div style={{ marginBottom: '1.25rem' }}>
                          <label className={styles.label}>1. Select & Generate ECDSA Private/Public Keys</label>
                          <div className={styles.grid2}>
                            <select
                              value={algorithm.startsWith('ES') ? algorithm : 'ES256'}
                              onChange={(e) => setAlgorithm(e.target.value)}
                              className={styles.select}
                            >
                              <option value="ES256">ECDSA (P-256 / ES256)</option>
                              <option value="ES384">ECDSA (P-384 / ES384)</option>
                              <option value="ES512">ECDSA (P-521 / ES512)</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleGenerateKeys(algorithm.startsWith('ES') ? algorithm : 'ES256')}
                              disabled={loading}
                              className="btn-primary"
                            >
                              {loading ? 'Generating ECDSA Keys...' : keys?.alg.startsWith('ES') ? 'Regenerate ECDSA Pair' : 'Generate ECDSA Pair'}
                            </button>
                          </div>

                          {keys && keys.alg.startsWith('ES') && (
                            <div className={styles.grid2} style={{ marginTop: '1rem' }}>
                              <div>
                                <label className={styles.label}>ECDSA Private Key ({keys.alg})</label>
                                <textarea
                                  readOnly
                                  value={keys.privateKey || ''}
                                  className={styles.textarea}
                                />
                                <button
                                  type="button"
                                  onClick={() => downloadFile(keys.privateKey || '', `${keys.alg}_private_key.pem`)}
                                  className={styles.btnDownload}
                                >
                                  ⬇ Download ECDSA Private Key
                                </button>
                              </div>
                              <div>
                                <label className={styles.label}>ECDSA Public Key ({keys.alg})</label>
                                <textarea
                                  readOnly
                                  value={keys.publicKey || ''}
                                  className={styles.textarea}
                                />
                                <button
                                  type="button"
                                  onClick={() => downloadFile(keys.publicKey || '', `${keys.alg}_public_key.pem`)}
                                  className={styles.btnDownload}
                                >
                                  ⬇ Download ECDSA Public Key
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '1rem', flexWrap: 'wrap' }}>
                            <label className={styles.label} style={{ marginBottom: 0 }}>
                              2. Generate Certificate Signing Request (.csr)
                            </label>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={handleGenerateCSR}
                                disabled={csrLoading || !keys || !keys.alg.startsWith('ES')}
                                className="btn-primary"
                                style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
                              >
                                {csrLoading ? 'Generating CSR...' : '⚡ Generate CSR File'}
                              </button>
                              <label className={styles.btnDownload} style={{ width: 'auto', padding: '0.5rem 1rem', margin: 0 }}>
                                📂 Upload .csr
                                <input
                                  type="file"
                                  accept=".csr,.pem,.txt"
                                  onChange={handleCsrFileUpload}
                                  style={{ display: 'none' }}
                                />
                              </label>
                            </div>
                          </div>

                          <textarea
                            value={csrPem}
                            onChange={(e) => setCsrPem(e.target.value)}
                            placeholder="Click 'Generate CSR File' above using your ECDSA keys, or paste/upload your PKCS#10 CSR (-----BEGIN CERTIFICATE REQUEST-----)..."
                            className={styles.textarea}
                            style={{ height: '130px' }}
                          />

                          {csrPem && (
                            <button
                              type="button"
                              onClick={() => downloadFile(csrPem, `${(walletName || 'wallet').replace(/\s+/g, '_')}.csr`)}
                              className={styles.btnDownload}
                            >
                              ⬇ Download CSR File (.csr)
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Actions */}
          <div className={styles.cardFooter}>
            <button
              onClick={prevStep}
              disabled={step === 1 || loading}
              className={styles.btnText}
            >
              ← Back
            </button>

            {step < 3 ? (
              <button
                onClick={nextStep}
                className="btn-primary"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary"
                style={{ padding: '0.75rem 2.5rem' }}
              >
                {loading
                  ? 'Signing & Submitting...'
                  : integrationMethod === 'openid-federation'
                  ? 'Sign CSR & Get X.509'
                  : 'Submit & Get X.509'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
