# RepairConnect AI — Security Specification

**Document:** SECURITY.md
**Status:** Approved baseline — CURRENT (implemented) vs PLANNED security separated
**Last updated:** 2026-08-22

---

## CURRENT security (✅ implemented in the shipped frontend build)

- **No secrets exist in the codebase.** There is no Groq key, no Firebase config, no Memcode credential anywhere in the shipped files.
- **AI-generated content is treated as untrusted.** The demo renderers escape all text via `RC.escape()`; nothing is injected with `innerHTML` from user/AI input.
- **No real authentication.** The demo login form is simulated and clearly labelled; it does not create accounts.
- **Demo data is fictional and clearly labelled** (demo devices, demo providers "not real businesses", demo user "Alex Demo").
- **No real user data is collected or stored.**

## PLANNED security (backend integration)

### 1. OpenAI security (planned — PRIMARY AI)
- `OPENAI_API_KEY` is a **server-side secret** only (Cloud Functions env/secrets).
- It must **never** appear in HTML, CSS, frontend JavaScript, Git, README, screenshots, **recordings**, or client-side env vars.
- Frontend never calls OpenAI directly: browser → Cloud Function → OpenAI → (validate) → browser.

### 2. Groq security (planned — BACKUP AI)
- `GROQ_API_KEY` is a **server-side secret** only, used **only on defined failover conditions**.
- Same exposure rules as OpenAI: never in HTML/CSS/frontend JS/Git/README/screenshots/recordings/public env vars.
- Frontend never calls Groq directly.

### 3. Firebase security (planned)
- **Authentication** required for all private collections.
- **Firestore Security Rules** enforce owner-scoped access:
  - A user can read/write **their own** devices, diagnoses, repair requests, media references.
  - `repairers` is world-readable, not user-writable.
  - `repairStatusHistory` protected via parent request.
- **Firebase Storage Security Rules** (`storage.rules`, for **backup** media only): authentication required, owner-scoped `backup/{userId}/…` paths, ≤25 MB size cap, image MIME allow-list, default-deny. Normal uploads never touch this bucket — Memcode is primary.
- **Least-privilege access** and server-side validation in Cloud Functions.
- **Never claim that hiding the Firebase web config protects data.** Protection = Authentication + Rules + server-side validation.

### 4. Memcode security (PRIMARY STORAGE — adapter interface, pending official docs)
- If Memcode requires a credential, it stays **server-side** (Cloud Function / secure layer).
- Planned controls (only claim what official Memcode docs confirm): authenticated upload flow, file ownership, access control, signed/private URLs where supported, deletion controls.
- **Verify Memcode's official documentation** before integration; do not invent endpoints or credential names.

### 5. File upload security (planned)
| Control | Requirement |
|---|---|
| Accepted image types | `image/jpeg`, `image/png`, `image/webp` (+ video types if supported by Memcode and the AI model) |
| Max size | 5 MB image / 25 MB video (client **and** server validation) |
| Validation | extension + MIME + content signature |
| Safe filenames | random IDs; never reflect user input |
| Ownership | `userId`-scoped; no cross-user access |
| Authorization | authenticated upload only |

### 6. User input security
- Validate email/password/text lengths; whitelist enum values.
- Render all text as text (escape) — no raw HTML injection.

### 7. AI output security
- Treat AI output as untrusted. Validate/normalize structured JSON server-side (AI_SPEC §2.3); never execute AI text.

### 8. Privacy (planned)
- Users must not be able to access another user's **devices, diagnoses, uploads, repair requests, or repair history**.
- Store the minimum needed; allow deletion of diagnoses/requests and their media.
- Geolocation: coarse location, permission-gated, no persistence of precise coordinates.

---

## Environment files & secret handling

| File | Contents | Committed? |
|---|---|---|
| `.env` | **Central** config (real values added locally only) | ❌ Never |
| `.env.example` | Names + placeholders only (mirrors `.env`) | ✅ Yes |
| `functions/.env.example` | Cloud Functions template (server-side section) | ✅ Yes |

