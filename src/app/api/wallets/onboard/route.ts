import { NextRequest, NextResponse } from 'next/server';
import forge from 'node-forge';
import JSZip from 'jszip';
import fs from 'fs/promises';
import path from 'path';
import { getKeys } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const walletName = formData.get('walletName') as string;
    const domainName = formData.get('domainName') as string;
    const publicKeyPem = formData.get('publicKey') as string;
    const integrationMethod = formData.get('integrationMethod') as string;
    const logoFile = formData.get('logo') as File | null;
    const androidPackageName = formData.get('androidPackageName') as string;
    const callbackUrl = formData.get('callbackUrl') as string;
    const contactInfo = formData.get('contactInfo') as string;
    const encryptionKey = formData.get('encryptionKey') as string;

    if (!walletName || !domainName || !publicKeyPem || !integrationMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
    const { pem: uidaiPrivateKeyPem } = await getKeys();

    const uidaiPrivateKey = forge.pki.privateKeyFromPem(uidaiPrivateKeyPem);
    const walletPublicKey = forge.pki.publicKeyFromPem(publicKeyPem);

    const cert = forge.pki.createCertificate();
    cert.publicKey = walletPublicKey;
    cert.serialNumber = Date.now().toString();
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

    const attrs = [{
      name: 'commonName',
      value: walletName
    }];
    cert.setSubject(attrs);
    
    // Issuer is UIDAI
    const issuerAttrs = [{
      name: 'commonName',
      value: 'UIDAI Trust Anchor'
    }];
    cert.setIssuer(issuerAttrs);

    // Extensions
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

    // Sign the certificate with UIDAI's private key
    cert.sign(uidaiPrivateKey, forge.md.sha256.create());
    const pemCert = forge.pki.certificateToPem(cert);

    // 3. Save Wallet Data
    const walletsPath = path.join(process.cwd(), 'data', 'wallets.json');
    let wallets = [];
    try {
      const walletsData = await fs.readFile(walletsPath, 'utf8');
      wallets = JSON.parse(walletsData);
    } catch {
      // Ignore if file doesn't exist
    }

    const newWallet = {
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
      createdAt: new Date().toISOString()
    };

    wallets.push(newWallet);
    await fs.mkdir(path.dirname(walletsPath), { recursive: true });
    await fs.writeFile(walletsPath, JSON.stringify(wallets, null, 2));

    // 4. Create ZIP File
    const zip = new JSZip();
    zip.file('certificate.pem', pemCert);
    
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
