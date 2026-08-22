# RepairConnect AI — UI/UX Specification

**Document:** UI_UX_SPEC.md
**Status:** Approved baseline (pre-implementation)
**Last updated:** 2026-08-22

This document defines the complete user interface before any code is written. It specifies 14 screens, a shared design system, and behavior for empty/loading/error states.

---

## 1. Design Direction

The product must look like a **real production-quality consumer platform** — a complete repair ecosystem, not a generic AI chatbot.

| Attribute | How we achieve it |
|---|---|
| **Modern** | Clean cards, subtle elevation, restrained color, no dated gradients. |
| **Clean** | Generous whitespace, minimal chrome, one primary action per screen. |
| **Trustworthy** | Persistent "preliminary AI" labels, transparent reasoning, visible data sources, clear warnings. |
| **Professional** | Consistent type scale, aligned grids, structured data over wall-of-text. |
| **Responsive / mobile-first** | Single-column mobile → 2-col tablet → wider desktop. |
| **Accessible** | WCAG AA contrast, focus rings, labels on all inputs, alt text, keyboard navigable. |
| **Intuitive** | One guided flow; every result screen has a clear "next step" CTA. |
| **Visually impressive, AI-powered without looking like a chatbot** | Purposeful AI moments (scan, analysis progress, structured verdict) instead of a chat window; the assistant is one screen of fourteen. |
| **Communication** | Trust + Technology + Sustainability + Practicality. |

**Animation rule:** subtle transitions only (fade/scale < 200ms, one skeleton loader). **Avoid excessive animations and unnecessary visual complexity.**

---

## 2. Design System

### 2.1 Color tokens

| Token | Value (reference) | Use |
|---|---|---|
| `--brand` | Teal/green `#0F766E` | Primary actions, links, active nav (repair/renew). |
| `--brand-dark` | `#115E59` | Hover/active states. |
| `--ink` | `#0F172A` | Headings, body text. |
| `--muted` | `#64748B` | Secondary text, captions. |
| `--surface` | `#FFFFFF` | Cards, panels. |
| `--bg` | `#F8FAFC` | Page background. |
| `--border` | `#E2E8F0` | Dividers, card borders. |
| `--success` | `#16A34A` | Completed, 🟢 REPAIR, "Completed" status. |
| `--warn` | `#D97706` | Warnings, "consider" verdict, medium confidence, in-progress. |
| `--danger` | `#DC2626` | Errors, Critical severity, replace verdict, dangerous-symptom notices. |
| `--info` | `#2563EB` | Informational callouts, active stages. |

### 2.2 Typography

- Sans-serif system stack: `-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial`.
- Scale: `display 32/40`, `h1 24/32`, `h2 20/28`, `h3 16/24`, `body 15/24`, `caption 13/20`, `micro 12/16`.
- Numbers/prices: tabular figures where aligned (comparison tables).

### 2.3 Spacing & layout

- 4px base grid; scale: `4, 8, 12, 16, 24, 32, 48, 64`.
- Content max-width `1200px`; cards `8px` radius; buttons `8px`; focus ring `2px` brand outline with 2px offset.
- Breakpoints: `< 640px` mobile (single column), `640–1024px` tablet (2-col), `> 1024px` desktop (grids).

### 2.4 Components

| Component | Spec |
|---|---|
| **Buttons** | `primary` (brand, filled), `secondary` (outline), `ghost` (text). Min tap target 44×44px. Disabled + loading variants (spinner replaces label). |
| **Cards** | White surface, 1px border, subtle shadow; header + body + optional footer actions. |
| **Forms** | Label above input; inline validation messages; error text `--danger`; required asterisks; autocomplete attributes. |
| **Status indicators** | Pill badges with dot + label per the official lifecycle: `submitted` gray ("Request Submitted"), `accepted` info, `received` info, `diagnosis_confirmed` info, `in_progress` warn ("Repair In Progress"), `ready_for_pickup` info, `completed` success, `declined`/`cancelled` danger. Verdicts reuse the palette (🟢 REPAIR = success, ⚪ consider = warn, 🔴 replace = danger). |
| **Alerts** | Four variants — info / warning / danger / success — icon, title, body, optional dismiss. AI `warnings` render as `warning` alerts; dangerous-symptom notices render as `danger` alerts. |
| **Navigation** | Top bar (logo + primary CTA on public pages); bottom tab bar on mobile inside the app (Dashboard, Scan, Map, History, Profile); top nav on desktop. |

