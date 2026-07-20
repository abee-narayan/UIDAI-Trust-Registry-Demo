import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  try {
    const { entityId } = await params;
    const decodedId = decodeURIComponent(entityId);

    // Mock lookups for verifiers in the registry
    // e.g. sbi.co.in
    if (decodedId === 'sbi.co.in' || decodedId === 'https://sbi.co.in') {
      return NextResponse.json({
        entityId: "sbi.co.in",
        status: "active",
        entityType: "verifier",
        integrationMethod: "OpenID Federation",
        entityConfiguration: "https://sbi.co.in/.well-known/openid-federation"
      });
    }

    return NextResponse.json(
      { error: `Entity '${decodedId}' not found in registry` },
      { status: 404 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Internal Server Error', details: e.message },
      { status: 500 }
    );
  }
}
