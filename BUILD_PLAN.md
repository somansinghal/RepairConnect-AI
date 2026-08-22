# RepairConnect AI — Build Plan (next development stage)

**Document:** BUILD_PLAN.md
**Status:** Frontend ✅ implemented — backend 🟡 planned
**Last updated:** 2026-08-22

The frontend (14 pages, demo data, design system, animations, SEO, screenshot/recording/audit tooling) is **complete**. This plan covers the **next development stage** — wiring the planned backend in the right order, prioritizing the complete core repair journey.

> **Do NOT sacrifice the core flow for secondary features.**

---

## Recommended implementation sequence (22 steps)

| # | Step | Priority | Dependencies |
|---|---|---|---|
| 1 | Firebase project configuration | Critical | — |
| 2 | Firebase Authentication (email/password; optional Google) | Critical | 1 |
| 3 | Cloud Firestore (schema + Security Rules) | Critical | 1–2 |
| 4 | Memcode **primary** storage integration | Critical | 3 |
| 5 | Firebase Storage **backup** architecture | Critical | 3 |
| 6 | Backup / recovery workflow | Important | 5 |
| 7 | Firebase Cloud Functions (scaffold + secrets) | Critical | 1 |
| 8 | OpenAI **primary** AI integration | Critical | 7 |
| 9 | Groq **fallback** AI integration | Important | 7 |
| 10 | AI response normalization (one schema for both providers) | Critical | 8–9 |
| 11 | Real AI diagnosis (replace demo diagnosis) | Critical | 10 + 4 |
| 12 | Repair recommendation engine (`getRecommendation`) | Critical | 11 |
| 13 | Real repairer system (Leaflet + OSM + geolocation + provider data) | Critical | 3 |
| 14 | Repair request persistence (Firestore write) | Critical | 3 |
| 15 | Repair tracking persistence (real-time status history) | Critical | 14 |
| 16 | Playwright automated testing | Critical | 11–15 |
| 17 | Screenshot generation (regenerate showcase) | Important | 16 |
| 18 | Demo / judge account setup | Important | 2 |
| 19 | Storage failure testing (Memcode fail / backup fail / both fail) | Important | 4–6 |
| 20 | AI provider failover testing (OpenAI → Groq) | Important | 8–10 |
| 21 | Security audit (secrets, rules, XSS, isolation) | Critical | all |
| 22 | Production deployment (Firebase Hosting) | Critical | 21 |

---

## Phase detail & time estimates (post-frontend)

| Phase | Est. | Key outcomes |
|---|---|---|
| 1. Firebase project config | 30m | Project created; Auth/Firestore/Functions/Hosting enabled; `FIREBASE_*` organized |
| 2. Firebase Authentication | 45m | Real signup/login/logout; `users` docs on create |
| 3. Firestore + Rules | 45m | Schema per DATABASE_SCHEMA.md; owner-scoped rules tested |
| 4. Memcode primary storage | 1h | Verify official Memcode docs; upload/download via secure layer; `mediaReferences` |
| 5. Firebase Storage backup | 45m | Backup bucket + Storage Rules; **backup-only** role |
| 6. Backup/recovery workflow | 30m | `backupStatus` tracking; retry; recovery path |
| 7. Cloud Functions scaffold | 30m | `functions/` layout; `OPENAI_API_KEY` + `GROQ_API_KEY` secrets |
| 8. OpenAI primary integration | 45m | Verify vision model; `analyzeRepair` calls OpenAI |
| 9. Groq fallback integration | 30m | Verify Groq model; failover path per defined conditions |
| 10. Response normalization | 30m | One schema; frontend never sees provider-specific formats |
| 11. Real AI diagnosis | 45m | Diagnosis screen consumes normalized AI output |
| 12. Recommendation engine | 40m | Deterministic estimate + repair-vs-replace; AI explains only |
| 13. Real repairer system | 1h | Leaflet + OSM + geolocation + provider data + Best Match |
| 14. Request persistence | 30m | `repairRequests` + first `repairStatusHistory` event |
| 15. Tracking persistence | 30m | Real-time status timeline |
| 16. Playwright testing | 40m | `npm run audit` clean; end-to-end demo |
| 17. Screenshot regeneration | 15m | `npm run screenshots` + `npm run record` refreshed |
| 18. Demo/judge accounts | 20m | Securely-created demo accounts or equivalent demo access |
| 19. Storage failure testing | 30m | Memcode/backup/both-fail paths verified |
| 20. AI failover testing | 30m | OpenAI → Groq failover verified |
| 21. Security audit | 30m | Grep secrets; rules tests; XSS; isolation |
| 22. Deployment | 20m | Vercel (or Firebase Hosting); update canonical domain |

---

## Priority ladder (if time runs out)

1. Firebase Auth → 2. Firestore + rules → 3. Memcode primary storage → 4. Cloud Functions → 5. OpenAI (primary AI) → 6. response normalization → 7. real diagnosis → 8. repair-vs-replace → 9. repairer system → 10. request + tracking → 11. deployment.

**Defer if late:** Firebase Storage backup workflow, Groq failover, demo-account polish, storage/failover failure testing.

**Never skip:** the complete core journey (upload → diagnose → decide → find → request → track) and the security audit.

---

## Pre-integration checklist (before any backend wiring)

- [ ] Verify a vision-capable **OpenAI** model + **Groq** model (backup) + their pricing/limits.
- [ ] Verify **Memcode** official docs (API, auth, limits, file types, URL behavior, pricing, exact credential names).
- [ ] Copy `.env.example` → `.env` (gitignored); confirm `.env`/`functions/.env` excluded.
- [ ] Store `OPENAI_API_KEY` (primary) + `GROQ_API_KEY` (backup) + Memcode credential server-side only.
- [ ] Deploy Firestore Security Rules **before** data flows; Storage Rules for the backup bucket.
- [ ] Keep the approved service boundary: Firebase Auth · Firestore · Functions · **Memcode (primary storage)** · **Firebase Storage (backup)** · **OpenAI (primary AI)** · **Groq (backup AI)** · Leaflet · OSM · Geolocation.

---

## Service status

| Service | Status |
|---|---|
| Frontend (HTML/CSS/JS) | ✅ Implemented |
| Leaflet / OSM / Geolocation | ✅ Implemented (live map) |
| Firebase Auth / Firestore / Functions | 🧩 Implemented (code) — deploy + config required |
| **Memcode (primary storage)** | 🧩 Adapter interface — official docs verification pending |
| **Firebase Storage (backup storage)** | 🧩 Implemented (code) — deploy required |
| **OpenAI (primary AI)** | 🧩 Implemented (code) — key required |
| **Groq (backup AI)** | 🧩 Implemented (code) — key required |
| Real repair-provider API | ⚪ Not selected |

> **Backend status:** the AI backend (`functions/index.js` → `analyzeRepair` + `assistant`, OpenAI primary → Groq failover, normalization, deterministic recommendation, per-user rate limiting) is **implemented in code** and unit/smoke-tested (`npm run test:unit`). Deployment and credential configuration remain the only manual steps. Memcode + Firebase Storage backup are a **later phase** (not present in this phase).
