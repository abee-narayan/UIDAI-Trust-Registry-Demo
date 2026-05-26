# Trust Anchor Key Rotation Implementation Plan

This plan outlines how we will add the capability to rotate the UIDAI Trust Anchor (Issuer) private key. When the key is rotated, the system will automatically extract the public keys from all active verifiers and issue them new X.509 certificates signed by the new CA key.

## User Review Required
> [!IMPORTANT]
> To persist the new CA key across server restarts, I will create a `data/ca_key.pem` file. The application will prioritize loading the key from this file. If it doesn't exist, it will fall back to `process.env.UIDAI_PRIVATE_KEY` and save it to the file. Is this approach acceptable for the demo?

## Proposed Changes

### Storage Layer
#### [NEW] `data/ca_key.pem`
- A new file will be used to store the active CA private key to ensure it survives server restarts and can be dynamically rotated by the application without needing to manually edit `.env.local`.

### Backend Components

#### [MODIFY] `src/lib/crypto.ts`
- Update the key loading mechanism to read the private key from `data/ca_key.pem`.
- Ensure JWT signing functions (like `signLoTE`) use this unified key instead of a randomly generated in-memory key, ensuring cryptographic consistency across both X.509 certificates and JWTs.

#### [MODIFY] `src/app/api/onboard/route.ts`
- Update the onboarding certificate generation logic to use the unified CA key from `data/ca_key.pem` instead of strictly depending on `.env.local`.

#### [NEW] `src/app/api/admin/rotate-key/route.ts`
- Create a new POST endpoint secured by `ADMIN_SECRET` (Bearer token).
- **Rotation Logic**:
  1. Generate a new RSA KeyPair using `node-forge`.
  2. Save the new private key to `data/ca_key.pem`.
  3. Load `data/verifiers.json`.
  4. Iterate through all active verifiers.
  5. Parse their existing `certificatePem` to extract their public key.
  6. Generate a new X.509 certificate for them, signed by the *new* CA private key.
  7. Save the updated `verifiers.json`.

### Frontend Components

#### [MODIFY] `src/app/page.tsx`
- Add a "Rotate Trust Anchor Key" admin button near the "Onboard New Verifier" section.
- Implement the `handleRotateKey` function to:
  1. Prompt for the Admin Password.
  2. Call `POST /api/admin/rotate-key`.
  3. Reload the dashboard to display the updated cryptographic state.

## Verification Plan
### Manual Verification
1. I will onboard a test verifier to generate an initial X.509 certificate.
2. I will trigger the "Rotate Trust Anchor Key" function using the admin password.
3. I will verify that `data/ca_key.pem` is updated.
4. I will check the test verifier's certificate in the dashboard to ensure its signature and properties have been updated by the new key.
