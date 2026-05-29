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
    const { walletId } = body;

    if (!walletId) {
      return NextResponse.json({ error: 'walletId is required' }, { status: 400 });
    }

    // 3. Update Status
    const walletsPath = path.join(process.cwd(), 'data', 'wallets.json');
    let wallets: any[] = [];
    
    try {
      const walletsData = await fs.readFile(walletsPath, 'utf8');
      wallets = JSON.parse(walletsData);
    } catch {
      return NextResponse.json({ error: 'No wallets found' }, { status: 404 });
    }

    const walletIndex = wallets.findIndex(v => v.id === walletId);
    
    if (walletIndex === -1) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (wallets[walletIndex].status === 'Revoked') {
      return NextResponse.json({ error: 'Wallet is already revoked' }, { status: 400 });
    }

    // Mark as revoked and record timestamp
    wallets[walletIndex].status = 'Revoked';
    wallets[walletIndex].revokedAt = new Date().toISOString();

    await fs.writeFile(walletsPath, JSON.stringify(wallets, null, 2));

    return NextResponse.json({ success: true, message: 'Wallet successfully revoked' });
  } catch (error: any) {
    console.error('Revocation Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
