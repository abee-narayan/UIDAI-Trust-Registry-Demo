'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateKeyPair, downloadFile } from '@/lib/clientCrypto';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Data
  const [verifierName, setVerifierName] = useState('');
  const [domainName, setDomainName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  
  // Keys
  const [algorithm, setAlgorithm] = useState('RS256');
  const [keys, setKeys] = useState<{privateKey: string | null; publicKey: string | null; isSymmetric: boolean; alg: string} | null>(null);
  const [keysGenerated, setKeysGenerated] = useState(false);
  
  // Custom Key
  const [customPublicKey, setCustomPublicKey] = useState('');

  // Integration & Logo
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [integrationMethod, setIntegrationMethod] = useState('');

  const handleGenerateKeys = async () => {
    try {
      setLoading(true);
      setError('');
      const generatedKeys = await generateKeyPair(algorithm);
      setKeys(generatedKeys);
      setKeysGenerated(true);
    } catch (err: any) {
      setError(err.message || 'Failed to generate keys');
    } finally {
      setLoading(false);
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
    const finalPublicKey = customPublicKey.trim() || keys?.publicKey;

    if (!verifierName || !domainName || !finalPublicKey || !integrationMethod || !logo) {
      setError('Please fill in all required fields (including domain and public key).');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const formData = new FormData();
      formData.append('verifierName', verifierName);
      formData.append('domainName', domainName);
      formData.append('contactInfo', contactInfo);
      formData.append('publicKey', finalPublicKey);
      formData.append('integrationMethod', integrationMethod);
      formData.append('logo', logo);

      const response = await fetch('/api/onboard', {
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
      a.download = `${verifierName.replace(/\s+/g, '_')}_x509_certificate.zip`;
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
    if (step === 1 && (!verifierName || !domainName)) return setError('Please enter your verifier name and domain name');
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
            Verifier Onboarding
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
                    <label className={styles.label}>Verifier Name</label>
                    <input
                      type="text"
                      value={verifierName}
                      onChange={(e) => setVerifierName(e.target.value)}
                      placeholder="e.g. Acme Corp"
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
                      onClick={handleGenerateKeys}
                      disabled={loading}
                      className="btn-primary"
                    >
                      {loading ? 'Generating...' : 'Generate Pair'}
                    </button>
                  </div>

                  {keysGenerated && keys && (
                    <div className={styles.successBox}>
                      <div className={styles.successTitle}>
                        <span>✔️</span> Keys generated successfully
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
                            onClick={() => downloadFile(keys.privateKey || '', `${algorithm}_private_key.pem`)}
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
                            onClick={() => downloadFile(keys.publicKey || '', `${algorithm}_public_key.pem`)}
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
                      {['proprietary', 'openid-centralized', 'federated'].map((method) => (
                        <label 
                          key={method}
                          className={`${styles.radioCard} ${integrationMethod === method ? styles.active : ''}`}
                        >
                          <input 
                            type="radio" 
                            name="integration" 
                            value={method} 
                            checked={integrationMethod === method}
                            onChange={(e) => setIntegrationMethod(e.target.value)}
                            style={{ display: 'none' }}
                          />
                          <span className={styles.radioLabel}>
                            {method.replace('-', ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                    {integrationMethod === 'openid-centralized' && (
                      <div className={styles.infoBox}>
                        <span>ℹ️</span>
                        <p>For OpenID Centralized flow, ensure you host a `/.well-known/openid-configuration` with your public key settings after onboarding.</p>
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
                {loading ? 'Submitting...' : 'Submit & Get X.509'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
