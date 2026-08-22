# RepairConnect AI — API Key & Environment Configuration

**Document:** API_CONFIGURATION.md
**Purpose:** Single source of truth for **where every credential / configuration value goes**, which file/function consumes it, whether it is secret, and its current status.
**Last updated:** 2026-08-22
**Companions:** `API_SERVICES.md` (service inventory & architecture), `AI_SPEC.md` (AI behaviour), `SECURITY.md` (threat model), `.env.example`, `functions/.env.example`.

> **Hard rules**
> - **No real credentials in this repository — ever.** Docs, `.env.example` files, frontend JS, screenshots and recordings contain placeholders only.
> - **OpenAI / Groq / any future Memcode secret are server-side only** and are read by Cloud Functions via `process.env`. They must never appear in HTML, CSS, frontend JS, `README`, `vercel.json`, client-side env, `localStorage`, `sessionStorage`, or URL query params.
> - **Primary/backup roles are never reversed:** OpenAI = PRIMARY AI, Groq = BACKUP AI; Memcode = PRIMARY storage, Firebase Storage = BACKUP storage.
> - Model names are **not hardcoded** — they are read from config and must be **verified during implementation**.

### Central environment files
All configuration is centralized through environment variables:

| File | Committed? | Purpose |
|---|---|---|
| **`.env`** | ❌ gitignored | Central master file (all variables, one place). Fill real values locally. |
| **`.env.example`** | ✅ | Safe-to-commit template (names + placeholders) mirroring `.env`. |
| **`functions/.env.example`** | ✅ | Cloud Functions template (server-side section). Copy to `functions/.env` (gitignored) for local emulation. |

> Because the frontend is a **static site with no build step**, the browser cannot read server env vars. The PUBLIC Firebase web config is pasted into `js/firebase-config.js` (it is not a secret); SERVER-SIDE secrets live only in Firebase Cloud Functions secrets/env. See §9–§10.

---

## 1. Status summary

| Service | Purpose | Role | Credential | Secret? | Where stored | Used by | Status |
|---|---|---|---|---|---|---|---|
| Firebase Auth | Signup/login/logout/reset/Google | Auth | Firebase **web config** | No (public) | `js/firebase-config.js` | `js/firebase-init.js`, `js/data-service.js` | 🧩 Code done — config **MISSING** |
| Cloud Firestore | Database + media metadata | Database | Firebase web config (client) · Admin SDK (server) | No / no | config file + Cloud Functions ADC | `js/firestore.js`, `functions/index.js` | 🧩 Code done — deploy **MISSING** |
| Firebase Cloud Functions | Secure AI bridge + storage + rate limit | Backend | None (service runs on Firebase, ADC) | No | Firebase (auto) | `functions/index.js` | 🧩 Code done — deploy **MISSING** |
| **OpenAI API** | Damage analysis / diagnosis / assistant | **PRIMARY AI** | `OPENAI_API_KEY` (+ `OPENAI_VISION_MODEL`) | **YES** | Cloud Functions secrets/env | `functions/lib/ai.js` → `callOpenAI()` | 🧩 Code done — key **MISSING** |
| **Groq API** | Same capabilities on failover | **BACKUP AI** | `GROQ_API_KEY` (+ `GROQ_VISION_MODEL`) | **YES** | Cloud Functions secrets/env | `functions/lib/ai.js` → `callGroq()` | 🧩 Code done — key **MISSING** |
| **Memcode** | Media upload (images/video) | **PRIMARY STORAGE** | **UNVERIFIED** (see §7) | Likely | Cloud Functions secrets/env | `functions/lib/storage.js` → `createMemcodeAdapter()` | 🟡 **PLANNED** — adapter interface only; official docs **UNVERIFIED** |
| Firebase Storage | Backup copy of media | **BACKUP STORAGE** | None extra (Admin SDK default bucket) | No | Firebase project bucket | `functions/lib/storage.js` → `createFirebaseBackupAdapter()` | 🧩 Code done — **PLANNED** opt-in (`BACKUP_ENABLED=false`) |
| Leaflet | Map rendering | Map UI | None | **NOT REQUIRED** | Vendored: `vendor/leaflet/` | `repairers.html`, `js/repairers.js` | ✅ **PRESENT** (vendored 1.9.4) |
| OpenStreetMap | Base-map tiles | Map data | None (attribution required) | **NOT REQUIRED** | N/A | `js/repairers.js` → `L.tileLayer` | ✅ **PRESENT** (tile URL + attribution) |
| Browser Geolocation | Approx. user location | Location | None (permission-gated) | **NOT REQUIRED** | N/A | `js/repairers.js` → `navigator.geolocation` | ✅ **PRESENT** (graceful fallback) |
| Vercel | Static frontend hosting + HTTPS | Hosting | None (frontend only) | — | `vercel.json` | — | ✅ **PRESENT** (config) — deploy pending |