### 2.5 Accessibility requirements

- Contrast ≥ 4.5:1 for text; all icons labeled (`aria-label`).
- Keyboard: all interactive elements focusable and operable; skip-to-content link.
- Map is supplementary: all provider info is also available in the accessible list view.
- Form errors announced via `aria-live` regions.

---

## 3. Screens

Each screen documents: **Purpose / Main components / User actions / Information displayed / Empty state / Loading state / Error state / Mobile behavior.**

### 3.1 Landing Page
- **Purpose:** communicate the platform in one screen and start the journey.
- **Components:** hero with tagline *"Don't replace it. Repair it."*, one-line explanation (diagnose → decide → find & track), "How it works" (Scan → Decide → Fix), trust strip (free, privacy-first, preliminary-AI note). **Primary CTA: "Analyze My Item." Secondary CTA: "Find Repair Services."**
- **Actions:** Primary → upload flow (sign-in/anonymous bootstrap then upload); Secondary → nearby repairers map.
- **Info:** tagline, value props, how-it-works.
- **Empty/Loading/Error:** N/A (static).
- **Mobile:** stacked hero, thumb-friendly CTAs.

### 3.2 Login
- **Purpose:** authenticate existing users (Firebase email/password + Google).
- **Components:** "Welcome Back" heading, **Continue with Google** (real Firebase popup), email + password with **show/hide password** toggle, **Remember me** (LOCAL vs SESSION persistence), **Forgot password**, primary "Log in", link to Signup.
<<<<<<< HEAD
- **Demo access:** a clearly-labelled **DEMO ACCESS** block shows the two demo account emails **and their intentionally public test passwords** (with small copy buttons) plus **"Use Demo User" / "Use Demo Judge"** buttons that fill the form. Sign-in always goes through Firebase Authentication (no guest/bypass path). These are demo/test credentials only — no production passwords are ever shown.
=======
- **Demo access:** a clearly-labelled **DEMO ACCESS** block shows the public test credentials with **"Use Demo User" / "Use Demo Judge"** buttons that auto-fill the form (they do **not** bypass authentication), plus an "Explore demo without an account" path.
>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356
- **Info:** inline validation errors; friendly Firebase error mapping.
- **Loading:** button spinner during auth; duplicate submissions prevented.
- **Error:** invalid credentials / network / popup-closed / popup-blocked mapped to friendly text.
- **Mobile:** full-width fields, large tap targets, demo rows wrap.

### 3.3 Signup
- **Purpose:** create an account (Firebase email/password + Google).
- **Components:** name + email + password + confirm (each password field has a **show/hide toggle**), **Terms acceptance checkbox** (required), primary "Create account", "Continue with Google", link to Login.
- **Validation:** name, email format, password ≥ 8 chars, confirm match, terms acceptance — all with clear inline messages.
- **Loading/Error:** as Login.

### 3.4 Dashboard
- **Purpose:** authenticated home; devices, repairs, and saved reports at a glance.
- **Components:** greeting; sections **My Devices** (💻 Laptop, 📱 Phone, 🎧 Headphones), **Active Repairs** (e.g. "Laptop Screen — 🟡 Repairing"), **Previous Repairs** (e.g. "Phone Battery — 🟢 Completed"), **Saved AI Reports** (revisitable diagnoses); primary CTA "New analysis"; quick links (Nearby repairers, AI Assistant).
- **Info:** recent diagnoses with severity + verdict badges; active/previous requests with status badges.
- **Empty:** friendly first-run state ("Upload your first damaged item").
- **Loading:** skeleton cards while fetching.
- **Error:** retry panel if Firestore read fails.
- **Mobile:** sections stack; primary CTA pinned near bottom.

