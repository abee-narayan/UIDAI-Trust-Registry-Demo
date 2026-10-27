import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import forge from 'node-forge';
import { clearKeyCache, issueX509Certificate } from '@/lib/crypto';

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

    for (let i = 0; i < verifiers.length; i++) {
      const v = verifiers[i];
      if (v.status === 'Active' || !v.status) { // assume active if missing
        try {
          const oldX509 = new crypto.X509Certificate(v.certificatePem);
          const publicKeyPem = oldX509.publicKey.export({ type: 'spki', format: 'pem' }) as string;

          const { certificatePem: newPemCert } = await issueX509Certificate({
            commonName: v.name,
            domainName: v.domain,
            publicKeyPem,
            csrPem: v.csrPem || null,
          });

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
