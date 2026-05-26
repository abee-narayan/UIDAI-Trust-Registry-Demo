import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import forge from 'node-forge';
import { clearKeyCache } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.ADMIN_SECRET || 'trust-admin';
    
    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Generate new CA KeyPair
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const newCaPem = forge.pki.privateKeyToPem(keys.privateKey);

    // 2. Save new CA Key
    const caKeyPath = path.join(process.cwd(), 'data', 'ca_key.pem');
    await fs.mkdir(path.dirname(caKeyPath), { recursive: true });
    await fs.writeFile(caKeyPath, newCaPem, 'utf8');

    // 3. Clear crypto cache so the next `getKeys()` uses the new key
    clearKeyCache();

    // 4. Load Verifiers and Regenerate Certs for Active ones
    const verifiersPath = path.join(process.cwd(), 'data', 'verifiers.json');
    let verifiers: any[] = [];
    try {
      const verifiersData = await fs.readFile(verifiersPath, 'utf8');
      verifiers = JSON.parse(verifiersData);
    } catch {
      // Ignore if file doesn't exist
    }

    const uidaiPrivateKey = forge.pki.privateKeyFromPem(newCaPem);

    for (let i = 0; i < verifiers.length; i++) {
      const v = verifiers[i];
      if (v.status === 'Active' || !v.status) { // assume active if missing
        try {
          // Extract their public key from the old certificate
          const oldCert = forge.pki.certificateFromPem(v.certificatePem);
          const verifierPublicKey = oldCert.publicKey;

          // Generate new certificate
          const cert = forge.pki.createCertificate();
          cert.publicKey = verifierPublicKey;
          cert.serialNumber = Date.now().toString() + i.toString(); // unique SN
          cert.validity.notBefore = new Date();
          cert.validity.notAfter = new Date();
          cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

          const attrs = [{
            name: 'commonName',
            value: v.name
          }];
          cert.setSubject(attrs);
          
          const issuerAttrs = [{
            name: 'commonName',
            value: 'UIDAI Trust Anchor'
          }];
          cert.setIssuer(issuerAttrs);

          cert.setExtensions([{
            name: 'basicConstraints',
            cA: false
          }, {
            name: 'keyUsage',
            keyCertSign: false,
            digitalSignature: true,
            nonRepudiation: true,
            keyEncipherment: true,
            dataEncipherment: true
          }]);

          cert.sign(uidaiPrivateKey, forge.md.sha256.create());
          const newPemCert = forge.pki.certificateToPem(cert);

          // Update the verifier record
          verifiers[i].certificatePem = newPemCert;
        } catch (e) {
          console.error(`Failed to regenerate cert for verifier ${v.id}`, e);
        }
      }
    }

    // 5. Save updated verifiers
    await fs.writeFile(verifiersPath, JSON.stringify(verifiers, null, 2));

    return NextResponse.json({ success: true, message: 'CA Key Rotated and Certificates Regenerated' });
  } catch (error: any) {
    console.error('Rotate Key Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
