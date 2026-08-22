# RepairConnect AI — AI Specification

**Document:** AI_SPEC.md
**Status:** Approved baseline (pre-implementation)
**Last updated:** 2026-08-22

This is a **primary** document. It defines exactly what the AI is allowed and expected to do, the structured output contract, safety rules, and the deterministic-vs-AI boundary.

> **Provider architecture:** **OpenAI API = PRIMARY AI · Groq API = BACKUP AI.** Both providers must return the same consistent, structured response; the Cloud Function normalizes the output, so **the frontend never depends on a provider-specific format** (see §8).

> **Implementation status:** 🧩 **Implemented in code** (Cloud Functions `analyzeRepair` + `assistant`, OpenAI primary → Groq failover, normalization + deterministic recommendation) — **not verified live** because `OPENAI_API_KEY`/`GROQ_API_KEY` are not present in this workspace. The frontend therefore still renders **clearly-labelled demo data** (`data/demo-diagnoses.js`); simulated results are never presented as real AI output. Both keys stay server-side (see §8).

---

## 1. AI Responsibilities

The AI (OpenAI primary, Groq on failover — both called server-side via Cloud Functions) assists with:

1. **Device identification** — what the item is (category, brand/model if visible).
2. **Visible damage identification** — what damage is visible in the image.
3. **Possible causes** — likely causes, clearly ranked and hedged.
4. **Damage severity** — normalized severity of visible damage.
5. **Safe basic troubleshooting** — non-destructive, low-risk steps only.
6. **Repair guidance** — general guidance about typical repair paths.
7. **Repair-vs-replace explanation** — plain-language rationale **for a verdict computed deterministically by the app** (the AI never computes the verdict).
8. **Repair report generation** — a readable summary assembled from structured fields.
9. **Conversational repair assistance** — the AI Repair Assistant, grounded in a diagnosis.

**The AI is explicitly NOT responsible for:** financial math, cost estimation, the Repair Cost Ratio, distance calculation, the repair-vs-replace decision itself, the Best Match ranking, or any claim of certainty about hidden damage.

---

## 2. AI Output Contract — Structured JSON

**Rule: structured JSON wherever possible. The server validates and normalizes every AI response before anything reaches the client.**

### 2.1 Base schema (required)

```json
{
  "device": "",
  "damage": "",
  "severity": "",
  "possible_causes": [],
  "troubleshooting": [],
  "repairability": "",
  "confidence": 0,
  "warnings": []
}
```

### 2.2 Adapted schema (what `analyzeRepair` returns to the client)

The base schema is extended with normalized enums and safety fields. Field types shown in parentheses.

```json
{
  "device": "Laptop (appears to be a 14-inch ultrabook)",  // string — free text
  "category": "laptop",                  // string — normalized enum (see §2.4)
  "brand": "",                           // string — only if confidently visible
  "model": "",                           // string — only if confidently visible
  "damage": "Cracked display, top-left corner",   // string — free text
  "damage_type": "cracked_screen",       // string — normalized enum (see §2.4)
  "severity": "major",                   // string — enum (displayed "High")
  "possible_causes": [                   // array<string> — visible vs inferred separated in copy
    "Display panel damage (visible)",
    "Display connector damage (possible, not visible)",
    "Internal display component damage (possible, not visible)"
  ],
  "troubleshooting": [                   // array<map> — safe steps only
    { "step": "Restart the device.", "safetyNote": "" },
    { "step": "Connect an external display if available.", "safetyNote": "" },
    { "step": "Check whether the device powers on.", "safetyNote": "" },
    { "step": "Check for additional visible damage.", "safetyNote": "" }
  ],
  "repairability": "consider_repair",    // string — AI's *initial* read (enum, see §2.4)
  "confidence": 0.89,                    // number 0.0–1.0 (displayed "89%")
  "warnings": [                          // array<string> — safety & limitation notes
    "This analysis is based only on visible damage and may miss internal issues.",
    "If you notice sparks, smoke, unusual heat, battery swelling, or other dangerous symptoms, stop using the device and seek professional help."
  ],
  "professionalInspectionAdvised": true  // boolean
}
```

### 2.3 Validation & normalization (server-side, in `analyzeRepair`)

