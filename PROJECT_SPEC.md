# RepairConnect AI — Project Specification

**Document:** PROJECT_SPEC.md
**Status:** Approved baseline for build (pre-implementation)
**Last updated:** 2026-08-22
**Author:** Lead Product Architect / UX Architect / AI Engineer / Full-Stack Architect — RepairConnect AI

> **Source alignment note.** This specification is grounded in the official hackathon brief for **Problem Statement #10 — RepairConnect** and the engineering directives in the task brief. The PDF copy of the problem statement was not present in the workspace when this document set was authored; every requirement below is drawn from the authoritative task brief (including the step-by-step user experience, P0/P1/P2 priorities, and ₹ INR examples) and is internally consistent with it. If the official PDF contains additional specific figures (e.g. exact price bands, mandated metrics, or named constraints), reconcile those at implementation time and update this document rather than silently diverging.

---

## 1. Product Identity

| Attribute | Value |
|---|---|
| **Product name** | RepairConnect AI |
| **Tagline** | *"Don't replace it. Repair it."* |
| **One-sentence description** | RepairConnect AI is an AI-powered repair-decision and repair-connection platform that helps people understand what is wrong with a damaged item, decide whether to repair or replace it, and connect with nearby repair professionals to get it fixed and track the repair. |
| **Product type** | Complete AI-assisted repair decision & service-connection web platform (mobile-first, responsive) |
| **Status** | Hackathon MVP → production-ready architecture |

**Detailed product description.** RepairConnect AI is a **complete repair platform**, not a chatbot, not a repair-shop directory, not a bare image classifier, not a marketplace, and not a generic AI assistant. It unifies the entire broken-item journey in one place: a user photographs (or, if feasible, records) a damaged item or describes it; AI analyzes it to identify the device and the visible damage, propose possible causes, and offer **safe** basic troubleshooting; the system produces a **deterministic** repair-cost estimate and a transparent **repair-vs-replace** recommendation; the user discovers, gets a **best-match recommendation for**, and compares **nearby repair professionals** on a map; then requests a repair and tracks its status through a clear lifecycle to completion. Every output links to the next action, so the product behaves like a real repair ecosystem rather than a one-shot tool.

---

## 2. Problem

When a device or household item breaks, the average person faces a chain of unknowns:

1. **What exactly is wrong?** Visible damage (a cracked screen, a dent) often hides deeper issues, and most people cannot assess it themselves.
2. **How serious is it?** There is no easy way to judge severity or urgency.
3. **Can it be repaired?** Many repairable items are abandoned because the owner assumes they're beyond saving.
4. **Is it worth the money?** Without comparing repair cost to the item's value, people default to replacing — usually costlier and wasteful.
5. **How much might it cost?** Repair pricing is opaque and varies wildly by shop.
6. **Where can it be fixed?** Local repair options are fragmented and hard to find.
7. **Who is the best option?** Distance, rating, price, expertise, and turnaround are never presented side by side.
8. **What happens after I hand it over?** There is no easy way to track a repair through to completion.

**Result:** consumers over-replace, over-spend, or abandon repairable items; repair professionals lose discoverable demand; and repairable goods end up as waste. **Problem Statement #10 (RepairConnect)** targets exactly this gap: a trustworthy, guided way to make the right repair decision and act on it.

---

## 3. Solution

RepairConnect AI addresses each unknown with one connected pipeline:

| Unknown | How RepairConnect AI solves it |
|---|---|
| What's wrong? | **AI visual analysis** identifies the item and the visible damage, and lists *possible* causes — always distinguishing what is **seen** from what is **inferred**. |
| How serious? | A normalized **severity** level with a **confidence** percentage. |
| Can it be repaired? | A **repairability** read from AI, then a deterministic **repair-vs-replace** verdict. |
| Worth the money? | A deterministic **repair-vs-replace** engine compares estimated repair cost vs. replacement value and shows the **Repair Cost Ratio**. |
| How much? | A **deterministic estimate engine** (not an LLM guessing) returns a transparent **₹ price band** with the factors behind it. |
| Where? | **Map-based discovery** (Leaflet + OpenStreetMap) with geolocation, distance sorting, and category filters. |
| Who's best? | A transparent **Best Match** ranking engine weighs distance, price, rating, expertise, and turnaround — and says *why*. |
| What happens next? | **Repair requests** and a **status timeline** tracked to completion. |

