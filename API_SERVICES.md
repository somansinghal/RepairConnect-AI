# RepairConnect AI — API & Service Configuration

**Document:** API_SERVICES.md
**Status:** Approved baseline (pre-integration)
**Last updated:** 2026-08-22

Single source of truth for every external API, SDK, cloud service, credential, and browser capability used by RepairConnect AI — and its **actual implementation status**.

> **Rule: placeholders only.** No real API key, secret, or credential appears in this repository — not in docs, not in frontend code, not in screenshots/recordings. Real values are supplied at deployment time through environment files that are never committed. Configuration is centralized in `.env` (gitignored) / `.env.example` (committed) — see [`API_CONFIGURATION.md`](API_CONFIGURATION.md) for the exact variable → file → function mapping.

---

## 1. Service inventory (summary)

| Service | Purpose | Role | Runs where | Status |
|---|---|---|---|---|
| **Firebase Authentication** | Signup / login / logout / password reset / (optional) Google | Core backend | Firebase | 🧩 Implemented (code) — deploy + config required |
| **Cloud Firestore** | Database + media references/metadata | Core backend / database | Firebase | 🧩 Implemented (code) — deploy required |
| **Firebase Cloud Functions** | Secure AI backend (`analyzeRepair`, `assistant`): validation, failover, normalization, rate limiting | Core backend | Server (Node) | 🧩 Implemented (code) — deploy required |
| **Firebase Hosting** | Static hosting + HTTPS + CDN | Core backend | CDN | 🟡 Planned (Vercel is the current host target) |
| **Memcode** | Damaged-item images, supported videos, repair media | **PRIMARY STORAGE** | Secure backend | 🧩 Adapter interface implemented — pending official doc verification |
| **Firebase Storage** | Backup / disaster-recovery copy of media | **BACKUP STORAGE** | Firebase | 🧩 Implemented (code) — `storage.rules` + Admin SDK path; deploy required |
| **OpenAI API** | Damage analysis, diagnosis, severity, troubleshooting, repair-vs-replace reasoning, assistant | **PRIMARY AI** | Cloud Function | 🧩 Implemented (code) — key required, not verified live |
| **Groq API** | Same AI capabilities as OpenAI, used on failover | **BACKUP AI** | Cloud Function | 🧩 Implemented (code) — key required, not verified live |
| **Leaflet** | Interactive repairer map (markers, popups) | Frontend map layer | Browser | 🟡 Planned (placeholder UI in place) |
| **OpenStreetMap** | Base map tiles | Map layer | Browser (tile CDN) | 🟡 Planned (placeholder UI in place) |
| **Browser Geolocation** | Approximate user location, distance calc | Location service | Browser | 🟡 Planned |
| **HTML / CSS / Vanilla JS** | Frontend UI | — | Browser | ✅ **Implemented** |

> ⚪ **Real repair-provider API — Not selected.** Current provider data is clearly-labelled demo data.

---

## 2. Storage architecture (authoritative)

| Layer | Provider | Role |
|---|---|---|
| **Primary storage** | **Memcode** | Normal destination for new uploads (damage images, supported videos, repair media). |
| **Backup storage** | **Firebase Storage** | Secondary backup / disaster-recovery layer. **Not** the default upload destination. |
| **Database** | **Cloud Firestore** | Stores media **metadata + references** (`mediaReferences`), not large binaries. |
| **Secure backend** | **Firebase Cloud Functions** | Secure Memcode operations + secure Firebase Storage backup operations. |

### 2.1 Primary media flow

```
User → RepairConnect Frontend → Cloud Function / Secure Backend → Memcode → Stored media
                                                                       ↓
                                                             Media reference → Firestore
```

### 2.2 Backup media flow

```
Memcode → Backup process → Firebase Storage → Backup media → Firestore backup reference
```

> **Do not claim automatic backup exists** — the exact backup strategy (critical-media backup / automatic backup / failure recovery) is **selected during implementation**. Firebase Storage is a fallback/recovery layer only if the final implementation supports it.

### 2.3 Firestore media references (conceptual)

```
mediaReferences
├── mediaId
├── userId
├── type
├── primaryProvider    = "memcode"
├── primaryReference
├── backupProvider     = "firebase-storage"
├── backupReference
├── backupStatus
├── createdAt
└── updatedAt
```