| Check | Action |
|---|---|
| Response is not parseable JSON | One retry with a stricter "JSON only" prompt; then return a typed error. |
| `severity` not in enum | Map to closest allowed value; default `moderate`. |
| `category`/`damage_type` not in enum | Map to `other`. |
| `confidence` out of range | Clamp to `[0, 1]`. |
| `troubleshooting` contains steps flagged unsafe | **Strip them** and append a `warnings` entry pointing to professional inspection. |
| Missing required fields | Fill with empty-safe defaults (`""`, `[]`, `0`) — never crash. |
| `warnings` empty | Inject the standard disclaimer (see §4.1). |

### 2.4 Normalized enums

| Field | Allowed values |
|---|---|
| `category` | `smartphone`, `laptop`, `tablet`, `desktop`, `tv`, `home_appliance`, `wearable`, `audio`, `camera`, `other` |
| `damage_type` | `cracked_screen`, `battery`, `water_damage`, `charging_port`, `camera`, `speaker`, `software`, `cosmetic`, `not_powering_on`, `overheating`, `other` |
| `severity` | `minor`, `moderate`, `major`, `severe` — **displayed as Low / Medium / High / Critical** |
| `repairability` | `repair_recommended`, `consider_repair`, `replace_recommended` |

---

## 3. AI Safety (binding)

The AI **must**:

1. **Distinguish visible observations from assumptions** — say "the image shows X" vs. "this may indicate Y"; label possible causes accordingly (the example in §2.2 tags each cause `(visible)` vs `(possible, not visible)`).
2. **Never claim certainty about hidden hardware damage** — hedge: "internal damage cannot be ruled out from this image".
3. **Recommend professional inspection when appropriate** — any time internal/hidden damage is plausible, battery swelling, water ingress, mains power, or high voltage is involved.
4. **Never provide dangerous electrical repair instructions** — no guidance on opening mains-powered appliances, no capacitor/PSU work, no live-wire steps.
5. **Never encourage users to open dangerous or high-voltage equipment** — including microwave ovens, CRTs, mains wiring, EV/high-capacity batteries.
6. **Include appropriate warnings for potentially hazardous situations** — every response touching batteries, heat, liquids, or electricity carries a warning, including the standard notice: *"If you notice sparks, smoke, unusual heat, battery swelling, or other dangerous symptoms, stop using the device and seek professional help."*

**Hard safety list (never output as a "safe" step):** discharging capacitors, working on live mains, opening sealed high-voltage devices, puncturing/removing swollen batteries, applying heat near batteries, bypassing safety interlocks.

---

## 4. Repair vs Replace — Deterministic Logic (not LLM math)

**Rule: the application performs deterministic calculations. The LLM is never asked to invent financial numbers.**

### 4.1 Inputs

| Input | Source | Required |
|---|---|---|
| Device age (years) | `devices.age` or user input | ⬜ (default 2) |
| Original/current value | `devices.purchasePrice` or user input | ⬜ (default by category) |
| Estimated repair cost | **Estimate engine** (deterministic) | ✅ |
| Replacement cost | Current market value estimate (default table by category) | ✅ |
| Damage severity | Diagnosis `severity` | ✅ |
| Availability of repair/parts | Assumed "available" at hackathon; a `partsUncertain` flag reduces the score | ⬜ |

### 4.2 Deterministic estimate engine

```
repair_cost_band = BASE_COST[category] × SEVERITY_MULTIPLIER[severity]
```
- `BASE_COST` = a small reference table per category (₹ values, e.g. laptop screen ≈ higher base; smartphone screen ≈ lower base). **Values live in the Cloud Function, tuned at build time.**
- `SEVERITY_MULTIPLIER` = `minor: 0.5, moderate: 1.0, major: 2.0, severe: 3.0`.
- Result is always a **band** `{min, max}` (±30% around the point estimate, in ₹) so the UI never presents a false-precision number.

### 4.3 Deterministic decision score + Repair Cost Ratio

```
repair_cost_ratio = estimated_repair_cost / replacement_value   (displayed as %)

decision_score = 100 − (repair_cost_ratio × 100)
decision_score −= 10 if severity == severe
decision_score −= 10 if age > 5 years
decision_score += 5  if age < 1 year
decision_score = clamp(decision_score, 0, 100)

verdict:  score >= 70 → repair_recommended
          40 <= score < 70 → consider_repair
          score < 40 → replace_recommended
```

