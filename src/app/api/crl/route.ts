import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { signLoTE, getKeys } from '@/lib/crypto';

export async function GET() {
  try {
    const { publicJwk } = await getKeys();
    const verifiersPath = path.join(process.cwd(), 'data', 'verifiers.json');
    let verifiers: any[] = [];
    
    try {
      const verifiersData = await fs.readFile(verifiersPath, 'utf8');
      verifiers = JSON.parse(verifiersData);
    } catch {
      // File might not exist yet, leave verifiers empty
    }

    // Filter for revoked verifiers
    const revokedVerifiers = verifiers
      .filter(v => v.status === 'Revoked')
      .map(v => ({
        id: v.id,
        name: v.name,
        domain: v.domain,
        revokedAt: v.revokedAt,
        certificatePem: v.certificatePem
      }));

    const crlPayload = {
      list_type: "https://trust.aadhaar.gov.in/Trst/Type/crl",
      lastUpdated: new Date().toISOString(),
      revoked: revokedVerifiers
    };

    const signedCrl = await signLoTE(crlPayload);

    return NextResponse.json({
      crl_jwt: signedCrl,
      trust_anchor_key: publicJwk
    });
  } catch (error: any) {
    console.error('Error fetching CRL:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
