import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const verifiersPath = path.join(process.cwd(), 'data', 'verifiers.json');
    let verifiers = [];
    try {
      const verifiersData = await fs.readFile(verifiersPath, 'utf8');
      verifiers = JSON.parse(verifiersData);
    } catch {
      // File might not exist yet, return empty array
    }

    return NextResponse.json(verifiers);
  } catch (error: any) {
    console.error('Error fetching verifiers:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