> This is the **reference rule set**; exact coefficients are finalized at build time in the Cloud Function. The formula is deterministic, documented, and unit-testable.

### 4.4 AI's role in Repair vs Replace

The AI receives the **computed** verdict + score + Repair Cost Ratio + cost figures and writes a 2–4 sentence explanation that: names the verdict, cites the repair cost vs. replacement value (and ratio), and ends with the recommended next action (e.g. "compare local repairers"). It must **not** contradict the computed numbers and must not make unsupported claims.

---

## 5. Smart Repairer Recommendation (Best Match)

**Rule: the ranking is deterministic and transparent. The AI may only phrase the "why we recommend" bullets — it never picks the winner.**

```
match_score = 0.30 × distance_score      (closer = higher)
            + 0.25 × price_score         (lower = higher)
            + 0.20 × rating_score        (higher = higher)
            + 0.15 × expertise_score     (category match = higher)
            + 0.10 × turnaround_score    (faster = higher)
```
- Each factor is normalized to 0–1 before weighting.
- The highest `match_score` is the **⭐ BEST MATCH**.
- The top contributing factors become the "Why we recommend it" bullets (e.g. "Strong laptop expertise", "Closest suitable provider", "Good rating", "Competitive estimated price", "Fast turnaround").
- **Transparency requirement:** the UI shows the factors (not necessarily the raw weights) so the recommendation is explainable.

> AI's optional role: rewrite the factor bullets into a single friendly sentence. The ranked order itself is **never** AI-decided.

---

## 6. Prompting Specifications

> **Model names are not hardcoded — for either provider.** Specific OpenAI and Groq models are selected only after their current vision capability is verified at build time. All prompts are written model-agnostic and reference the configured model per provider via config (`OPENAI_VISION_MODEL`, `GROQ_VISION_MODEL`).

### 6.1 System prompt (analysis) — requirements

The system prompt must establish:
- Role: a careful repair-triage assistant that is safety-first and honest.
- Output format: **JSON only**, matching the schema in §2.2, no prose outside the JSON.
- Safety: the rules in §3, restated as instructions.
- Honesty: describe only what is visible; tag each possible cause as `(visible)` or `(possible, not visible)`; never invent details; set low confidence when unsure.
- Enum vocabulary: provide the exact allowed values from §2.4.
- A final instruction: if the image is not a repairable object (person, document, meme), return a typed "unable to analyze" JSON with an explanatory `warnings` entry.

### 6.2 Image-analysis prompt — requirements

- Pass the image bytes (vision-capable model) plus optional user text description and optional category.
- Ask for: device, category, brand/model (only if visible), damage, damage_type, severity, possible_causes (≤5, each tagged visible/inferred), safe troubleshooting steps (≤5, each with an optional safetyNote), initial repairability, confidence (0–1), warnings, professionalInspectionAdvised.
- Constrain troubleshooting: "non-destructive, no disassembly, no mains/high-voltage work".

### 6.3 Troubleshooting prompt — requirements

- Only basic, safe, reversible steps the *owner* can perform (restart, connect external display, check whether it powers on, check for additional visible damage, back up data, stop using if hot/swollen).
- Every step tagged with `safetyNote` when any hazard exists.
- Any step beyond "basic" is replaced with: "This requires professional inspection."

### 6.4 Repair-vs-replace explanation prompt — requirements

- Input: computed `verdict`, `decisionScore`, `repairCostRatio`, `estimatedRepairCost`, `replacementValue`, device age/severity.
- Output: 2–4 plain-language sentences (string only).
- Must match the computed verdict exactly; must not invent new prices; must not make unsupported claims.

### 6.5 Assistant (chat) prompt — requirements

- Input: the active diagnosis JSON + recent conversation.
- Grounding: answer only about the current diagnosis/repair context; politely decline off-topic requests.
- Expected question types: "Is this damage serious?", "Should I repair this?", "What should I ask the technician?", "What does this diagnosis mean?", "What should I do before taking it for repair?", "Why did you recommend repairing it?".
- Tone: concise, practical, safety-first.
- If asked for prices/decisions: refer to the stored `recommendation`, never recompute.
- Always re-affirm the "preliminary AI analysis" label when giving opinions on damage.

