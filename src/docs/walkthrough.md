# Trust Anchor Key Rotation

The Trust Registry now supports dynamic, programmatic rotation of the central Trust Anchor (Issuer) private key! 

## How It Works

### Persistent Key Storage
The cryptographic engine has been upgraded. It no longer relies on a static `.env.local` variable or ephemeral memory strings. It now reads from and dynamically updates `data/ca_key.pem`. 

### The Rotation Process
I've added a new **Rotate Trust Anchor Key** button on the main Dashboard UI right next to the Onboarding button. 

When an Admin clicks this button and enters the correct password (`trust-admin`):
1. **Key Generation**: A fresh 2048-bit RSA keypair is securely generated.
2. **Cache Busting**: The new key is saved to `data/ca_key.pem`, and the application's internal JWT signing engines are flushed to use the new key instantly.
3. **Smart Regeneration**: The system automatically sweeps through `data/verifiers.json`. For every active verifier, it parses their old X.509 certificate, safely extracts their original public key, and issues them a **brand-new X.509 certificate signed by the new CA key**. 
4. **State Refresh**: The new certificates are saved, and the Dashboard UI refreshes automatically.

### Verifying the Update
After a rotation, you can click on **Details** for any active verifier and view the raw `Cryptographic Data` to see that their `certificatePem` has been freshly re-issued!

## Documentation Directory
As requested, I've also copied the implementation artifacts (`implementation_plan.md`, `task.md`, and this `walkthrough.md`) directly into `src/docs/` in the project directory so they are preserved within the codebase.
