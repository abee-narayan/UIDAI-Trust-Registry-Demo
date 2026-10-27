import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import fs from 'fs/promises';
import path from 'path';
import { issueX509Certificate } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const walletName = formData.get('walletName') as string;
    const domainName = formData.get('domainName') as string;
    const publicKeyPem = (formData.get('publicKey') as string) || '';
    const csrPem = (formData.get('csr') as string) || '';
    const integrationMethod = formData.get('integrationMethod') as string;
    const logoFile = formData.get('logo') as File | null;
    const androidPackageName = formData.get('androidPackageName') as string;
    const callbackUrl = formData.get('callbackUrl') as string;
    const contactInfo = formData.get('contactInfo') as string;
    const encryptionKey = formData.get('encryptionKey') as string;

    if (!walletName || !domainName || (!publicKeyPem && !csrPem) || !integrationMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (integrationMethod === 'openid-federation' && !csrPem.trim()) {
      return NextResponse.json(
        { error: 'A Certificate Signing Request (CSR) is required for OpenID Federation onboarding.' },
        { status: 400 }
      );
    }

    // 1. Process Logo
    let logoUrl = null;
    if (logoFile && logoFile.size > 0) {
      const buffer = Buffer.from(await logoFile.arrayBuffer());
      const ext = path.extname(logoFile.name) || '.png';
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
      const logoPath = path.join(process.cwd(), 'public', 'logos', filename);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(logoPath), { recursive: true });
      await fs.writeFile(logoPath, buffer);
      logoUrl = `/logos/${filename}`;
    }

    // 2. Generate X.509 Certificate
    const { certificatePem: pemCert } = await issueX509Certificate({
      commonName: walletName,
      domainName,
      publicKeyPem,
      csrPem,
    });

    // 3. Save Wallet Data
    const walletsPath = path.join(process.cwd(), 'data', 'wallets.json');
    let wallets = [];
    try {
      const walletsData = await fs.readFile(walletsPath, 'utf8');
      wallets = JSON.parse(walletsData);
    } catch {
      // Ignore if file doesn't exist
    }

    const newWallet: Record<string, any> = {
      id: Date.now().toString(),
      name: walletName,
      domain: domainName,
      status: 'Active',
      integrationMethod,
      logoUrl,
      androidPackageName,
      callbackUrl,
      contactInfo,
      encryptionKey,
      certificatePem: pemCert,
      ...(csrPem.trim() ? { csrPem: csrPem.trim() } : {}),
      createdAt: new Date().toISOString()
    };

    wallets.push(newWallet);
    await fs.mkdir(path.dirname(walletsPath), { recursive: true });
    await fs.writeFile(walletsPath, JSON.stringify(wallets, null, 2));

    // 4. Create ZIP File
    const zip = new JSZip();
    zip.file('certificate.pem', pemCert);
    if (csrPem.trim()) {
      zip.file('request.csr', csrPem.trim());
    }
    
    // Send zip to client
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    
    return new NextResponse(zipBuffer as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="wallet_certificate.zip"'
      }
    });

  } catch (error: any) {
    console.error('Onboarding Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
