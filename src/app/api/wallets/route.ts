import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const walletsPath = path.join(process.cwd(), 'data', 'wallets.json');
    let wallets = [];
    try {
      const walletsData = await fs.readFile(walletsPath, 'utf8');
      wallets = JSON.parse(walletsData);
    } catch {
      // File might not exist yet, return empty array
    }

    return NextResponse.json(wallets);
  } catch (error: any) {
    console.error('Error fetching wallets:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