Config status markers: **PRESENT** · **MISSING** · **NOT REQUIRED** · **PLANNED** · (UNVERIFIED).
Progress key: ✅ Implemented · 🧩 Implemented (code) — deploy/credentials required · 🟡 Planned · ⚪ Not selected.

---

## 2. Architecture diagrams

### AI flow (PRIMARY → BACKUP)

```
User
  ↓
RepairConnect Frontend  (js/data-service.js → httpsCallable)
  ↓
Firebase Cloud Function  (functions/index.js → analyzeRepair / assistant)
  ↓
OpenAI PRIMARY  (functions/lib/ai.js → callOpenAI, OPENAI_API_KEY)
  ↓
Structured Response (normalized by functions/lib/normalize.js)
  ↓
Firestore + Frontend

Fallback (bounded, already implemented):
OpenAI unavailable (timeout / 429 / 5xx / network)
  ↓
Firebase Cloud Function
  ↓
Groq BACKUP  (functions/lib/ai.js → callGroq, GROQ_API_KEY)
  ↓
Structured Response
  ↓
Frontend
```

> The failover is **already implemented** in `functions/lib/ai.js` (`run()`). 4xx errors do **not** fail over — only timeout / 429 / 5xx / network errors do.

### Storage flow (PRIMARY → BACKUP)

```
User
  ↓
Frontend (image → base64)
  ↓
Firebase Cloud Function  (analyzeRepair; server-side validation only)
  ↓
Memcode PRIMARY  (functions/lib/storage.js → createMemcodeAdapter — UNVERIFIED)
  ↓
Media reference (mediaReferences) → Firestore

Backup (best-effort, BACKUP_ENABLED=true):
Memcode upload success
  ↓
Firebase Storage BACKUP  (createFirebaseBackupAdapter, Admin SDK)
  ↓
Backup reference → Firestore (mediaReferences.backupReference)
```

> Primary failure → **no** Firestore reference is created (nothing is orphaned). Backup failure → primary is preserved, `backupStatus: "failed"`. Roles are **never** reversed.

---

## 3. Firebase configuration (client)

### FILE
`js/firebase-config.js`

### FUNCTION/SECTION
`window.RC_CONFIG.firebase = { … }` — consumed by `js/firebase-init.js` → `firebase.initializeApp(window.RC_CONFIG.firebase)` (line 32), which also creates `firestore()`, `auth()`, `functions()` and sets the functions region.

### VARIABLES USED (placeholders today)

