/* ==========================================================================
   RepairConnect AI — AI response normalization (pure, unit-testable)
   Converts any provider's raw AI JSON into the single schema the frontend
   renders. Treats AI output as untrusted data. Never throws on malformed
   input — returns safe defaults.
   ========================================================================== */
"use strict";

const SEVERITIES = ["minor", "moderate", "major", "severe"];
const VERDICTS = ["repair_recommended", "consider_repair", "replace_recommended"];
const CATEGORIES = [
  "smartphone", "laptop", "tablet", "desktop", "tv", "home_appliance",
  "wearable", "audio", "camera", "other"
];

function str(v) { return typeof v === "string" ? v : ""; }
function arr(v) { return Array.isArray(v) ? v : []; }
function clamp(n, lo, hi) {
  n = Number(n);
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function pickEnum(v, allowed, fallback) {
  return allowed.indexOf(v) !== -1 ? v : fallback;
}

function sanitizeCause(c) {
  const text = typeof c === "string" ? c : c && typeof c.text === "string" ? c.text : "";
  const kind = c && (c.kind === "visible" || c.kind === "inferred") ? c.kind : "inferred";
  return text.trim() ? { text: text.trim(), kind } : null;
}

function sanitizeStep(s) {
  const text = typeof s === "string" ? s : s && typeof s.step === "string" ? s.step : "";
  const safetyNote = s && typeof s.safetyNote === "string" ? s.safetyNote : "";
  return text.trim() ? { step: text.trim(), safetyNote: safetyNote.trim() } : null;
}

/**
 * Normalize a provider response (parsed JSON) into the canonical schema.
 * @param {any} raw   Parsed provider JSON (or a string).
 * @returns {{device:string,category:string,damage:string,damageType:string,severity:string,
 *            confidence:number,observations:string[],possibleCauses:Array<{text,kind}>,
 *            troubleshooting:Array<{step,safetyNote}>,repairability:string,
 *            warnings:string[],professionalInspectionAdvised:boolean,disclaimer:string}}
 */
function normalizeDiagnosis(raw) {
  let obj = raw;
  if (typeof raw === "string") {
    try { obj = JSON.parse(raw); } catch (e) { obj = null; }
  }
  if (!obj || typeof obj !== "object") obj = {};

  const severity = pickEnum(str(obj.severity), SEVERITIES, "moderate");
  const confidence = clamp(obj.confidence, 0, 1);

  const observations = arr(obj.observations).map(str).map((s) => s.trim()).filter(Boolean).slice(0, 8);
  const possibleCauses = arr(obj.possibleCauses || obj.possible_causes).map(sanitizeCause).filter(Boolean).slice(0, 6);
  const troubleshooting = arr(obj.troubleshooting || obj.troubleshooting_steps).map(sanitizeStep).filter(Boolean).slice(0, 6);

  const warnings = arr(obj.warnings || obj.safetyWarnings || obj.safety_warnings)
    .map(str).map((s) => s.trim()).filter(Boolean).slice(0, 6);

  const disclaimer = str(obj.disclaimer) ||
    "This is a preliminary AI assessment based only on the uploaded image. " +
    "It cannot detect internal damage. Confirm with a qualified professional before acting.";

  const device = str(obj.device || obj.detectedDevice || "Unidentified device");
  const damage = str(obj.damage || obj.detectedIssue || obj.detectedDamage || "Damage not clearly identified");
  const category = pickEnum(str(obj.category).toLowerCase(), CATEGORIES, "other");

  // Safety warnings for high-risk categories are always present.
  if (/cracked_screen|battery|water|charging|power|overheat/i.test(str(obj.damageType) + damage)) {
    const danger = "If you notice sparks, smoke, unusual heat, battery swelling, or other dangerous symptoms, stop using the device and seek professional help.";
    if (warnings.indexOf(danger) === -1) warnings.push(danger);
  }

  return {
    device,
    category,
    damage,
    damageType: str(obj.damageType || obj.damage_type),
    severity,
    confidence,
    observations,
    possibleCauses,
    troubleshooting,
    repairability: pickEnum(str(obj.repairability || obj.repairRecommendation || obj.repair_recommendation), VERDICTS, "consider_repair"),
    warnings,
    professionalInspectionAdvised:
      typeof obj.professionalInspectionAdvised === "boolean"
        ? obj.professionalInspectionAdvised
        : severity === "severe" || severity === "major" || warnings.length > 0,
    disclaimer
  };
}

module.exports = { normalizeDiagnosis };
