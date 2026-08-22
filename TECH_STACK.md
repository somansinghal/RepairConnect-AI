# RepairConnect AI — Technology Stack

**Document:** TECH_STACK.md
**Status:** Approved baseline (frontend implemented; backend planned)
**Last updated:** 2026-08-22

This document fixes the exact technology choices for RepairConnect AI and clearly separates what is **currently implemented** from what is a **planned integration**. Deviating from this stack requires explicit approval (see Development Rules in PROJECT_SPEC.md).

---

## 1. Guiding constraint

> **Free-first.** Every service must be used within its available free tier / open-source terms. **No service is claimed to be permanently free** — pricing, limits, and free-tier terms are verified at integration time (OpenAI, Groq, Memcode, and Firebase included).

---

## 2. Frontend — ✅ CURRENTLY IMPLEMENTED

| Choice | Status |
|---|---|
| **HTML5** | ✅ Implemented (16 pages, incl. `privacy-policy.html` & `terms-of-service.html`) |
| **CSS3** | ✅ Implemented (design system: `global.css`, `components.css`, `pages.css`, `animations.css`, `theme.css`) |
| **Vanilla JavaScript (ES2017+)** | ✅ Implemented (feature modules + demo-data layer + theme system) |
| **Theme system** | ✅ Implemented — Light / Dark / System via CSS variables, `localStorage`, and a no-flash `theme-init.js` (follows `prefers-color-scheme`) |
| **Vercel deployment config** | ✅ Implemented — `vercel.json` (clean URLs + security headers; no build step required) |

**Explicit rule:** ❌ **Do NOT use React, Next.js, Vue, Angular, Svelte, or TypeScript.** Lightweight static HTML/CSS/JS, no build step.

---

## 3. Backend / Cloud — 🟡 PLANNED

| Choice | Purpose | Status |
|---|---|---|
| **Firebase Authentication** | Signup / login / logout / password reset / (optional) Google | 🟡 Planned |
| **Cloud Firestore** | Primary database + media references/metadata | 🟡 Planned |
| **Firebase Cloud Functions** | Secure backend: AI bridge + failover, storage ops, validation, business logic | 🟡 Planned |
| **Firebase Hosting** | Static hosting + HTTPS + CDN | 🟡 Planned |

> **Current static hosting:** the site is deployed-ready for **Vercel** (`vercel.json` ships security headers; see SECURITY.md) and currently served locally via a static server. Firebase Hosting remains the planned production host.

---

## 4. Storage — 🟡 PLANNED (dual-layer)

| Layer | Provider | Role |
|---|---|---|
| **PRIMARY storage** | **Memcode** | Default destination for new uploads (damage images, supported videos, repair media). |
| **BACKUP storage** | **Firebase Storage** | Secondary backup / disaster-recovery layer. **Not** the default upload destination. |
| **Database / metadata** | **Cloud Firestore** | Stores media **references/metadata**, not large binaries. |

> **Firebase Storage MUST NOT be described as primary.** Memcode MUST be described as primary.
> **Memcode verification:** official docs must be checked at integration for API, authentication, credential names, limits, file types, URL/reference behavior, deletion, pricing, free tier, egress. Do not invent endpoints/variable names.
> **Backup:** the exact strategy (critical-media / automatic / failure-recovery) is selected during implementation — do not claim automatic backup exists yet.

---

## 5. AI — 🟡 PLANNED (dual-provider with failover)

| Layer | Provider | Role |
|---|---|---|
| **PRIMARY AI** | **OpenAI API** | Default provider: damage analysis, diagnosis, severity, troubleshooting, repair explanation, repair-vs-replace reasoning, assistant, recommendations. |
| **BACKUP AI** | **Groq API** | Fallback provider, used only when defined failover conditions are met. |

- **Both keys are server-side only** (`OPENAI_API_KEY`, `GROQ_API_KEY`) — never in HTML/CSS/frontend JS/Git/README/screenshots/recordings.
- **Models are not hardcoded** for either provider — verify the vision-capable model at implementation time.
- **The frontend is provider-agnostic:** the Cloud Function normalizes both providers to one consistent structured response (AI_SPEC.md).

---

## 6. Maps & location

| Choice | Use | Key | Status |
|---|---|---|---|
| **Leaflet** | Interactive repairer map, markers, popups | ❌ none (BSD-2 open source) | 🟡 Planned — placeholder + demo pins in `repairers.html` |
| **OpenStreetMap** | Base map tiles | ❌ none (usage/attribution policy) | 🟡 Planned |
| **Browser Geolocation** | Approximate location, distance calc | ❌ none (browser permission) | 🟡 Planned |

> ❌ No Google Maps/Places/paid geocoding. OSM supplies tiles only — not a repair-shop database.

---

## 7. Repair-provider data

- **Current (implemented):** clearly-labelled demo/mock providers in `data/demo-repairers.js`. **Not real businesses.**
- **Future:** a real provider/location source may be selected **only if explicitly approved**. No paid provider API now.

---

## 8. Excluded services (do NOT add without approval)

Google Maps API · Google Places API · OpenAI alternatives as primary AI · Gemini · unnecessary weather APIs · paid geocoding · paid repair-provider APIs.

**Approved stack:** Firebase Auth · Firestore · Cloud Functions · **Memcode (primary storage)** · **Firebase Storage (backup storage)** · **OpenAI (primary AI)** · **Groq (backup AI)** · Leaflet · OpenStreetMap · Browser Geolocation.

---

## 9. Configuration & secrets inventory

### 9.1 Server-side secrets (Cloud Functions only)

| Env var | Role | Frontend exposure |
|---|---|---|
| `OPENAI_API_KEY` | PRIMARY AI | **Never** |
| `GROQ_API_KEY` | BACKUP AI | **Never** |
| Memcode credential(s) | PRIMARY STORAGE — verify exact official names | **Never** |
| (Firebase Storage backup uses the Firebase project config + Admin SDK — add config only after Firebase setup) | — | — |

### 9.2 Firebase web config (public-ish, NOT a secret)

```
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
```

> Data protection relies on **Authentication + Firestore Security Rules + Storage Security Rules (backup media) + server-side validation + least-privilege access** — never on hiding the config.

### 9.3 Environment files

| File | Contents | Committed? |
|---|---|---|
| `.env` | **Central** config (all variables; real values added locally) | ❌ Never |
| `.env.example` | Names + placeholders only (mirrors `.env`) | ✅ Yes |
| `functions/.env.example` | Cloud Functions template (server-side section) | ✅ Yes |

> Full variable reference (name → service → secret? → consumer → location) lives in [`API_CONFIGURATION.md`](API_CONFIGURATION.md).

---

## 10. Service status matrix

| Service | Status |
|---|---|
| HTML / CSS / Vanilla JS | ✅ **Implemented** |
| Leaflet / OSM / Geolocation | ✅ **Implemented** (live map + geolocation) |
| Firebase Auth / Firestore / Functions | 🧩 **Implemented (code)** — deploy + config required |
| **Memcode (primary storage)** | 🧩 Adapter interface — official doc verification pending |
| **Firebase Storage (backup storage)** | 🧩 Implemented (code) — deploy required |
| **OpenAI (primary AI)** | 🧩 **Implemented (code)** — key required |
| **Groq (backup AI)** | 🧩 **Implemented (code)** — key required |
| Real repair-provider API | ⚪ Not selected |

Full per-service detail: **API_SERVICES.md**.
