import 'reflect-metadata';
import * as x509 from '@peculiar/x509';

export async function generateKeyPair(algorithm: string) {
  let keyPair: CryptoKeyPair | undefined, secretKey: CryptoKey | undefined;
  let pubPem = null;
  let privPem = null;
  let isSymmetric = false;

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const formatPEM = (base64: string, type: string) => {
    const lines = base64.match(/.{1,64}/g)?.join('\n') || '';
    return `-----BEGIN ${type}-----\n${lines}\n-----END ${type}-----`;
  };

  if (algorithm.startsWith('HS')) {
    // HMAC
    isSymmetric = true;
    const hashMap: Record<string, string> = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };
    secretKey = await window.crypto.subtle.generateKey(
      { name: 'HMAC', hash: { name: hashMap[algorithm] } },
      true,
      ['sign', 'verify']
    );

    const rawBuffer = await window.crypto.subtle.exportKey('raw', secretKey);
    privPem = arrayBufferToBase64(rawBuffer);
  } else if (algorithm.startsWith('RS') || algorithm.startsWith('PS')) {
    // RSA variants
    const isPSS = algorithm.startsWith('PS');
    const hashMap: Record<string, string> = {
      RS256: 'SHA-256',
      RS384: 'SHA-384',
      RS512: 'SHA-512',
      PS256: 'SHA-256',
      PS384: 'SHA-384',
      PS512: 'SHA-512',
    };

    keyPair = await window.crypto.subtle.generateKey(
      {
        name: isPSS ? 'RSA-PSS' : 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]), // 65537
        hash: hashMap[algorithm],
      },
      true,
      ['sign', 'verify']
    );
  } else if (algorithm.startsWith('ES')) {
    // ECDSA
    const curveMap: Record<string, string> = { ES256: 'P-256', ES384: 'P-384', ES512: 'P-521' };
    keyPair = await window.crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: curveMap[algorithm] || 'P-256' },
      true,
      ['sign', 'verify']
    );
  } else if (algorithm === 'EdDSA') {
    // Ed25519
    try {
      keyPair = (await window.crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
        'sign',
        'verify',
      ])) as CryptoKeyPair;
    } catch {
      throw new Error('Your browser does not support Ed25519 keys via WebCrypto API yet.');
    }
  }

  // Export Async Pairs
  if (!isSymmetric && keyPair) {
    const privBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const pubBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);

    privPem = formatPEM(arrayBufferToBase64(privBuffer), 'PRIVATE KEY');
    pubPem = formatPEM(arrayBufferToBase64(pubBuffer), 'PUBLIC KEY');
  }

  return { privateKey: privPem, publicKey: pubPem, isSymmetric, alg: algorithm, cryptoKeyPair: keyPair };
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const binary = window.atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function generateCSR(params: {
  privateKeyPem: string;
  publicKeyPem: string;
  alg: string;
  commonName: string;
  domainName: string;
  contactInfo?: string;
}): Promise<string> {
  const { privateKeyPem, publicKeyPem, alg, commonName, domainName } = params;

  x509.cryptoProvider.set(window.crypto);

  const curveMap: Record<string, string> = { ES256: 'P-256', ES384: 'P-384', ES512: 'P-521' };
  const hashMap: Record<string, string> = {
    ES256: 'SHA-256',
    ES384: 'SHA-384',
    ES512: 'SHA-512',
    RS256: 'SHA-256',
    RS384: 'SHA-384',
    RS512: 'SHA-512',
  };

  const isEC = alg.startsWith('ES');
  const importAlg: EcKeyImportParams | RsaHashedImportParams = isEC
    ? { name: 'ECDSA', namedCurve: curveMap[alg] || 'P-256' }
    : { name: 'RSASSA-PKCS1-v1_5', hash: hashMap[alg] || 'SHA-256' };

  const signingAlgorithm: Algorithm | EcdsaParams = isEC
    ? { name: 'ECDSA', hash: hashMap[alg] || 'SHA-256' }
    : { name: 'RSASSA-PKCS1-v1_5', hash: hashMap[alg] || 'SHA-256' };

  const privateKey = await window.crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    importAlg,
    false,
    ['sign']
  );

  const publicKey = await window.crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(publicKeyPem),
    importAlg,
    true,
    ['verify']
  );

  const safeCN = (commonName || 'Verifier').replace(/[,=+<>#;\\"]/g, ' ').trim();
  const safeDomain = (domainName || 'example.com').replace(/[,=+<>#;\\"]/g, ' ').trim();

  const csr = await x509.Pkcs10CertificateRequestGenerator.create({
    name: `CN=${safeCN}, O=${safeDomain}`,
    keys: { privateKey, publicKey },
    signingAlgorithm,
    extensions: [
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.nonRepudiation,
        true
      ),
    ],
  });

  return csr.toString('pem');
}

export function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