### 3.5 Damage Upload / Analysis
- **Purpose:** capture the damaged item and trigger analysis.
- **Components:** drag-and-drop / tap-to-upload zone (`accept="image/*"`; optional video note), preview thumbnail (e.g. `laptop_damage.jpg`), optional text description ("What happened?"), optional **item category** selector, optional device picker, "Analyze Damage" primary.
- **Info:** accepted types + max size hint (see SECURITY.md §4); video "if feasible" hint.
- **Loading:** upload progress bar → analysis progress ("AI is examining the damage…").
- **Error:** invalid type/size (blocked client-side), upload failure, analysis failure — each with retry, input preserved.
- **Mobile:** camera capture via `capture` attribute; large drop zone.

### 3.6 AI Diagnosis
- **Purpose:** show the structured AI result.
- **Components:** persistent "preliminary AI analysis" banner; **AI ANALYSIS** card (Device, Visible issue, Severity — Low/Medium/High/Critical, Possible causes with visible-vs-inferred tags, Confidence %); **TRY THESE FIRST** troubleshooting accordion with per-step safety notes; ⚠️ dangerous-symptom notice; warnings alerts; "see a professional" callout when advised; CTA "Get repair estimate →".
- **Info:** all normalized JSON fields (AI_SPEC §2.2).
- **Loading:** skeleton while waiting for `analyzeRepair`.
- **Error:** "Could not analyze" panel with retry and text-only fallback.
- **Mobile:** accordions; badges wrap; CTAs full-width.

### 3.7 Repair vs Replace
- **Purpose:** the money decision (hero feature).
- **Components:** verdict hero card (🟢/⚪/🔴 verdict + decision-score meter), **Repair Cost Ratio** (e.g. 19%), two-column comparison (Estimated Repair vs Estimated Replacement), factor chips (age, severity), "Estimated based on" factors list, AI explanation block (labeled "AI explanation"), CTA "Find Repairers Near Me →".
- **Info:** estimated repair band (₹), replacement value (₹), ratio, score, verdict, explanation.
- **Loading:** skeleton while `getRecommendation` runs.
- **Error:** retry; recommendation re-derivable from stored diagnosis.
- **Mobile:** stacks; score meter horizontal.

### 3.8 Nearby Repairers
- **Purpose:** discover professionals on a map with a smart recommendation.
- **Components:** Leaflet map with provider markers + user pin; **⭐ BEST MATCH** card with "Why we recommend it" bullets; list view toggle; category filter chips; radius control; provider cards (name, 📍 distance, 💰 price range, ⏱ time, category/expertise, rating, availability).
- **Info:** distance (Haversine), rating, price range, turnaround, availability, best-match reasons.
- **Empty:** "No providers in this area" → widen radius / clear filter.
- **Loading:** map tile + list skeleton; list still functional if tiles fail.
- **Error:** geolocation denied → manual location / "show all" fallback.
- **Mobile:** map on top (collapsible), list below; tap marker → card scrolls into view.

### 3.9 Repairer Comparison
- **Purpose:** decide between selected providers.
- **Components:** comparison table (2–4 columns) across **Distance, Rating, Estimate, Time, Expertise**; "Best overall match" explanation; "Request repair" per provider; back to map.
- **Info:** side-by-side attributes (e.g. FixPoint vs TechCare vs Device Doctor).
- **Empty:** prompt to select providers on map first.
- **Loading:** reuse provider data (already loaded) — minimal.
- **Error:** provider data refresh failure → show last-known with banner.
- **Mobile:** horizontal-scroll table or stacked cards; sticky first column.

