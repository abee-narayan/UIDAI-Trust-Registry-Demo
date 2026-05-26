import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication Check
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (token !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Forbidden: Invalid Admin Secret' }, { status: 403 });
    }

    // 2. Parse payload
    const body = await req.json();
    const { verifierId } = body;

    if (!verifierId) {
      return NextResponse.json({ error: 'verifierId is required' }, { status: 400 });
    }

    // 3. Update Status
    const verifiersPath = path.join(process.cwd(), 'data', 'verifiers.json');
    let verifiers: any[] = [];
    
    try {
      const verifiersData = await fs.readFile(verifiersPath, 'utf8');
      verifiers = JSON.parse(verifiersData);
    } catch {
      return NextResponse.json({ error: 'No verifiers found' }, { status: 404 });
    }

    const verifierIndex = verifiers.findIndex(v => v.id === verifierId);
    
    if (verifierIndex === -1) {
      return NextResponse.json({ error: 'Verifier not found' }, { status: 404 });
    }

    if (verifiers[verifierIndex].status === 'Revoked') {
      return NextResponse.json({ error: 'Verifier is already revoked' }, { status: 400 });
    }

    // Mark as revoked and record timestamp
    verifiers[verifierIndex].status = 'Revoked';
    verifiers[verifierIndex].revokedAt = new Date().toISOString();

    await fs.writeFile(verifiersPath, JSON.stringify(verifiers, null, 2));

    return NextResponse.json({ success: true, message: 'Verifier successfully revoked' });
  } catch (error: any) {
    console.error('Revocation Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
