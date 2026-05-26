# Key Rotation Implementation Tasks

- [x] Update `src/lib/crypto.ts` to load/save keys from `data/ca_key.pem` instead of using in-memory ephemeral keys.
- [x] Update `src/app/api/onboard/route.ts` to fetch the CA key via `src/lib/crypto.ts`.
- [x] Create `src/app/api/admin/rotate-key/route.ts`:
  - [x] Generate new CA keypair.
  - [x] Save new key to `data/ca_key.pem`.
  - [x] Load `verifiers.json`.
  - [x] Extract public keys from active certificates.
  - [x] Generate new certificates and update `verifiers.json`.
- [x] Update `src/app/page.tsx`:
  - [x] Add "Rotate Trust Anchor Key" button.
  - [x] Implement password prompt and API call logic.
- [x] Verification.