`.gitignore` enforces: `.env`, `.env.*`, `!.env.example`, `functions/.env*` (with `!.env.example`), `*.service-account.json`.

> Exact variable names → locations → consumers are catalogued in [`API_CONFIGURATION.md`](API_CONFIGURATION.md). Server-side secrets (`OPENAI_API_KEY`, `GROQ_API_KEY`, any future Memcode secret) live **only** in Firebase Cloud Functions secrets/env; the public Firebase web config lives in `js/firebase-config.js` (not a secret).

---

## Frontend hardening (✅ implemented in the current build)

Practical measures already in place for the static HTML/CSS/JS frontend (this is **not** a claim of being "unhackable"):

- **XSS:** user-controlled content (chat messages, filenames, form input) is rendered with `textContent` or escaped via `RC.escape()`. `innerHTML` is used **only** for trusted, developer-authored demo data — never for user messages, filenames, AI responses, or query parameters.
- **Input validation:** email/password/name/confirm, date/phone/notes length, and chat length are validated client-side. **Server-side validation is still required once the backend is implemented** — client checks are UX only.
- **File upload validation:** type + size enforced client-side; **SVG is rejected** (active content); previews render via `<img>` (never executing uploaded content); single-file only.
- **URL/query security:** query params (`provider`, `ids`) are matched against the demo dataset with a safe fallback; no user-controlled value is inserted into the DOM unescaped, and there are no open-redirect sinks.

## Vercel deployment security (configured in vercel.json)