The core flow: **Broken item → Upload photo/video → AI visual analysis → Possible diagnosis → Safe basic troubleshooting → Repair cost estimation → Repair vs Replace → Find nearby repair professionals → Compare repair options → Request repair → Track repair status → Repair completed.**

The product also includes a **context-aware AI Repair Assistant** (grounded in the current diagnosis — never a generic chatbot) and a **user dashboard** (devices, active/previous repairs, saved AI reports).

---

## 4. Target Users

| Persona | Who they are | What they need |
|---|---|---|
| **Home user / consumer** (primary) | Owns a phone, laptop, or appliance that just broke; not technical. | Plain-language answer: what's wrong, is it safe, is it worth fixing, who can fix it. |
| **Budget-conscious student / young professional** (primary) | Price-sensitive; weighs repair vs. replace carefully. | Clear cost + value comparison and the cheapest reliable nearby option. |
| **Non-technical / less-experienced user** | Needs safety guidance and trustworthy professionals, not jargon. | Safety-first troubleshooting and a vetted, trackable repair request. |
| **Repair professional / service provider** (secondary) | Local shops and technicians wanting verified demand. | Discoverable listing, incoming repair requests, status updates. *(Seeded demo providers for the hackathon; self-service onboarding is a future feature.)* |
| *(Future)* Small business fleet owner | Multiple devices to keep running. | Batch diagnostics and preferred-provider requests. |

---

## 5. Core User Journey (authoritative, step by step)

The complete experience, mirroring "what the user will actually do":

1. **Landing page** — the user opens RepairConnect AI and immediately sees the tagline *"Don't replace it. Repair it."* with a clear explanation of what the platform does. **Primary CTA: "Analyze My Item." Secondary CTA: "Find Repair Services."**
2. **Upload damaged item** — the user clicks *Analyze My Item* and can **upload an image**, upload a **supported video if feasible**, **optionally describe the problem**, and **select an item category if known** (e.g. a photo of a laptop with a cracked screen + "My laptop fell and the screen cracked").
3. **AI visual analysis** — the app sends the information to the AI, which identifies the **item/device type, visible damage, possible issue, severity, possible causes, confidence, and safe next steps** — distinguishing **visible observations** from **possible/inferred causes** and never claiming to see hidden internal damage.
4. **Basic troubleshooting** — the app shows **safe, non-destructive steps** ("Try these first") with an explicit danger notice (sparks, smoke, heat, battery swelling → stop and seek professional help). No dangerous electrical/high-voltage instructions are ever produced.
5. **Repair cost estimation** — the app shows a **₹ price band** (e.g. ₹7,000–₹10,000) with the factors behind it (damage type, device category, possible component, labor). The calculation is **application-side deterministic logic**, not LLM-invented math; the AI may *explain* the estimate but never computes it. All figures are clearly labeled estimates.
6. **Repair vs Replace** — the hero feature. The app compares estimated repair cost, replacement cost, device age, device value, severity, repairability, and parts availability, and shows a **Repair Cost Ratio** (e.g. 19%) and a verdict (🟢 REPAIR) with a plain-language **why**.
7. **Find nearby repair professionals** — the user taps *Find Repairers Near Me*; the app uses location services and a map to show providers by **distance, category/expertise, rating, estimated price, estimated repair time, and availability**.
8. **Smart repairer recommendation** — the app does not just list shops; it surfaces a **⭐ BEST MATCH** with transparent reasons (expertise, distance, rating, price, turnaround).
9. **Compare repair options** — a side-by-side table across distance, rating, estimate, time, and expertise, plus an explanation of the best overall match.
10. **Request repair** — the user selects a provider; the app creates a **repair request** (device, issue, AI preliminary diagnosis, selected provider, estimated cost) with status **Awaiting Confirmation**.
11. **Repair tracking** — the user tracks the repair through a status timeline: **Request Submitted → Repairer Confirmed → Device Received → Diagnosis Confirmed → Repair In Progress → Quality Check → Repair Completed**, with full status history.
12. **AI Repair Assistant** — a contextual assistant that understands the current repair context and answers questions like "Is this damage serious?", "Should I repair this?", "What should I ask the technician?", "Why did you recommend repairing it?" — never an unrelated generic chatbot.
13. **User dashboard** — **My Devices**, **Active Repairs**, **Previous Repairs**, and **Saved AI Reports** (revisitable diagnoses).