---

## 7. Output handling in the UI

- The UI renders only the **normalized JSON** returned by `analyzeRepair` — never raw model text.
- Diagnosis screens carry the persistent label: **"AI-generated preliminary analysis — confirm with a professional before acting."**
- `confidence` is displayed as a percentage (`0.89` → **89%**) with a coarse badge: High (≥80%), Medium (50–80%), Low (<50%).
- `severity` is displayed with friendly labels: `minor`→Low, `moderate`→Medium, `major`→High, `severe`→Critical.
- `warnings` render as visible alert boxes; `professionalInspectionAdvised` forces a highlighted "see a professional" callout.

---

## 8. AI Provider Integration Contract (OpenAI primary · Groq backup)

### 8.1 Key handling (binding)

- `OPENAI_API_KEY` (primary) and `GROQ_API_KEY` (backup) live **only** in the Cloud Function environment (`functions/.env`, gitignored, or Firebase Cloud Functions secrets). All variables are centralized in the root `.env` / `.env.example` (see [`API_CONFIGURATION.md`](API_CONFIGURATION.md)).
- They must **never** appear in HTML, CSS, frontend JavaScript, the Git repo, the README, screenshots, recordings, or any client-side environment variable.
- The frontend **never calls OpenAI or Groq directly** — every AI request goes browser → Cloud Function → (OpenAI → Groq on failover) → (validate/normalize) → browser.

### 8.2 Model selection (not hardcoded)

- **Do not assume a specific model for either provider.** Before implementation, verify which currently-available OpenAI and Groq models support the required **image (vision)** workflow.
- Reference models via config (`OPENAI_VISION_MODEL`, `GROQ_VISION_MODEL`) rather than literal names.
- If no vision-capable model is available, the documented fallback is text-description analysis (UI makes the text path first-class).

### 8.3 AI provider failover (planned)

```
Frontend → Cloud Function → OpenAI API (PRIMARY)
                              ↓ if a defined fallback condition occurs
                            Groq API (BACKUP)
                              ↓
                    normalized structured response → Frontend
```

**Fallback conditions (finalized during implementation):** OpenAI unavailable · request failure · configured timeout · temporary provider error · configured quota/rate-limit failure. **Do not retry endlessly** — bounded attempts, then a typed error.

**Transparency rule:** the frontend must not need to know which provider generated a response. The backend exposes one consistent response format.

### 8.4 AI response standard (both providers)

The backend normalizes both providers' output to one consistent structure before sending it to the frontend. Conceptual fields (finalized schema lives in §2.2, which this maps onto):

```
{
  observations,             // what is visible
  possibleCauses,           // possible/inferred causes
  confidence,               // 0.0–1.0
  severity,                 // minor | moderate | major | severe
  troubleshooting,          // safe steps
  repairRecommendation,     // repair_recommended | consider_repair | replace_recommended
  repairEstimate,           // deterministic — computed by the app, never by the AI
  replacementEstimate,      // deterministic
  safetyWarnings            // string[]
}
```

- **`repairEstimate` / `replacementEstimate` / the verdict are deterministic app-side values** — the AI only *explains* them (see §4).
- The exact implementation schema is finalized during integration; the frontend renders only the normalized JSON (§2.2), never provider-specific formats.

### 8.5 Cloud Function endpoints (planned)

| Function | Input | Output | AI usage |
|---|---|---|---|
| `analyzeRepair` | `{ imageBase64, textDescription?, category? }` | normalized diagnosis JSON (§2.2) | image + text → structured diagnosis (OpenAI primary, Groq fallback) |
| `getRecommendation` | `{ diagnosis, device? }` | `recommendation` map | **explanation only** — costs/verdict are deterministic |
| `rankProviders` | `{ userLat, userLng, category, providers }` | ranked list + best match + reasons | optional phrasing of reasons — ranking is deterministic |
| `assistant` | `{ diagnosis, history, message }` | assistant reply string | contextual chat grounded in diagnosis (OpenAI primary, Groq fallback) |

### 8.6 Free-tier note

**Neither OpenAI nor Groq is assumed permanently free.** Verify current pricing, model availability, and API limits at implementation time (API_SERVICES.md §12).
