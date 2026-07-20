import { NextResponse } from 'next/server';
import { verifyWalletAssertion, generateEntityStatement } from '@/lib/trust-crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entityId, client_assertion } = body;

    if (!entityId || !client_assertion) {
      return NextResponse.json(
        { error: 'Missing required parameters: entityId or client_assertion' },
        { status: 400 }
      );
    }

    // 1. Verify the Wallet's identity using the signed JWT
    let walletPayload;
    try {
      walletPayload = await verifyWalletAssertion(client_assertion);
    } catch (e: any) {
      return NextResponse.json(
        { error: 'Wallet Authorization Failed', details: e.message },
        { status: 401 }
      );
    }

    // 2. Lookup the requested Verifier (Entity)
    // In a real database, this would check if the verifier is active.
    let verifierDetails = {};
    if (entityId === 'sbi.co.in' || entityId === 'https://sbi.co.in') {
      verifierDetails = {
        entityId: "sbi.co.in",
        status: "active",
        entityType: "verifier",
        integrationMethod: "OpenID Federation",
        entityConfiguration: "https://sbi.co.in/.well-known/openid-federation"
      };
    } else {
      return NextResponse.json(
        { error: `Entity '${entityId}' not found or revoked in registry` },
        { status: 404 }
      );
    }

    // 3. Generate the Signed Entity Statement
    // This mathematically proves to the Wallet that the TR authorizes this Verifier.
    const entityStatement = await generateEntityStatement(entityId, verifierDetails);

    // 4. Return the response
    return NextResponse.json({
      status: 'authorized',
      wallet_authenticated_as: walletPayload.iss,
      entity_statement: entityStatement
    });

  } catch (e: any) {
    return NextResponse.json(
      { error: 'Internal Server Error', details: e.message },
      { status: 500 }
    );
  }
}