| Header | Value / purpose |
|---|---|
| `Content-Security-Policy` | `default-src 'self'`; script/style `'unsafe-inline'` **only** for the inline JSON-LD + no-flash line and inline `style=""` attributes; `object-src 'none'`; `frame-ancestors 'self'` (clickjacking); image/connect allow OSM tiles for the future map |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camera/geolocation self; microphone/payment disabled |
| `X-Frame-Options` | `SAMEORIGIN` (fallback to CSP frame-ancestors) |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` |

- **HTTPS:** production runs over HTTPS automatically (Vercel). No HTTP-only assumptions.
- **Secret protection:** `OPENAI_API_KEY`, `GROQ_API_KEY`, and Memcode/Firebase server credentials must **never** appear in frontend JS, HTML, CSS, Git, README, screenshots, or recordings. Verified clean in the current codebase.

## Implemented backend security (code — deploy required to activate)

- **Cloud Functions** (`functions/index.js`): `analyzeRepair` + `assistant` verify `context.auth`, validate payload size/type (`lib/guard.js`), rate-limit per user (daily cap, `usage/{uid}`), and normalize AI output before returning it. Failover is bounded (one fallback attempt, then a typed error); 4xx auth errors are NOT treated as failover conditions.
- **Firestore rules** (`firestore.rules`): owner-scoped access for `users`, `devices`, `diagnoses`, `mediaReferences`, `repairRequests` + append-only `history`; public read-only `repairers`; default-deny catch-all.
- **Rate/abuse protection:** authenticated-only calls, 5 MB image cap, text length caps, and a per-user daily analysis limit (`ANALYZE_DAILY_LIMIT`, default 20) enforced in a Firestore transaction. Firebase **App Check** is the recommended stronger guard for production.
- **AI safety** (`functions/lib/normalize.js`): AI output is treated as untrusted — parsed, sanitized, clamped, and enriched with the standard danger warning; never rendered as HTML.
- **Deterministic pricing** (`functions/lib/estimate.js`): repair/replacement estimates + repair-vs-replace verdict are computed server-side; the AI only explains them.
- **CSP** updated for Firebase endpoints + OpenStreetMap tiles (see `vercel.json`); `object-src 'none'`, `frame-ancestors 'self'`.
- **Secrets** stay server-side: `OPENAI_API_KEY`, `GROQ_API_KEY`, and Memcode credentials are read from Cloud Functions env/secrets only.

> Frontend validation remains UX-only; the backend above is the real authorization boundary.

## Authentication security (implemented)

- **Demo accounts are intentionally public test accounts** (`demo@repairconnect.ai` / `judge@repairconnect.ai`). They are assigned **normal user-level permissions only** — never admin, never access to other users' data, backend secrets, or Firebase project settings. They hold synthetic sample data only.
- **Passwords are never stored** — not in Firestore, not in frontend source. Authentication is handled entirely by Firebase Authentication; Firestore stores only profile metadata (`users/{uid}`: uid, name, email, photoURL, preferences).
- **Firestore user documents** are created on first sign-in via `ensureUserDoc()` and are owner-scoped by `firestore.rules`.
<<<<<<< HEAD
- **Protected routes / authentication gate** (`auth-guard.js`) redirects unauthenticated users to `login.html?next=<page>` with a safe allow-list for the `next` target (no open redirects). **Firebase Authentication is the only authentication provider** — a visitor with no Firebase session cannot reach Dashboard, Analyze, Diagnosis, Repair Decision, Repairers, Comparison, Request Repair, Tracking, AI Assistant, or Profile. When Firebase is not configured, protected pages still redirect to Login (never a fabricated session). Login/Signup are never redirected (no loops). Firebase auth-state loading is handled (no premature redirect, no flicker, safety-capped). Frontend checks are UX only; Firestore/Storage rules remain the real boundary.
- **No authentication bypass** — there is no guest access, no "demo without an account" path, and no localStorage/`sessionStorage` session key that grants access. The only credentials shown in the UI are the two **intentionally public demo/judge test accounts** (`demo@repairconnect.ai` / `judge@repairconnect.ai`), which hold synthetic sample data and have no admin privileges. No production user passwords are ever stored or displayed.
=======
- **Protected routes / authentication gate** (`auth-guard.js`) redirects unauthenticated users to `login.html?next=<page>` with a safe allow-list for the `next` target (no open redirects). The gate now enforces authentication in **both** Firebase live mode and demo mode: a visitor with no session cannot reach Dashboard, Analyze, Diagnosis, Repair Decision, Repairers, Comparison, Request Repair, Tracking, AI Assistant, or Profile. Login/Signup are never redirected (no loops). Firebase auth-state loading is handled (no premature redirect, no flicker, safety-capped). Frontend checks are UX only; Firestore/Storage rules remain the real boundary.
- **Demo session** — in demo mode only a stored demo session counts as "signed in" (no default user is fabricated); "Try Demo" establishes that clearly-labelled session. Demo sessions are not a production authorization mechanism.
>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356
- **Error handling** maps Firebase error codes to friendly messages (invalid credentials, weak password, email-in-use, popup closed/blocked, too many requests) — no internal error details, keys, or stack traces are exposed.
- **Google sign-in** uses the official Firebase popup flow (`signInWithPopup` + `GoogleAuthProvider`); it is disabled with a clear message until the Google provider is enabled in the Firebase console.
- **Remember me** controls Firebase auth persistence (LOCAL vs SESSION); no credentials are handled client-side.

## Build-time security checklist (backend stage)

- [ ] No secrets in `public/`, Git, README, screenshots, or recordings.
- [ ] `OPENAI_API_KEY` (primary) + `GROQ_API_KEY` (backup) via Cloud Functions secrets only.
- [ ] Firestore Security Rules deployed and tested (cross-user + signed-out denied).
- [ ] Storage Security Rules deployed for the Firebase Storage **backup** bucket.
- [ ] Memcode credentials server-side; upload path/type/size validated.
- [ ] AI output from **both** providers validated/normalized to one schema before reaching the client.
- [ ] All user/AI text rendered as text (XSS-safe).
- [ ] Callables verify `context.auth` + ownership.