| Variable | Current value | Secret? | Where to set real value |
|---|---|---|---|
| `apiKey` | `YOUR_FIREBASE_API_KEY` | No (public) | Firebase Console → Project settings → Web app config → paste into `js/firebase-config.js` |
| `authDomain` | `your-project-id.firebaseapp.com` | No | same |
| `projectId` | `your-project-id` | No | same |
| `storageBucket` | `your-project-id.appspot.com` | No | same (this field IS used by the code) |
| `messagingSenderId` | `000000000000` | No | same |
| `appId` | `1:000000000000:web:…` | No | same |
| `functionsRegion` | `us-central1` | No | already correct (matches functions' region) |

> **The Firebase web config is NOT a secret.** It identifies your project and is expected in the browser. Security comes from Firebase Authentication + `firestore.rules` + `storage.rules` + backend authorization — **never** from hiding this config. Do **not** place a service-account key or any API key in this file.

### `RC_CONFIG.judgeDemo` (demo account)

| Variable | Current | Secret? | Notes |
|---|---|---|---|
| `judgeDemo.email` | `judge@repairconnect.ai` | No (demo) | public demo account |
| `judgeDemo.password` | `""` (empty) | Demo-only | **MISSING** — left empty on purpose so the password is not committed. The comment in the file suggests injecting it at deploy time; **no build/injection step currently exists** (static site), so wiring this requires adding a build step or a render-time injection mechanism — see §10. |

### Firestore / Auth toggling
`js/firebase-init.js` → `isConfigured()` switches the app from **DEMO MODE** to **LIVE MODE** when real `projectId` / `apiKey` / `appId` are present. `js/data-service.js` (`RC.data`) routes every call to live Firestore/Auth or the clearly-labelled demo fallback.

### Firestore collections (what gets stored — never large media in Firestore)
`users`, `devices`, `diagnoses`, `repairers` (public, read-only), `repairRequests`, `repairStatusHistory`, `mediaReferences` (media **metadata + references** only), plus `usage` (per-user rate-limit counters, written by the Cloud Function). See `firestore.rules` for the owner-scoped, default-deny policy.

---

## 4. OpenAI — PRIMARY AI

### Variable
`OPENAI_API_KEY`

### Secret?
**YES** — server-side only.

### Add it here
Firebase **Cloud Functions secrets / environment variables** (Firebase Console → Functions → *Secrets & Environment Variables*, or CLI: `firebase functions:secrets:set OPENAI_API_KEY`). For **local emulation only**, put it in `functions/.env` (gitignored; see `functions/.env.example`).

### Used by
`functions/lib/ai.js` → `callOpenAI()` (reads `process.env.OPENAI_API_KEY`), called from `functions/index.js` (`analyzeRepair`, `assistant`).

### Also required
`OPENAI_VISION_MODEL` — the vision-capable model name. **NOT hardcoded.** **MODEL TO BE VERIFIED DURING IMPLEMENTATION** (verify current vision capability before deploy).

### Endpoint / SDK
Endpoint defaults to `https://api.openai.com/v1/chat/completions` (plain `fetch`, no frontend SDK); it is **configurable** via the optional `OPENAI_BASE_URL` env var (server-side). The **official OpenAI SDK is NOT installed** (`functions/package.json` lists only `firebase-admin` + `firebase-functions`); `fetch` is used instead — an SDK is optional, not required.

### Frontend accessible?
**NO.** The browser only calls the Cloud Function via `httpsCallable` (`js/data-service.js` → `analyze()`), never OpenAI directly.

### Status
🧩 **Implemented (code) — key + model MISSING — not verified live.**

---

## 5. Groq — BACKUP AI

### Variable
`GROQ_API_KEY`

### Secret?
**YES** — server-side only.

### Add it here
Same as OpenAI: Firebase **Cloud Functions secrets/env** (`firebase functions:secrets:set GROQ_API_KEY`). Local: `functions/.env`.

### Used by
`functions/lib/ai.js` → `callGroq()` (reads `process.env.GROQ_API_KEY`), invoked only when the bounded OpenAI failover triggers.

### Also required
`GROQ_VISION_MODEL` — **NOT hardcoded.** **MODEL TO BE VERIFIED DURING IMPLEMENTATION** (verify the exact supported vision model before use — do not assume one).

### Endpoint / SDK
Endpoint defaults to `https://api.groq.com/openai/v1/chat/completions` (plain `fetch`); it is **configurable** via the optional `GROQ_BASE_URL` env var (server-side). **No Groq SDK installed** (not required).

### Frontend accessible?
**NO.**

### Status
🧩 **Implemented (code) — key + model MISSING — not verified live.**

---

## 6. Memcode — PRIMARY MEDIA STORAGE

### Integration location
`functions/lib/storage.js` → `createMemcodeAdapter()` — currently an **adapter interface only**. Its `upload()` / `remove()` throw `ConfigurationError` ("pending official API verification"). **No endpoint, credential name, SDK, bucket or auth method is assumed or invented.**

### Credential status
- **MEMCODE CREDENTIAL NAME:** To be verified from official Memcode documentation.
- **MEMCODE ENDPOINT:** To be verified.
- **MEMCODE AUTHENTICATION:** To be verified.
- **MEMCODE SDK:** To be verified.

### Where it will be configured (once verified)
- Secret (if any) → Firebase **Cloud Functions secrets/env** (never client-side).
- Implementation → inside `createMemcodeAdapter()` in `functions/lib/storage.js`.
- Document the exact official env names in `functions/.env.example` **only after** verifying the docs.

### Frontend accessible?
**NO** (will be server-side only).

### Status
🟡 **PLANNED — official docs UNVERIFIED.** Production image uploads remain blocked (`failed-precondition`) until this is implemented.

---

## 7. Firebase Storage — BACKUP MEDIA STORAGE

### Status
🧩 **Implemented (code)** — `createFirebaseBackupAdapter()` in `functions/lib/storage.js` (Admin SDK: `admin.storage().bucket()` default bucket, path `backup/{userId}/{mediaId}/{file}`). Disabled by default via `BACKUP_ENABLED=false`.

### Required configuration
- `BACKUP_ENABLED=true` as a Cloud Functions env var (turn on only after Memcode is live).
- **No extra credential** — the Admin SDK uses the project's default storage bucket (implicit service account in Cloud Functions).
- Deploy `storage.rules` (backup-only, owner-scoped: read/write `backup/{userId}/{mediaId}/{file}`, everything else denied).

### Primary role?
**No — backup only.** Primary uploads go to Memcode; Firebase Storage is never the default destination.

---

## 8. Maps & location (no keys)

| Service | Credential | Status | Notes |
|---|---|---|---|
| Leaflet 1.9.4 | None | ✅ vendored at `vendor/leaflet/` | `js/repairers.js` → `L.map` / `L.tileLayer` |
| OpenStreetMap tiles | None | ✅ `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` | Attribution already included; allowed in `vercel.json` CSP (`img-src` + `connect-src`) |
| Browser Geolocation | None | ✅ `navigator.geolocation.getCurrentPosition` | Permission-gated with graceful fallback; requires HTTPS (Vercel provides it) |

No Google Maps / Places is used.

---

## 9. Vercel configuration

### What Vercel is
**Static frontend host only.** `vercel.json` contains security headers (CSP, HSTS, etc.) and clean-URL rewrites. **There are no Vercel serverless functions** — the backend is Firebase Cloud Functions.

### Consequence for secrets
**Do NOT put `OPENAI_API_KEY` / `GROQ_API_KEY` / any Memcode secret into Vercel.** Server-side secrets live in Firebase Cloud Functions only. Vercel never sees them.

### What (if anything) belongs in Vercel environment variables
| Type | Variable | Public/Secret | Status |
|---|---|---|---|
| Firebase web config | `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID` | **Public** (not secret) | Optional — but **not wired**: the site is static with no build step, so Vercel env vars do not auto-inject into `js/firebase-config.js`. Simplest correct path: paste the public web config directly into `js/firebase-config.js`. |
| Judge demo password | `JUDGE_DEMO_PASSWORD` | Demo-only | **Not wired** (no build step). Either add a build/injection step, or accept the current "empty password → Judge button disabled" behaviour. |

> No duplicate secret-management system is needed: **Firebase web config = public, commit it.** **AI/Memcode secrets = Firebase Cloud Functions secrets.** Nothing else.

---

## 10. Environment variable reference (single source of truth)

> \* **Firebase web configuration is not equivalent to a server-side secret.** It is public project-identifying config; protection comes from Firebase Authentication + Security Rules + backend authorization.

| Variable | Service | Secret? | Used By | Location |
|---|---|---|---|---|
| `FIREBASE_API_KEY` | Firebase Auth/Firestore | **No*** | Frontend | `js/firebase-config.js` (paste from `.env`); `.env` + `.env.example` |
| `FIREBASE_AUTH_DOMAIN` | Firebase Auth | **No*** | Frontend | `js/firebase-config.js`; `.env` + `.env.example` |
| `FIREBASE_PROJECT_ID` | Firebase | **No*** | Frontend + backend | `js/firebase-config.js`; `.env` + `.env.example` |
| `FIREBASE_MESSAGING_SENDER_ID` | Firebase | **No*** | Frontend | `js/firebase-config.js`; `.env` + `.env.example` |
| `FIREBASE_APP_ID` | Firebase | **No*** | Frontend | `js/firebase-config.js`; `.env` + `.env.example` |
| `FIREBASE_STORAGE_BUCKET` | Firebase Storage (backup) | **No*** | Frontend config + backend Admin SDK | `js/firebase-config.js`; `.env` + `.env.example` |
| `JUDGE_DEMO_EMAIL` / `JUDGE_DEMO_PASSWORD` | Demo account | Demo-only | Frontend `js/firebase-config.js` | `.env` + `.env.example` (password left empty; not wired) |
| `OPENAI_API_KEY` | OpenAI (PRIMARY AI) | **YES** | Cloud Function `functions/lib/ai.js` → `callOpenAI()` | **Server**: Firebase Cloud Functions secrets/env; `functions/.env` (emulator only) |
| `OPENAI_VISION_MODEL` | OpenAI (model) | No | Cloud Function `functions/lib/ai.js` | **Server** (verify model at implementation) |
| `OPENAI_BASE_URL` | OpenAI (optional endpoint) | No | Cloud Function `functions/lib/ai.js` | **Server** (default `https://api.openai.com/v1`) |
| `GROQ_API_KEY` | Groq (BACKUP AI) | **YES** | Cloud Function `functions/lib/ai.js` → `callGroq()` | **Server**: Firebase Cloud Functions secrets/env; `functions/.env` (emulator only) |
| `GROQ_VISION_MODEL` | Groq (model) | No | Cloud Function `functions/lib/ai.js` | **Server** (verify model at implementation) |
| `GROQ_BASE_URL` | Groq (optional endpoint) | No | Cloud Function `functions/lib/ai.js` | **Server** (default `https://api.groq.com/openai/v1`) |
| `MEMCODE_*` | Memcode (PRIMARY STORAGE) | **Depends** (TBD) | Cloud Function `functions/lib/storage.js` → `createMemcodeAdapter()` | **Server** — exact official names **UNVERIFIED**; nothing invented |
| `ANALYZE_DAILY_LIMIT` | Rate limit | No | Cloud Function `functions/index.js` | **Server** (default 20) |
| `BACKUP_ENABLED` | Firebase Storage backup toggle | No | Cloud Function `functions/index.js` + `lib/storage.js` | **Server** (default `false`) |

### Not required (no credential exists / none needed)
- **Leaflet** (vendored 1.9.4), **OpenStreetMap** tiles (attribution only), **Browser Geolocation** (permission-gated) — **no credentials**.
- **Cloud Functions service account** — **not committed**; Firebase supplies it automatically at runtime. For local emulation only, use `firebase login` / Application Default Credentials (never commit `*.service-account.json`).
- **NODE_ENV** — not currently read by any code (static site, no build step); add only if a consumer is introduced.

---

## 11. Environment files status (centralized)

- **`.env`** (root, gitignored) — **created** as the central master file: every variable name organized into sections (Firebase public config · judge demo · OpenAI · Groq · application/backend · Memcode-UNVERIFIED). Values are empty/placeholder only.
- **`.env.example`** (root) — **updated** to mirror `.env` exactly (full inventory: Firebase + judge demo + OpenAI + Groq + `ANALYZE_DAILY_LIMIT` + `BACKUP_ENABLED` + commented Memcode). Placeholders only; safe to commit.
- **`functions/.env.example`** — **updated** to add the optional `OPENAI_BASE_URL` / `GROQ_BASE_URL` lines. Memcode remains a commented `MEMCODE_<EXACT_OFFICIAL_NAME>` (nothing invented). Placeholders only.
- No real `.env` / `functions/.env` values exist in the repo (verified — only the templates above).

## 12. `.gitignore` security check (verified — correct)

- `.env`, `.env.*`, `functions/.env`, `functions/.env.*` → **ignored** (with `!.env.example` / `!functions/.env.example` whitelisted). ✅
- `*.service-account.json`, `firebase-debug.log` → **ignored**. ✅
- `node_modules/`, Playwright cache, test artifacts → ignored. ✅
- Public config files (`vercel.json`, `firestore.rules`, `storage.rules`, `sitemap.xml`, `robots.txt`) are **not** ignored. ✅

---

## 13. Secret-exposure scan (verified clean)

Searched all HTML / JS / CSS / JSON / Markdown / config for `OPENAI_API_KEY`, `GROQ_API_KEY`, `AIza…`, `sk-…`, `gsk_…`, `Bearer …`, `Authorization`, `apiKey`, `token`, `secret`, `password`:

- **No real secrets found anywhere** (only placeholders and the public demo credentials in `login.html`'s DEMO ACCESS block + `README` — those are intentionally public demo accounts, not production secrets).
- OpenAI/Groq key names appear **only** in `functions/` (server-side). They never appear in frontend JS, HTML, CSS, `vercel.json`, `localStorage`, or `sessionStorage` (frontend storage is used only for the demo store `rc-demo-store-v1:*` and theme `rc-theme`).
- `window`/`document`/`localStorage`/`sessionStorage` expose **no** API keys.

---

## 14. Missing configuration checklist

- [ ] **Firebase project created** + Web app registered → paste web config into `js/firebase-config.js`
- [ ] **Firebase Auth** enabled (Email/Password; Google provider if wanted) + demo accounts created in Firebase Console
- [ ] **Firestore** created + `firestore.rules` deployed
- [ ] **Storage** bucket created + `storage.rules` deployed (backup-only)
- [ ] **Cloud Functions** deployed (`functions/` + `firebase.json`; currently `firebase.json` does not exist in the repo)
- [ ] **OpenAI** configured (`OPENAI_API_KEY` + verified `OPENAI_VISION_MODEL` as Cloud Functions secrets)
- [ ] **Groq** configured (`GROQ_API_KEY` + verified `GROQ_VISION_MODEL` as Cloud Functions secrets)
- [ ] **Memcode** verified from official docs, then implemented in `createMemcodeAdapter()` + secret added
- [ ] **Firebase Storage backup** enabled (`BACKUP_ENABLED=true`)
- [ ] **Vercel** deployed (static; no secrets) — canonical `https://repairconnect-ai.vercel.app/`
- [ ] **Google Search Console** verified (Google-side action)

---

## 15. What to configure next (ordered)

<<<<<<< HEAD
1. Create a Firebase project; add a **Web app**; copy its config into `js/firebase-config.js` (this flips the app from DEMO → LIVE). Also add the production domain **`repairconnect-ai.vercel.app`** to **Firebase Console → Authentication → Settings → Authorized domains** so Firebase Auth (including Google popup) works on Vercel.
2. Enable **Email/Password** (and optionally **Google**) in Firebase Authentication; create the demo accounts (`demo@repairconnect.ai`, `judge@repairconnect.ai`) as normal user-level accounts with private passwords (never stored in this repo).
=======
1. Create a Firebase project; add a **Web app**; copy its config into `js/firebase-config.js` (this flips the app from DEMO → LIVE).
2. Enable **Email/Password** (and optionally **Google**) in Firebase Authentication; create the demo accounts (`demo@repairconnect.ai`, `judge@repairconnect.ai`) as normal user-level accounts.
>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356
3. Create Firestore + Storage buckets; deploy `firestore.rules` and `storage.rules`.
4. Add a `firebase.json` (functions + rules targets) and deploy the Cloud Functions (`firebase deploy --only functions`).
5. Set `OPENAI_API_KEY` + a verified `OPENAI_VISION_MODEL`, and `GROQ_API_KEY` + a verified `GROQ_VISION_MODEL` as Cloud Functions secrets.
6. Verify Memcode's official documentation (endpoint, auth, credential names, limits) → implement `createMemcodeAdapter()` → add its secret server-side → optionally set `BACKUP_ENABLED=true`.
7. Deploy the frontend to Vercel (no secrets) and complete Google Search Console verification in the Google console.