> Conceptual only — **no Firestore collections are created during documentation.**

---

## 3. AI architecture (authoritative)

| Layer | Provider | Role |
|---|---|---|
| **Primary AI** | **OpenAI API** | Default provider for all AI features. |
| **Backup AI** | **Groq API** | Fallback provider, used only when defined failover conditions are met. |
| **Secure backend** | **Firebase Cloud Functions** | Holds both keys server-side; normalizes responses. |

### 3.1 Primary OpenAI flow

```
User → Frontend → Cloud Function → OpenAI API → structured response → Frontend
```

### 3.2 Backup Groq flow (failover)

```
Frontend → Cloud Function → OpenAI API
                              ↓ (if a defined fallback condition occurs)
                            Groq API
                              ↓
                    normalized structured response → Frontend
```

**Fallback conditions (finalized during implementation):** OpenAI unavailable · request failure · configured timeout · temporary provider error · configured quota/rate-limit failure. **Do not retry endlessly.**

### 3.3 AI response standard (both providers)

The backend normalizes **both** providers' output to one consistent shape before sending it to the frontend. The frontend **never depends on provider-specific formats**. (Conceptual fields: `observations`, `possibleCauses`, `confidence`, `severity`, `troubleshooting`, `repairRecommendation`, `repairEstimate`, `replacementEstimate`, `safetyWarnings` — finalized in AI_SPEC.md.)

---

## 4. OpenAI API — 🧩 Implemented in code (PRIMARY AI)

| Attribute | Detail |
|---|---|
| **Purpose** | Damage analysis, possible diagnosis, severity, troubleshooting, repair explanation, repair-vs-replace reasoning, assistant, repair recommendations. |
| **Authentication** | Bearer key sent **only** from the Cloud Function. |
| **Env var** | `OPENAI_API_KEY` (server secret). Optional model var verified at build time. |
| **Security** | Key never in HTML/CSS/frontend JS/Git/README/screenshots/recordings/public env vars. |
| **Model** | Read from `OPENAI_VISION_MODEL` (not hardcoded) — verify the currently-supported vision model before deploy. |
| **Free status** | Verify current pricing/model availability/API limits — **not assumed free**. |
| **Status** | 🧩 Implemented in code (`functions/lib/ai.js` + `functions/index.js` → `analyzeRepair`/`assistant`). **Not verified live** — requires `OPENAI_API_KEY`. |

---

## 5. Groq API — 🧩 Implemented in code (BACKUP AI)

| Attribute | Detail |
|---|---|
| **Purpose** | Same AI capabilities as OpenAI, used **only on failover** under defined conditions. |
| **Env var** | `GROQ_API_KEY` (server secret). |
| **Security** | Server-side only — same rules as OpenAI. |
| **Model** | Read from `GROQ_VISION_MODEL` (not hardcoded) — verify the currently-supported vision model before deploy. |
| **Free status** | Verify current pricing/limits — **not assumed free**. |
| **Status** | 🧩 Implemented in code (failover path in `functions/lib/ai.js`). **Not verified live** — requires `GROQ_API_KEY`. |

---

## 6. Memcode — 🧩 Adapter interface (PRIMARY STORAGE)

- **Stores:** damaged-item images, supported videos, repair-related media, other required media.
- **Verify official docs before integration** for: API endpoint, authentication, credential names, storage/upload limits, file types, URL/reference behavior, deletion, pricing, free tier, bandwidth/egress. **Do not invent endpoints or variable names.**
- Credentials stay **server-side** where required.

---

## 7. Firebase Storage — 🧩 Implemented in code (BACKUP STORAGE)

- **Role:** backup / disaster-recovery only — **not** primary upload storage.
- **Implemented controls (`storage.rules`):** authentication required, `backup/{userId}/{mediaId}/{file}` owner-scoped path, ≤25 MB size cap, image MIME allow-list, default-deny. **Backup only** — normal uploads go to Memcode, never directly to this bucket.
- **Not currently connected** — no bucket exists, no bucket name is invented.

---

## 8. Firebase (core backend) — 🟡 Planned

