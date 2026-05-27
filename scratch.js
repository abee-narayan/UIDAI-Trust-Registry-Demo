const crypto = require('crypto');
const forge = require('node-forge');

async function test() {
  try {
    const { SignJWT, importPKCS8 } = await import('jose');
    const keys = forge.pki.rsa.generateKeyPair(1024);
    const pem = forge.pki.privateKeyToPem(keys.privateKey); // PKCS1
    const priv = crypto.createPrivateKey(pem);
    
    const jwt = await new SignJWT({ test: true })
      .setProtectedHeader({ alg: 'RS256' })
      .sign(priv); // Pass KeyObject directly
      
    console.log("JWT generated successfully:", !!jwt);
  } catch (e) {
    console.error("Failed:", e.message);
  }
}
test();