**Post-journey loop:** every diagnosis becomes a saved report; every request accumulates in history; the assistant can always refer back to the active diagnosis.

---

## 6. Core Features (P0 / P1 / P2 priority tiers)

Priority tiers follow the official MVP priority. **Do not sacrifice the P0 flow for P1/P2 features.**

### P0 — MUST WORK (the demo flow)

1. **Damage image upload** — image upload with client-side type/size validation (text description + optional category as companions).
2. **AI analysis** — server-side AI call (Cloud Function → OpenAI primary, Groq on failover) returning **structured JSON**; image + optional text.
3. **Diagnosis display** — detected device, visible damage, severity (Low/Medium/High/Critical), possible causes, confidence %, warnings — labeled **preliminary**.
4. **Safe basic troubleshooting** — safety-gated steps with an explicit danger notice.
5. **Repair cost estimate** — deterministic ₹ price band with visible contributing factors.
6. **Repair vs Replace** — deterministic verdict + decision score + **Repair Cost Ratio** + AI explanation.
7. **Nearby repairers** — Leaflet + OpenStreetMap map/list, category filter, distance sort (Haversine).
8. **Best Match recommendation** — transparent ranking with "why we recommend" reasons.
9. **Repairer comparison** — side-by-side table of 2–4 providers.
10. **Repair request** — create a request linked to diagnosis + device + provider (status: Awaiting Confirmation).
11. **Repair status tracking** — 7-step status timeline + status history.

### P1 — SHOULD WORK

- **Firebase Authentication** — email/password signup + login. *(P0 runs on invisible **anonymous auth** so the flow works end-to-end before signup UI exists; P1 adds real accounts.)*
- **User dashboard** — My Devices, Active Repairs, Previous Repairs, Saved AI Reports.
- **AI Repair Assistant** — context-aware chat grounded in a diagnosis.
- **Repair history** — chronological list of diagnoses + requests.

### P2 — NICE TO HAVE

- **Video upload** (conditional — depends on OpenAI/Groq model + Memcode storage support; image remains primary).
- **PDF repair report** export.
- **Saved devices** management UI (device library).
- **Sustainability estimates** (e-waste/CO₂ avoided by repairing).
- **Advanced personalization** (user-editable device age/price to refine recommendations).

### Future (explicitly out of scope for the hackathon)

- Advanced analytics dashboard.
- Self-service provider onboarding & provider dashboards.
- In-app payments / deposits.
- Email & push notifications (FCM).
- Parts availability / marketplace integration.
- Multi-language support.
- Warranty / insurance integrations.
- Community repair events (repair cafés).

### Non-goals (explicitly NOT building)

- Not a chatbot — analysis is structured and action-oriented; the assistant is one grounded screen.
- Not a static directory — discovery is tied to a diagnosis, a map, and a best-match engine.
- Not an image classifier — the AI output feeds a decision + connection pipeline, not just a label.
- Not a marketplace with payments (hackathon scope).
- No paid APIs (Google Maps, paid vision APIs, paid LLM tiers).

---

## 7. MVP Definition

The **smallest version that satisfies the official problem**:

> A user (signed in anonymously at P0, then with an account at P1) uploads a photo of a damaged item; a Cloud Function calls the primary AI (OpenAI, with Groq fallback) and returns a normalized structured diagnosis; the user sees possible causes, safe troubleshooting, a ₹ repair-cost band, and a repair-vs-replace verdict with a Repair Cost Ratio; they view seeded repair providers on a Leaflet/OSM map with a Best Match recommendation, compare providers, submit a repair request, and watch its status move through the timeline to completion — end to end, with no exposed secrets and no console errors.

**MVP scoping decisions (documented, not silent):**
- **Image** is the primary input. **Video** is conditional (P2): stored if feasible, analyzed only if the selected AI model supports it — otherwise a still frame or the text description is analyzed.
- **Seed data** provides ~8–12 realistic providers around a demo region; provider self-service is future work.
- **One AI call per analysis** (image + optional text → structured JSON); the assistant is a follow-up (P1).
- **Deterministic engines** (estimate, repair-vs-replace, best-match ranking) run server-side — the LLM never computes prices, ratios, or rankings.
- **Currency: INR (₹)** — consistent with the official examples and the target region.

---

## 8. Advanced Features (if time permits)

1. **Context-aware AI Repair Assistant** — multi-turn chat referencing the active diagnosis as system-prompt context.
2. **PDF repair report** — exportable structured summary (diagnosis + recommendation + next steps).
3. **Best Match refinement** — show per-factor scores and let the user re-weight (e.g. "prioritize speed").
4. **Personalized recommendations** — user-editable device age/purchase price for a sharper repair-vs-replace verdict.

---

## 9. Hackathon Success Criteria (measurable)

| # | Criterion | Measurable pass condition |
|---|---|---|
| 1 | Complete working user flow | One uninterrupted demo run: upload → analysis → diagnosis → troubleshooting → estimate → repair-vs-replace → map → best match → comparison → request → status update, no manual DB edits. |
| 2 | AI analysis works | ≥ 90% of demo uploads return valid, parseable structured JSON within ~20s; graceful fallback on failure. |
| 3 | Repair recommendation works | Every diagnosis renders a verdict + decision score + Repair Cost Ratio + estimated repair band + replacement value. |
| 4 | Best Match works | Exactly one provider is flagged ⭐ BEST MATCH with ≥ 3 "why" reasons consistent with the ranking inputs. |
| 5 | Repairers can be discovered | ≥ 5 seeded providers appear on the Leaflet map for the demo location; category filter + distance sort work. |
| 6 | Repair options can be compared | ≥ 3 providers comparable on distance, rating, estimate, time, expertise. |
| 7 | Repair status can be tracked | Status moves through the 7-step flow and persists to Firestore + status history. |
| 8 | Application is responsive | Usable 360px → 1440px; no horizontal scroll; touch-friendly controls. |
| 9 | No exposed API keys | `GROQ_API_KEY` appears **nowhere** in frontend assets; keys live only in Cloud Function secrets. |
| 10 | No critical console/runtime errors | Demo flow runs with 0 uncaught console errors; all async failures handled. |
| 11 | Data isolation works | A different user cannot read another user's diagnoses/requests (Firestore rules verified). |
| 12 | ₹0 implementation cost | Only free/free-tier services used; any paid service is documented as an Optional Future Enhancement. |

---

## 10. Current Implementation Status

Status vocabulary used across all documentation: **✅ IMPLEMENTED** (working in the current project) · **🎭 DEMO / MOCK** (frontend demo data / simulated behavior) · **🟡 PLANNED** (architecturally selected, not built) · **🔮 FUTURE** (possible, not finalized).