| Service | Purpose | Auth |
|---|---|---|
| **Authentication** | registration, login, logout, password reset, optional Google | Firebase ID tokens |
| **Cloud Firestore** | users, devices, diagnoses, requests, repairers, history, media references | Auth + Firestore Rules |
| **Cloud Functions** | secure OpenAI + Groq + Memcode + Firebase Storage backup ops, validation, failover, business logic | Admin SDK |
| **Hosting** | static hosting + CDN | — |

### 8.1 Firebase web config (NOT a secret)

```
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
```

Data protection relies on **Authentication + Firestore Security Rules + (Storage Security Rules for backup media) + server-side validation + least-privilege access** — never on hiding the config.

---

## 9. Leaflet + OpenStreetMap

| Attribute | Leaflet | OpenStreetMap |
|---|---|---|
| **Purpose** | Interactive map: markers, user pin, popups | Base map tiles |
| **Key** | ❌ none | ❌ none (usage policy) |
| **Free** | ✅ open source (BSD-2) | ✅ free; attribution required ("© OpenStreetMap contributors") |
| **Status** | 🟡 Planned (placeholder UI + demo pins in `repairers.html`) | 🟡 Planned |

> OSM provides **tiles**, not repair-shop data. Provider data is a separate concern.

---

## 10. Browser Geolocation — 🟡 Planned

- **Purpose:** approximate user location, center map, Haversine distance.
- **No external key.** Request on user action; handle denied/unavailable/timeout with fallback; avoid persisting precise coordinates.

---

## 11. Environment variables (reference — placeholders only)

```
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_PLACEHOLDER          # PRIMARY AI (server)
GROQ_API_KEY=YOUR_GROQ_API_KEY_PLACEHOLDER              # BACKUP AI (server)
# Memcode: use EXACT official names after verifying docs (server)
FIREBASE_API_KEY=... / FIREBASE_AUTH_DOMAIN=... / FIREBASE_PROJECT_ID=...
FIREBASE_MESSAGING_SENDER_ID=... / FIREBASE_APP_ID=...   # public-ish
# Firebase Storage backup: add only config required after Firebase setup
```

Reproduced in `.env.example` (safe to commit). `.env` holds real values and is never committed.

---

## 12. API cost policy (free-first)

- **OpenAI / Groq:** verify current pricing, model availability, and API limits — **neither is claimed free**.
- **Memcode:** verify pricing/free-tier/limits/egress — **not assumed free**.
- **Firebase:** Spark (free) plan — verify current Auth/Firestore/Storage/Functions/Hosting limits; no unlimited usage claimed.
- **Leaflet:** open source. **OSM:** usage/attribution policy. **Geolocation:** free.
- Avoid paid APIs; no unlimited-storage claims.

---

## 13. Service status (authoritative)

Status vocabulary: **✅ Implemented** (verified locally) · **🧩 Implemented (code) — deploy/credentials required** · **🎭 Demo/Mock fallback** · **⚪ Not selected**.

| Service | Status |
|---|---|
| HTML / CSS / Vanilla JS | ✅ Implemented |
| Firebase Auth (login/signup/reset/judge demo) | 🧩 Implemented (code) — deploy + config required; 🎭 demo fallback active |
| Firestore (users/devices/diagnoses/requests/media refs) | 🧩 Implemented (code) — deploy required; 🎭 demo fallback active |
| Firestore Security Rules | 🧩 Implemented — `firestore.rules` (owner-scoped, default-deny, append-only history; deploy required) |
| Firebase Cloud Functions (`analyzeRepair`, `assistant`) | 🧩 Implemented (code) — deploy + `OPENAI_API_KEY`/`GROQ_API_KEY` required |
| Firebase Storage (backup only) | 🧩 Implemented (code) — `storage.rules` + Admin SDK; deploy required |
| Firebase Hosting / Vercel | ✅ Vercel-ready (`vercel.json`); Firebase Hosting 🟡 optional |
| Memcode (primary storage) | 🧩 Adapter interface implemented — **official doc verification pending** |
| OpenAI (primary AI) | 🧩 Implemented (code) — `OPENAI_API_KEY` required; **not verified live** |
| Groq (backup AI) | 🧩 Implemented (code) — `GROQ_API_KEY` required; **not verified live** |
| Leaflet + OpenStreetMap | ✅ Implemented (live map + attribution; verified in headless) |
| Browser Geolocation | ✅ Implemented (permission-gated with fallback) |
| Real repair-provider API | ⚪ Not selected — clearly-labelled demo providers remain |