### 3.10 Repair Request
- **Purpose:** confirm and submit a request.
- **Components:** summary (Device, Issue, AI Preliminary Diagnosis, Selected Provider, Estimated Cost, Status: **Awaiting Confirmation**), optional message field, "Send request" primary, cancel.
- **Info:** everything being committed to Firestore.
- **Loading:** spinner on submit.
- **Error:** submit failure → retry, nothing persisted.
- **Mobile:** single column summary.

### 3.11 Repair Tracking
- **Purpose:** live status of one request.
- **Components:** status pill, vertical timeline of the official lifecycle (Request Submitted → Repairer Confirmed → Device Received → Diagnosis Confirmed → Repair In Progress → Quality Check → Repair Completed), provider contact card, request details, notes list.
- **Info:** current status, timestamps, notes, contact info.
- **Loading:** skeleton + real-time listener.
- **Error:** read failure → retry banner.
- **Empty:** timeline shows at least the "Request Submitted" event.
- **Mobile:** vertical timeline; touch-friendly.

### 3.12 AI Repair Assistant
- **Purpose:** contextual Q&A about a diagnosis.
- **Components:** diagnosis context chip ("Discussing: cracked display — laptop"), chat thread, input box, disclaimer footer, suggested questions ("Is this damage serious?", "Should I repair this?", "What should I ask the technician?", "Why did you recommend repairing it?").
- **Info:** grounded answers about the active diagnosis.
- **Empty:** greeting + suggested questions.
- **Loading:** typing indicator while waiting for the Cloud Function.
- **Error:** assistant unavailable → retry; diagnosis context still shown.
- **Mobile:** full-height thread, input above keyboard.

### 3.13 Profile
- **Purpose:** manage account.
- **Components:** avatar, name, email, linked Google account (optional), saved devices (add/remove — P2), sign out.
- **Info:** profile + devices.
- **Empty:** no devices yet.
- **Loading/Error:** standard fetch states.
- **Mobile:** stacked sections.

### 3.14 Repair History
- **Purpose:** all past analyses and requests.
- **Components:** tab filter (Diagnoses / Requests), list items with severity/verdict/status badges, tap → open detail (diagnosis or tracking).
- **Info:** chronology of the user's journey.
- **Empty:** "No repairs yet."
- **Loading:** skeleton list.
- **Error:** retry panel.
- **Mobile:** list full-width.

---

## 4. Global states & feedback

