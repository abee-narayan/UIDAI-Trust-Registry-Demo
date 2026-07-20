---
marp: true
theme: default
class: lead
paginate: true
backgroundColor: #ffffff
---

# Cross-Border Digital Identity Interoperability
**Singapore & India Joint Working Group (JWG)**

---

# Slide 1: User Journey
## Checking into a Hotel in Singapore

**Actors Involved:**
* **Indian Resident** (The User)
* **Singapore Hotel** (The Relying Party - RP)
* **Aadhaar App / Google Wallet** (The Wallet)
* **India Trust Registry** & **Singapore Trust Registry**

---

# User Flow

### 1. Country Selection
* **Hotel asks:** "Which country issued your digital identity?" 
* **Resident selects:** India

### 2. Verification Request Generation
* **Cross-device:** Generates a QR code.
* **Same-device:** Generates an App Link / Credential Manager invocation.
* *Request payload contains:* `country=India`, `relying_party_id=sg-hotel-001`, `requested_attributes`, `callback_url`

---

# Slide 2: Behind the Scenes
## Trust Establishment

This is where the Trust Registry works transparently in the background.

### Option A – OpenID Federation
1. **Entity Lookup:** Wallet calls India TR (`GET /api/entities/sg-hotel-001`)
2. **Configuration Retrieval:** Fetch `.well-known/openid-federation`
3. **Validation:** Validate JWS, Trust Chain. Establishes Hotel is Authorized.

---

# Slide 2: Behind the Scenes (Cont.)

### Option B – Offline Trust Registry
1. **Periodic Sync:** Wallet downloads List of Trusted Entities (LoTE) & Certs.
2. **Local Lookup:** Search cached LoTE for `sg-hotel-001`.
3. **Validation:** Validate Certificate locally without active network call.
4. **Consent:** Proceed directly to user consent screen.

---

# Slide 3: Credential Exchange

1. **Consent:** Wallet displays requests. Resident approves.
2. **Presentation Creation:** Wallet creates an OpenID4VP Presentation (SD-JWT VC or mDoc).
3. **Data Transfer:** Wallet returns `vp_token` to callback URL.
4. **Verification:** Hotel verifies Signature & Trust Registry Status. **Identity verification is completed.**

---

# Reverse Flow (Symmetric Model)

The architecture is **completely symmetric**. 
* Singapore Citizen in India selects `country = Singapore`.
* Singpass queries `trust.singpass.gov.sg` to retrieve trust information.
* Wallet verifies the Indian Hotel.
* Resident presents Singapore Credentials securely.

---

# Final Message for the JWG

Cross-border interoperability requires three layers:

1. **Trust Layer:** OpenID Federation, LoTE, X.509.
2. **Exchange Layer:** OpenID4VP, OpenID4VCI.
3. **Credential Layer:** SD-JWT VC, ISO/IEC 18013-5 mDoc.

*Starting with relatable user experiences simplifies technical discussions.*