| Area | Status | Notes |
|---|---|---|
| Landing / Login / Signup / About | ✅ Implemented | Static pages; login/signup are simulated (no real auth) |
| Dashboard | ✅ Implemented / 🎭 Demo | Rendered from `data/` demo data |
| Analyze (upload UI + simulated analysis) | ✅ Implemented / 🎭 Demo | Real file preview + validation; AI step simulated |
| Diagnosis | ✅ Implemented / 🎭 Demo | Structured demo diagnosis |
| Repair vs Replace | ✅ Implemented / 🎭 Demo | Deterministic-feel result from demo data |
| Repairer discovery (map placeholder) | ✅ Implemented / 🎭 Demo | Demo providers + Leaflet-ready map shell |
| Comparison / Request / Tracking / Assistant | ✅ Implemented / 🎭 Demo | Demo data end-to-end |
| Profile | ✅ Implemented / 🎭 Demo | Fictional demo user |
| Design system, animations, SEO, a11y, responsive | ✅ Implemented | Verified via `npm run audit` (0 overflow/errors) |
| Screenshot + recording system | ✅ Implemented | `scripts/` (Playwright) |
<<<<<<< HEAD
| **Demo / Judge access** | ✅ Implemented / 🎭 Demo | Emails shown; passwords managed privately in Firebase Console |
=======
| **Demo / Judge access ("Try Demo")** | ✅ Implemented / 🎭 Demo | Clearly labelled; no real account |
>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356
| Firebase Authentication | 🧩 Implemented (code) | Deploy + config required; demo fallback active |
| Cloud Firestore | 🧩 Implemented (code) | Schema in DATABASE_SCHEMA.md; demo fallback active |
| **Memcode** media storage | 🧩 Adapter only | **PRIMARY STORAGE** — official docs verification pending |
| Firebase Storage | 🧩 Implemented (code) | **BACKUP STORAGE** — deploy required |
| Firebase Cloud Functions | 🧩 Implemented (code) | `analyzeRepair`, `assistant` (secure AI backend) |
| **OpenAI** AI | 🧩 Implemented (code) | **PRIMARY AI** — key required |
| **Groq** AI | 🧩 Implemented (code) | **BACKUP AI** (failover) — key required |
| Leaflet + OpenStreetMap + Geolocation | ✅ Implemented | Live map + permission-gated geolocation |
| Real repair-provider data | ⚪ Not selected | Demo data only |
| PDF report, provider self-service, notifications, dark mode | 🔮 Future | |

### 10.1 Demo functionality (current)
- Upload/preview/validation of a damage image; simulated "Analyzing…" animation (clearly labelled as a demo simulation — no real AI request).
- Full guided journey on demo data: diagnosis → repair-vs-replace → repairers → comparison → request (success state) → tracking timeline → assistant (canned answers) → dashboard/history.
<<<<<<< HEAD
- App pages require Firebase authentication (auth gate redirects unauthenticated visitors to Login; no guest/demo bypass).
=======
- "Try Demo" entry points on the landing page and login page (no account required, no real auth).
>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356

### 10.2 Backend (implemented in code — deployment requires credentials)
The backend is **implemented in code and tested**: Firebase Authentication wiring, Firestore data service, and the secure AI backend — Cloud Functions `analyzeRepair` + `assistant` (OpenAI primary → Groq failover, structured normalization, deterministic recommendation, per-user rate limiting) — with Firestore rules. It activates once real project credentials are supplied and deployed (see BUILD_PLAN.md and README "Backend setup"). Memcode + Firebase Storage backup are a later phase.

### 10.3 Future functionality
Video analysis (conditional on model + storage support), PDF repair reports, provider self-service onboarding, email/SMS notifications, dark mode, sustainability metrics.

---

## 11. Demo & Judge Access

<<<<<<< HEAD
- Demo accounts are real **Firebase Authentication** accounts created manually in Firebase Console:
  - **Demo User** — `demo@repairconnect.ai` (normal customer workflow)
  - **Demo Judge** — `judge@repairconnect.ai` (reviewer workflow)