**Phase note (secure AI backend):**

- **Cloud Functions `analyzeRepair` + `assistant`** — `functions/index.js`: authenticated callables, payload validation (`lib/guard.js`: 5 MB image cap, text caps, SVG/HTML rejected), per-user daily rate limit (`ANALYZE_DAILY_LIMIT`, default 20, enforced in a Firestore transaction), OpenAI primary → Groq failover (`lib/ai.js`, bounded — 429/5xx/timeout trigger fallback, 4xx does not), response normalization (`lib/normalize.js`), deterministic repair-vs-replace (`lib/estimate.js`), and Firestore persistence of the diagnosis.
- **Frontend seam** — `js/data-service.js` `analyze()` → `httpsCallable("analyzeRepair")`; `js/analyze.js` sends `{ imageBase64, textDescription, category }` and redirects to `diagnosis.html?id=…`; `js/diagnosis.js` reads the diagnosis from Firestore.
- **Testing performed** — unit tests (`npm run test:unit`: normalize, estimate, failover conditions, JSON parsing, request guard) **passed**; a stubbed-fetch smoke test verified OpenAI success → no fallback, 500/429 → Groq fallback, 401 → error propagated.

**Phase note (storage):**

- **Storage layer** — `functions/lib/storage.js`: a provider-agnostic orchestrator (`createStorage`) with **Memcode as PRIMARY** and **Firebase Storage as BACKUP**; roles are never reversed. The Memcode adapter is an **interface only** (throws `ConfigurationError`) until the official Memcode docs are verified — **no endpoints or credential names were invented**. The Firebase Storage backup adapter (Admin SDK) is implemented for real.
- **`analyzeRepair`** now stores the image first (server-side validation only — the browser MIME type is never trusted), writes a `mediaReferences` record, then runs AI analysis; the diagnosis stores `mediaId`, not the binary.
- **`deleteMedia` callable** — ownership-checked, partial-failure-safe deletion (primary → backup → Firestore reference; nothing silently orphaned; `backupStatus: 'delete_failed'` marks retryable partials).
- **`storage.rules`** — backup-only bucket (`backup/{userId}/{mediaId}/{file}`), owner-scoped, ≤25 MB, image MIME allow-list, default-deny.
- **Testing** — 5 storage-orchestration unit tests pass (primary+backup success; primary failure throws with no reference; backup failure preserves primary + `failed`; backup disabled → `not_applicable`; partial-deletion reporting).

**Honest note:** Memcode has **no verifiable public storage API** (checked at implementation time), so its integration remains a clearly-labelled adapter interface — **not a fake success**. Firebase Storage backup works in code but has **not been executed live** (no Firebase project credentials in this workspace).

**Honest note (AI):** OpenAI/Groq have **not been called live** — no API keys exist in this workspace. The implementation is "verified in code + mocked tests", not "verified against the real providers". The UI continues to show the clearly-labelled demo diagnosis until keys are configured.

---

## 14. Security architecture (summary)

```
┌──────────────────┐
│      User        │
└────────┬─────────┘
         │ no secrets
         ▼
┌──────────────────┐
│ RepairConnect UI │
└────────┬─────────┘
         │ callable (auth-verified)
         ▼
┌──────────────────┐
│ Cloud Functions  │  ←── OPENAI_API_KEY + GROQ_API_KEY + Memcode credential (server env)
└────────┬─────────┘
         │ HTTPS
         ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│  OpenAI  │  │   Groq   │  │  Memcode │  (Firebase Storage = backup only)
└──────────┘  └──────────┘  └──────────┘
```

**The browser never receives any AI key or storage credential.**

---

## 15. Final security checklist (verified at build time)

- [ ] No real OpenAI/Groq/Firebase/Memcode credential anywhere in docs, code, README, screenshots, or recordings.
- [ ] `.env` ignored by Git; `.env.example` placeholders only.
- [ ] Firestore Rules deployed; Storage Rules for backup media; Memcode access per official docs.
- [ ] OpenAI primary + Groq failover both routed through Cloud Functions.
- [ ] AI responses normalized to one schema before reaching the frontend.
- [ ] OpenAI/Groq models + Memcode API verified against official docs before first call.
