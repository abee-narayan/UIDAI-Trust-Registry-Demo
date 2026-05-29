import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { signLoTE, getKeys } from '@/lib/crypto';

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type') || 'verifier';
    const { publicJwk } = await getKeys();
    const dataPath = path.join(process.cwd(), 'data', type === 'wallet' ? 'wallets.json' : 'verifiers.json');
    let entities: any[] = [];
    
    try {
      const fileData = await fs.readFile(dataPath, 'utf8');
      entities = JSON.parse(fileData);
    } catch {
      // File might not exist yet, leave empty
    }

    // Filter for revoked verifiers
    const revokedVerifiers = entities
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