- **Toast** for transient success (request sent, profile updated).
- **Consistent error pattern:** icon + message + retry action; never a bare `alert()`.
- **Persistent AI disclaimer** on all AI-derived screens (Development Rule #12).
- **Loading skeletons** instead of spinners for data regions; spinners only inside buttons.
- **Danger notice** (sparks / smoke / heat / battery swelling) is a reusable `danger` alert component used on diagnosis, troubleshooting, and assistant screens.

---

## 5. Page implementation status

| Screen | File | Status |
|---|---|---|
| Landing Page | `index.html` | ✅ Implemented |
<<<<<<< HEAD
| Login | `login.html` | ✅ Implemented / 🧩 Firebase auth (demo creds shown; no bypass) |
=======
| Login | `login.html` | ✅ Implemented / 🎭 Demo (simulated auth + "Try Demo") |
>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356
| Signup | `signup.html` | ✅ Implemented / 🎭 Demo (simulated) |
| Dashboard | `dashboard.html` | ✅ Implemented / 🎭 Demo (demo data) |
| Damage Upload / Analysis | `analyze.html` | ✅ Implemented / 🎭 Demo (real upload UI; simulated AI step) |
| AI Diagnosis | `diagnosis.html` | ✅ Implemented / 🎭 Demo (structured demo diagnosis) |
| Repair vs Replace | `repair-decision.html` | ✅ Implemented / 🎭 Demo |
| Nearby Repairers | `repairers.html` | ✅ Implemented / 🎭 Demo (demo providers + map placeholder) |
| Repairer Comparison | `compare.html` | ✅ Implemented / 🎭 Demo |
| Repair Request | `request-repair.html` | ✅ Implemented / 🎭 Demo (demo success state) |
| Repair Tracking | `tracking.html` | ✅ Implemented / 🎭 Demo (demo timeline) |
| AI Repair Assistant | `assistant.html` | ✅ Implemented / 🎭 Demo (canned answers) |
| Profile | `profile.html` | ✅ Implemented / 🎭 Demo (fictional "Alex Demo") |
| About | `about.html` | ✅ Implemented |

> 🟡 **Planned:** real Firebase Authentication, Firestore persistence, **Memcode (primary) + Firebase Storage (backup)** media, Cloud Functions, **OpenAI (primary AI) + Groq (backup AI)**, Leaflet/OSM live map, browser geolocation (see BUILD_PLAN.md).

---

## 6. Navigation, forms & states (implemented)

- **Navigation:** sticky responsive header + mobile hamburger; active-link highlighting; bottom CTA patterns on mobile.
- **Forms:** labelled inputs, inline validation errors (`aria-live`), autocomplete attributes, date/tel/select/textarea.
- **Upload interface:** drag-and-drop + file picker + preview + remove + client-side type/size validation.
- **Loading states:** skeletons + the animated "Analyzing your item…" scan overlay (demo-labelled).
- **Error states:** consistent icon + message + retry pattern; never blank screens.
- **Empty states:** friendly first-run dashboards and "no providers match" states.
- **Repair timeline:** 7-step vertical timeline with animated current node.
- **AI assistant:** chat thread, typing indicator, suggested-question chips.

---

## 7. Animation system (implemented)

Implemented in `css/animations.css` + `js/animate.js`:

- **Hero:** entrance + staggered text reveal + floating chips.
- **Scroll:** `IntersectionObserver` reveal on section/step/feature cards.
- **Micro-interactions:** button hover/press, card lift, input focus, drag-over, toggle, toast, modal, badge transitions.
- **Upload:** animated scan-frame (scan beam + grid) with a 5-step checklist (Uploading → Scanning → Analyzing → Identifying damage → Generating recommendation).
- **AI analysis:** demo-labelled; never claims a real AI request is occurring.
- **Repair timeline:** staggered reveal + pulsing current node.
- **Repairer map:** pin-drop animations + card reveals.
- **Assistant:** message entrance + typing dots + suggestion hovers.
- **Repair vs Replace:** count-up decision-score ring.
- **Reduced motion:** full `prefers-reduced-motion` support (CSS rule + JS guard).

---

## 8. SEO implementation (implemented)

- Unique `<title>` + meta description per page (e.g. *"RepairConnect AI — Don't Replace It. Repair It."*).
- `canonical` URLs, `robots` (public pages `index`, app pages `noindex`), Open Graph + Twitter/X card metadata, `theme-color`, favicon + apple-touch-icon.
- JSON-LD structured data (`WebSite` + `WebApplication`) on public pages — truthful fields only.
- `sitemap.xml` (public pages only) + `robots.txt` (blocks private app routes).
- Semantic HTML with a logical H1→H2→H3 hierarchy; 1200×630 branded `og-image.png`.
- Canonical domain placeholder `https://repairconnect-ai.vercel.app` — no production domain is configured yet; replace it with the actual deployed domain (Vercel is the current hosting target) on deploy.

---

## 9.5 Starting-page interactions (implemented — landing redesign pass)

- **Landing hero** — secondary CTA is now **"How It Works"** (primary "Analyze My Item", plus "Get Started" in the final CTA); the hero keeps the floating chips + animated mock analysis card.
- **Interactive repair journey** — an 8-step strip (Broken item → Upload → AI analysis → Diagnosis → Repair vs replace → Find repairer → Request repair → Track repair) that highlights on hover/click and updates a detail panel (keyboard-accessible `<button role="tab">`).
- **Demo preview** — a "See how it works" selector (Smartphone / Laptop / Appliance / Electronics / Audio) that renders a clearly-labelled **Demo Preview** workflow + example result.
- **Educational repair-vs-replace calculator** — sliders for repair cost, replacement cost, and item age produce an illustrative verdict + repair-to-value score, explicitly labelled as an educational demo (not advice).
- **Trust section** — six "why RepairConnect AI" cards (understand the problem, save money, reduce e-waste, connect locally, privacy-first, informed decisions).
- **8 feature cards** on the landing page (was 4): AI Damage Analysis, Troubleshooting, Repair vs Replace, Repairer Discovery, Repair Comparison, Repair Requests, Repair Tracking, AI Assistant.
- **How It Works page** — converted to interactive step navigation (9 steps, click to update the detail panel without reloading).
- **Features page** — regrouped into **AI Intelligence / Repair Ecosystem / User Experience**, each feature labelled Implemented / Demo-Mock / Planned.
- **Signup** — added a live **password strength meter** (Weak → Strong with colour bar).
- **Login** — the Google button shows a "Coming soon" badge when Firebase isn't configured (honest labelling, never a fake success).

## 10. Interactive enhancements (implemented, this pass)

- **Theme changer** in every header — Light / Dark / System; persisted in `localStorage`, applied before first paint (`js/theme-init.js`), follows `prefers-color-scheme`.
- **Standardized navigation** across all pages (public: Home/Analyze/Repairers/Assistant/About; app: Dashboard/Analyze/Repairers/Tracking/Assistant + avatar) with an active-page indicator and a theme toggle.
- **Rich footer** on every page (Product / Company / Resources / Technology columns, current year, theme-aware) — no dead links; Privacy & Terms pages added; Contact + FAQ sections on About.
- **AI analysis** — six-stage analysis overlay (Preparing Analysis → Inspecting Image → Identifying Possible Issues → Evaluating Severity → Preparing Recommendations → Analysis Complete) with the current stage surfaced as the headline.
- **Diagnosis** — added Visible observations, Repair estimate, Replacement estimate, and a Recommendation badge; cautious "preliminary" language throughout.
- **Repair vs Replace** — added Estimated lifespan and Environmental benefit cards alongside Repair Score / costs / ratio.
- **Repairer discovery** — added search, minimum-rating, and maximum-distance filters (plus existing category filter + sorting).
- **Comparison** — per-provider "Select Repairer" CTA.
- **Repair request** — added preferred-time field and stronger validation (date, phone, notes length).
- **Repair tracking** — interactive 7-step timeline (Request Submitted → Repairer Confirmed → Device Received → Diagnosis Confirmed → Repair In Progress → Quality Check → Repair Completed) with a clearly-labelled "Demo: advance status" control.
- **AI assistant** — user messages rendered as text (XSS-safe), 500-char limit, typing indicator, suggested prompts, empty/loading states.

## 11. Screenshot & recording system (implemented)

- **Script:** `scripts/screenshots.js` (screenshots) + `scripts/record-demo.js` (video).
- **Commands (actual, from `package.json`):**
  - `npm run screenshots` — desktop (1440×900 @2x) + mobile (390×844 @2x)
  - `npm run screenshots:desktop` / `npm run screenshots:mobile`
  - `npm run record` — full journey video → `recordings/demo.webm`
  - `npm run audit` — responsive/console/a11y audit
- **Output:**
  - `screenshots/*.png` — 11 desktop pages
  - `screenshots/mobile/*.png` — 5 mobile pages
  - `screenshots/showcase/*.png` — strongest 8 for GitHub
  - `recordings/demo.webm` — the demo journey video
- **Recording journey:** Landing → Analyze → Diagnosis → Repair vs Replace → Repairers → Comparison → Request (submit) → Tracking → Assistant (question) → Dashboard.
- **Validation:** non-blank checks, no secrets, no browser chrome, demo data only.