- The two demo/judge **passwords are intentionally public test credentials** displayed in the login page's DEMO ACCESS block (with "Use Demo User" / "Use Demo Judge" buttons that fill the form). They are **not** production secrets and hold synthetic sample data only. Sign-in always goes through Firebase Authentication — there is no guest/demo bypass. No production passwords are ever stored or displayed.
- Demo data is **clearly fictional**: demo user "Alex Demo", demo providers (FixPoint, TechCare, Device Doctor, VoltFix, GreenRepair Hub) are **not real businesses**; demo diagnosis is simulated, **not** real AI output.
- Demo data is classified **🎭 DEMO / MOCK**. It provides **no** access to production data, credentials, or admin surfaces.
=======
- **"Try Demo"** button on the landing page and login page enters Demo Mode (sample data, no account).
- **Fictional demo credentials** (illustrative for the simulated login UI — the form currently simulates success for any input; no real accounts exist and none are created during documentation):
  - **Demo User** — `demo@repairconnect.ai` / `Demo@12345` (normal customer workflow)
  - **Demo Repairer** — `repairer@repairconnect.ai` / `Repair@12345` (repairer-side workflow, if the UI supports it)
- Demo data is **clearly fictional**: demo user "Alex Demo", demo providers (FixPoint, TechCare, Device Doctor, VoltFix, GreenRepair Hub) are **not real businesses**; demo diagnosis is simulated, **not** real AI output.
- Demo mode is classified **🎭 DEMO / MOCK** until real authentication exists. It provides **no** access to production data, credentials, or admin surfaces.
>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356

---

## 12. Development Rules (authoritative — copied verbatim, with the storage provider updated per the current architecture)

These rules govern the entire project and must be followed during implementation:

1. Do not rebuild or change the agreed architecture without approval.
2. Do not introduce React/Next.js/Vue/etc.
3. Use HTML/CSS/Vanilla JavaScript.
4. Use Firebase for authentication and database; use Memcode for primary media storage and Firebase Storage for backup.
5. Use OpenAI as primary AI and Groq as backup AI.
6. Keep OpenAI and Groq credentials server-side.
7. Use free/free-tier services wherever possible.
8. Do not introduce paid APIs.
9. Use Leaflet + OpenStreetMap for maps.
10. Build the MVP before advanced features.
11. Do not create fake AI claims.
12. Clearly label AI diagnosis as preliminary when appropriate.
13. Do not expose secrets.
14. Keep the application responsive.
15. Do not add unnecessary dependencies.
16. Do not generate application source code during this documentation phase.

---

## 13. Terminology (shared vocabulary — used consistently across all documents)

| Term | Meaning |
|---|---|
| **Diagnosis** | The structured AI result for one analysis (device, damage, severity, causes, troubleshooting, repairability, confidence, warnings). |
| **Recommendation** | The deterministic repair-vs-replace verdict + decision score + Repair Cost Ratio + cost figures, attached to a diagnosis. |
| **Repair Cost Ratio** | `estimated_repair_cost / replacement_value`, shown as a percentage (e.g. 19%). |
| **Best Match** | The top-ranked provider from the deterministic ranking engine (distance, price, rating, expertise, turnaround), shown with reasons. |
| **Provider** | A repair professional/service (seeded demo data). |
| **Repair request** | A user's request to a specific provider for a specific diagnosis/device; initial status is **Awaiting Confirmation**. |
| **Status timeline** | The append-only event log of a request's status changes (`repairStatusHistory`). |
| **Severity** | Internal enum `minor`, `moderate`, `major`, `severe` — displayed as **Low / Medium / High / Critical**. |
| **Confidence** | AI confidence stored as 0.0–1.0, displayed as a percentage (e.g. 89%). |
| **Repairability** | `repair_recommended`, `consider_repair`, `replace_recommended`. |
| **Preliminary** | Persistent label: "AI-generated preliminary analysis — confirm with a professional." |
| **Estimate engine** | Deterministic Cloud Function that converts category + severity into a ₹ repair-cost band. |
| **Ranking engine** | Deterministic Cloud Function that scores providers for Best Match. |
| **Anonymous auth** | Invisible P0 identity so the demo flow works before signup UI exists (P1). |
