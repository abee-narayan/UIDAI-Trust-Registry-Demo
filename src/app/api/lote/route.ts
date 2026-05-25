import { NextResponse } from 'next/server';
import { signLoTE, getKeys } from '@/lib/crypto';

export async function GET() {
  const { publicJwk } = await getKeys();

  // The ETSI TS 119 602 LoTE JSON format structure
  const lotePayload = {
    list_type: "https://trust.aadhaar.gov.in/Trst/Type/aadhaar",
    sequence_number: 1,
    issue_date: new Date().toISOString(),
    next_update: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    trust_service_providers: [
      {
        tsp_name: "Ministry of Health",
        tsp_information: {
          id: "VER-1001",
          domain: "health.gov.in"
        },
        services: [
          {
            service_name: "Aadhaar Intent Verifier (Proprietary)",
            service_type: "https://trust.aadhaar.gov.in/Trst/Svctype/IdV",
            status: "https://trust.aadhaar.gov.in/Trst/Svcstatus/granted",
            service_digital_identity: {
              // Simulating an onboarded public key in JWK format
              jwk: {
                kty: "RSA",
                e: "AQAB",
                n: "mock_modulus_for_health_ministry",
                alg: "RS256",
                use: "sig"
              },
              aadhaar_extensions: {
                ac: "1a2f", // OVSE Client ID
                sa: "00b1", // OVSE Registration Number
                cb: "https://health.gov.in/api/callback"
              }
            }
          }
        ]
      },
      {
        tsp_name: "DigiLocker",
        tsp_information: {
          id: "VER-1003",
          domain: "digilocker.gov.in"
        },
        services: [
          {
            service_name: "Aadhaar OpenID4VP Verifier (Centralized)",
            service_type: "https://trust.aadhaar.gov.in/Trst/Svctype/IdV",
            status: "https://trust.aadhaar.gov.in/Trst/Svcstatus/granted",
            service_digital_identity: {
              // Simulated X.509 certificate for centralized OpenID4VP
              x509_certificate: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
            }
          }
        ]
      }
    ]
  };

  // Sign the payload as a JWS
  const signedLoTE = await signLoTE(lotePayload);

  // Return the JWS as a JWT string or a JSON object with the JWS 
  // According to standard, LoTE can be served as a direct JWS token or JSON wrapper.
  const responseData = {
    trust_list_jwt: signedLoTE,
    // Provide the trust anchor public key for verifiers to bootstrap trust
    trust_anchor_key: publicJwk
  };

  return new NextResponse(JSON.stringify(responseData, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}
