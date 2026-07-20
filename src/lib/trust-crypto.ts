import * as jose from 'jose';

// For the purpose of this POC, we generate keys in-memory on startup.
// In a production environment, these would be securely loaded from a KMS or environment variable.
let trustRegistryKeyPair: jose.GenerateKeyPairResult | null = null;
let dummyWalletKeyPair: jose.GenerateKeyPairResult | null = null;

async function getTrustRegistryKeys() {
  if (!trustRegistryKeyPair) {
    trustRegistryKeyPair = await jose.generateKeyPair('ES256', { extractable: true });
  }
  return trustRegistryKeyPair;
}

// Exported for testing so the script can act as the "Wallet"
export async function getDummyWalletKeys() {
  if (!dummyWalletKeyPair) {
    dummyWalletKeyPair = await jose.generateKeyPair('ES256', { extractable: true });
  }
  return dummyWalletKeyPair;
}

/**
 * Validates the Wallet's Signed JWT (client_assertion)
 */
export async function verifyWalletAssertion(clientAssertion: string) {
  // In a real scenario, the TR would lookup the wallet's public key from its database
  // using the 'iss' claim from the unverified token. For this POC, we use the dummy key.
  const walletKeys = await getDummyWalletKeys();
  
  try {
    const { payload } = await jose.jwtVerify(clientAssertion, walletKeys.publicKey);
    return payload;
  } catch (e) {
    throw new Error('Invalid client assertion signature or expired token');
  }
}

/**
 * Generates a Signed Entity Statement (JWT) authorizing a Verifier.
 */
export async function generateEntityStatement(verifierId: string, verifierDetails: any) {
  const trKeys = await getTrustRegistryKeys();
  
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600; // 1 hour validity

  const payload = {
    iss: 'https://trust.aadhaar.gov.in',
    sub: verifierId,
    iat,
    exp,
    metadata: {
      "openid_credential_verifier": {
        ...verifierDetails
      }
    }
  };

  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'ES256', typ: 'entity-statement+jwt' })
    .sign(trKeys.privateKey);
    
  return jwt;
}
