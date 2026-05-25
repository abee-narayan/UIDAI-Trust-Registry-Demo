import { SignJWT, generateKeyPair, exportJWK, exportPKCS8, importPKCS8 } from 'jose';

// In a real production environment, these would be stored securely (e.g. HSM, Vault, or env variables).
// For the sake of this implementation, we will generate them in memory or use a static mock key.
let privateKeyObj: any = null;
let publicKeyObj: any = null;
let publicJwk: any = null;

export async function getKeys() {
  if (!privateKeyObj) {
    const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
    privateKeyObj = privateKey;
    publicKeyObj = publicKey;
    publicJwk = await exportJWK(publicKey);
    publicJwk.kid = 'uidai-trust-anchor-key-1';
    publicJwk.alg = 'RS256';
    publicJwk.use = 'sig';
  }
  return { privateKey: privateKeyObj, publicKey: publicKeyObj, publicJwk };
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
