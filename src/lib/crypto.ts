import 'reflect-metadata';
import * as x509 from '@peculiar/x509';
import { SignJWT, exportJWK } from 'jose';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import forge from 'node-forge';

x509.cryptoProvider.set(crypto.webcrypto as unknown as Crypto);

let cachedPem: string | null = null;
let privateKeyObj: any = null;
let publicJwk: any = null;

export async function getCAKeyPem(): Promise<string> {
  const caKeyPath = path.join(process.cwd(), 'data', 'ca_key.pem');
  try {
    return await fs.readFile(caKeyPath, 'utf8');
  } catch {
    let pem = process.env.UIDAI_PRIVATE_KEY;
    if (!pem) {
      const keys = forge.pki.rsa.generateKeyPair(2048);
      pem = forge.pki.privateKeyToPem(keys.privateKey);
    }
    await fs.mkdir(path.dirname(caKeyPath), { recursive: true });
    await fs.writeFile(caKeyPath, pem, 'utf8');
    return pem;
  }
}

export function clearKeyCache() {
  cachedPem = null;
  privateKeyObj = null;
  publicJwk = null;
}

export async function getKeys() {
  const pem = await getCAKeyPem();
  
  if (!privateKeyObj || cachedPem !== pem) {
    cachedPem = pem;
    
    // Create Node KeyObject directly, as jose's importPKCS8 fails on PKCS1 PEMs
    const nodePrivateKey = crypto.createPrivateKey(pem);
    privateKeyObj = nodePrivateKey;
    
    const nodePublicKey = crypto.createPublicKey(nodePrivateKey);
    publicJwk = await exportJWK(nodePublicKey);
    publicJwk.kid = 'uidai-trust-anchor-key-1';
    publicJwk.alg = 'RS256';
    publicJwk.use = 'sig';
  }
  
  return { privateKey: privateKeyObj, publicJwk, pem };
}

export async function signLoTE(payload: any) {
  const { privateKey, publicJwk } = await getKeys();
  
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ 
      alg: 'RS256', 
      typ: 'JWS',
      kid: publicJwk.kid
    })
    .setIssuedAt()
    .setIssuer('https://trust.aadhaar.gov.in')
    .sign(privateKey);
    
  return jwt;
}

export async function signEntityStatement(sub: string, payload: any) {
  const { privateKey, publicJwk } = await getKeys();
  
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ 
      alg: 'RS256', 
      typ: 'entity-statement+jwt',
      kid: publicJwk.kid
    })
    .setIssuedAt()
    .setExpirationTime('1h') // Entity statements are usually short-lived
    .setIssuer('https://trust.aadhaar.gov.in')
    .setSubject(sub)
    .sign(privateKey);
    
  return jwt;
}

export async function issueX509Certificate(params: {
  commonName: string;
  domainName?: string;
  publicKeyPem?: string | null;
  csrPem?: string | null;
}): Promise<{ certificatePem: string; resolvedPublicKeyPem: string }> {
  const { commonName, domainName, publicKeyPem, csrPem } = params;
  const { privateKey: caNodePrivateKey } = await getKeys();

  // Export CA private key to PKCS8 DER and import into WebCrypto for @peculiar/x509
  const caPkcs8Der = caNodePrivateKey.export({ format: 'der', type: 'pkcs8' });
  const caCryptoPrivateKey = await crypto.webcrypto.subtle.importKey(
    'pkcs8',
    caPkcs8Der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const safeCN = (commonName || 'Participant').replace(/[,=+<>#;\\"]/g, ' ').trim();
  const safeDomain = (domainName || '').replace(/[,=+<>#;\\"]/g, ' ').trim();
  let subjectName = safeDomain ? `CN=${safeCN}, O=${safeDomain}` : `CN=${safeCN}`;
  let subjectPublicKey: x509.PublicKey;
  let resolvedPublicKeyPem = publicKeyPem || '';

  if (csrPem && csrPem.trim()) {
    const csr = new x509.Pkcs10CertificateRequest(csrPem.trim());
    const isValidCsr = await csr.verify();
    if (!isValidCsr) {
      throw new Error('Invalid CSR signature: Certificate Signing Request verification failed.');
    }
    if (csr.subject) {
      subjectName = csr.subject;
    }
    subjectPublicKey = csr.publicKey;
    resolvedPublicKeyPem = csr.publicKey.toString('pem');
  } else if (publicKeyPem && publicKeyPem.trim()) {
    // Normalize PKCS#1 RSA public key if provided, otherwise parse SPKI PEM directly
    const normalizedSpkiPem = crypto
      .createPublicKey(publicKeyPem.trim())
      .export({ type: 'spki', format: 'pem' }) as string;
    subjectPublicKey = new x509.PublicKey(normalizedSpkiPem);
    resolvedPublicKeyPem = normalizedSpkiPem;
  } else {
    throw new Error('Either a CSR or a Public Key must be provided.');
  }

  const notBefore = new Date();
  const notAfter = new Date();
  notAfter.setFullYear(notBefore.getFullYear() + 1);

  const cert = await x509.X509CertificateGenerator.create({
    serialNumber: Date.now().toString(16),
    subject: subjectName,
    issuer: 'CN=UIDAI Trust Anchor',
    notBefore,
    notAfter,
    signingAlgorithm: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    publicKey: subjectPublicKey,
    signingKey: caCryptoPrivateKey,
    extensions: [
      new x509.BasicConstraintsExtension(false, undefined, true),
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.digitalSignature |
          x509.KeyUsageFlags.nonRepudiation |
          x509.KeyUsageFlags.keyEncipherment |
          x509.KeyUsageFlags.dataEncipherment,
        false
      ),
    ],
  });

  return {
    certificatePem: cert.toString('pem'),
    resolvedPublicKeyPem,
  };
}
