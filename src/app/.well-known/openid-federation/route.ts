import { NextResponse } from 'next/server';
import { getKeys, signEntityStatement } from '@/lib/crypto';

export async function GET() {
  const { publicJwk } = await getKeys();
  const issuer = 'https://trust.aadhaar.gov.in';

  // Entity configuration payload for the Trust Anchor
  const payload = {
    // The issuer must be the same as the sub for self-signed entity configs
    iss: issuer,
    sub: issuer,
    jwks: {
      keys: [publicJwk]
    },
    metadata: {
      federation_entity: {
        organization_name: "Aadhaar Trust Registry Anchor",
        homepage_uri: "https://trust.aadhaar.gov.in",
        policy_uri: "https://trust.aadhaar.gov.in/policy",
        contacts: ["admin@uidai.gov.in"]
      },
      trust_mark_issuer: {
        // Capabilities of this trust anchor
      }
    },
    authority_hints: [], // Trust anchor has no superiors
  };

  const jwt = await signEntityStatement(issuer, payload);

  return new NextResponse(jwt, {
    headers: {
      'Content-Type': 'application/entity-statement+jwt'
    }
  });
}
