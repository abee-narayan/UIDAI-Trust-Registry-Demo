import { NextResponse } from 'next/server';
import { signEntityStatement } from '@/lib/crypto';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sub = searchParams.get('sub');

  if (!sub) {
    return NextResponse.json({ error: 'Missing sub parameter' }, { status: 400 });
  }

  // In a real application, we would lookup the subordinate (verifier) in our database.
  // Here we mock a response for a specific federated verifier.
  
  if (sub === 'https://sbi.co.in') {
    const subordinatePayload = {
      jwks: {
        // The public keys of the subordinate verifier
        keys: [{
          kty: "RSA",
          e: "AQAB",
          n: "mock_sbi_modulus...",
          alg: "RS256"
        }]
      },
      metadata_policy: {
        openid_relying_party: {
          client_name: {
            value: "State Bank of India"
          },
          logo_uri: {
            // Allows the verifier to dynamically set logo as long as it matches policy
          }
        }
      },
      trust_marks: [
        {
          id: "aadhaar_approved_verifier",
          trust_mark: "signed_trust_mark_jwt..."
        }
      ]
    };

    const jwt = await signEntityStatement(sub, subordinatePayload);

    return new NextResponse(jwt, {
      headers: {
        'Content-Type': 'application/entity-statement+jwt'
      }
    });
  }

  return NextResponse.json({ error: 'Subordinate not found' }, { status: 404 });
}
