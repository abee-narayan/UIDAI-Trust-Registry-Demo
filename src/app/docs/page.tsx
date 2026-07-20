"use client";

import { motion } from "framer-motion";

export default function Docs() {
  return (
    <div className="animate-fade-in" style={{ paddingBottom: "4rem" }}>
      <header style={{ margin: "3rem 0" }}>
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: "2.5rem", marginBottom: "1rem" }}
        >
          Integration <span className="gradient-text">Documentation</span>
        </motion.h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", maxWidth: "800px" }}>
          Learn how to integrate your verifier application with the Aadhaar Trust Registry using our Sovereign Trust Frameworks.
        </p>
      </header>

      <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem", color: "var(--primary)" }}>1. Proprietary Specs (JWK)</h2>
        <p style={{ marginBottom: "1rem" }}>
          For existing verifiers using the legacy Aadhaar App Intent Integration v2. 
          Your public keys are statically hosted in our sovereign LoTE (List of Trusted Entities).
        </p>
        <h4 style={{ marginBottom: "0.5rem" }}>Authentication Flow:</h4>
        <ul style={{ listStylePosition: "inside", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          <li>Verifier generates a request JWT and signs it using their RSA Private Key.</li>
          <li>Aadhaar App receives the Intent, extracts the <code>ac</code> (Client ID), and checks the LoTE at <code>/api/lote</code>.</li>
          <li>Aadhaar App extracts the corresponding <strong>JWK</strong> and verifies the signature.</li>
          <li>Upon success, the App posts the encrypted response back to the strictly registered <code>cb</code> (Callback URL).</li>
        </ul>
      </div>

      <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem", color: "var(--primary)" }}>2. OpenID4VP (Offline)</h2>
        <p style={{ marginBottom: "1rem" }}>
          For verifiers upgrading to OpenID for Verifiable Presentations (v1) but lacking the infrastructure to host their own dynamic Federation endpoints.
        </p>
        <h4 style={{ marginBottom: "0.5rem" }}>Authentication Flow:</h4>
        <ul style={{ listStylePosition: "inside", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          <li>Verifier provides their X.509 Certificate to UIDAI during onboarding.</li>
          <li>The Certificate is embedded into the Centralized LoTE under the <code>x509_certificate</code> field.</li>
          <li>During a presentation request, the Aadhaar Wallet validates the request's <code>x5c</code> header against the certificate hosted in our Trust Registry.</li>
        </ul>
      </div>

      <div className="glass-panel" style={{ padding: "2rem" }}>
        <h2 style={{ marginBottom: "1rem", color: "var(--primary)" }}>3. OpenID Federation (Hybrid Authorization)</h2>
        <p style={{ marginBottom: "1rem" }}>
          The dynamic trust establishment flow combining Wallet Authentication and Entity Statements. Verifiers host their OpenID endpoints, and UIDAI acts as the Trust Anchor granting access.
        </p>
        <h4 style={{ marginBottom: "0.5rem" }}>Authentication Flow:</h4>
        <ul style={{ listStylePosition: "inside", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          <li>Verifier initiates the request by sending its <code>client_id</code> to the Wallet.</li>
          <li>Wallet authenticates itself to the Trust Registry using a signed <code>client_assertion</code> JWT.</li>
          <li>Trust Registry verifies the Wallet, authorizes the Verifier, and issues a <strong>Signed Entity Statement</strong>.</li>
          <li>Wallet dynamically resolves the verifier's endpoint from the statement and posts the presentation.</li>
        </ul>
        <div style={{ background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "8px", marginTop: "1rem" }}>
          <code style={{ display: 'block', marginBottom: '0.5rem' }}>POST /api/federation/verify</code>
          <code style={{ color: '#aaa', fontSize: '0.85rem' }}>&#123; "entityId": "sbi.co.in", "client_assertion": "eyJ..." &#125;</code>
        </div>
      </div>
    </div>
  );
}
