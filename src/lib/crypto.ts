import { SignJWT, exportJWK } from 'jose';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import forge from 'node-forge';

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
