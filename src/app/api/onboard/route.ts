import { NextRequest, NextResponse } from 'next/server';
import forge from 'node-forge';
import JSZip from 'jszip';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const verifierName = formData.get('verifierName') as string;
    const publicKeyPem = formData.get('publicKey') as string;
    const integrationMethod = formData.get('integrationMethod') as string;
    const logoFile = formData.get('logo') as File | null;

    if (!verifierName || !publicKeyPem || !integrationMethod) {
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
    const uidaiPrivateKeyPem = process.env.UIDAI_PRIVATE_KEY;
    if (!uidaiPrivateKeyPem) {
      throw new Error('UIDAI_PRIVATE_KEY not configured on server');
    }

    const uidaiPrivateKey = forge.pki.privateKeyFromPem(uidaiPrivateKeyPem);
    const verifierPublicKey = forge.pki.publicKeyFromPem(publicKeyPem);

    const cert = forge.pki.createCertificate();
    cert.publicKey = verifierPublicKey;
    cert.serialNumber = Date.now().toString();
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

    const attrs = [{
      name: 'commonName',
      value: verifierName
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

    // 3. Save Verifier Data
    const verifiersPath = path.join(process.cwd(), 'data', 'verifiers.json');
    let verifiers = [];
    try {
      const verifiersData = await fs.readFile(verifiersPath, 'utf8');
      verifiers = JSON.parse(verifiersData);
    } catch {
      // Ignore if file doesn't exist
    }

    const newVerifier = {
      id: Date.now().toString(),
      name: verifierName,
      integrationMethod,
      logoUrl,
      certificatePem: pemCert,
      createdAt: new Date().toISOString()
    };

    verifiers.push(newVerifier);
    await fs.mkdir(path.dirname(verifiersPath), { recursive: true });
    await fs.writeFile(verifiersPath, JSON.stringify(verifiers, null, 2));

    // 4. Create ZIP File
    const zip = new JSZip();
    zip.file('certificate.pem', pemCert);
    
    // Send zip to client
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    
    return new NextResponse(zipBuffer as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="verifier_certificate.zip"'
      }
    });

  } catch (error: any) {
    console.error('Onboarding Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
