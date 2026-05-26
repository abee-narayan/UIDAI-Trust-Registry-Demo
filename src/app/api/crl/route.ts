import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const verifiersPath = path.join(process.cwd(), 'data', 'verifiers.json');
    let verifiers: any[] = [];
    
    try {
      const verifiersData = await fs.readFile(verifiersPath, 'utf8');
      verifiers = JSON.parse(verifiersData);
    } catch {
      // File might not exist yet, return empty list
      return NextResponse.json({ revoked: [] });
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

    return NextResponse.json({
      lastUpdated: new Date().toISOString(),
      revoked: revokedVerifiers
    });
  } catch (error: any) {
    console.error('Error fetching CRL:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
