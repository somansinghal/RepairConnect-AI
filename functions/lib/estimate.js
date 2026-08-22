/* ==========================================================================
   RepairConnect AI — deterministic estimate + repair-vs-replace (pure)
   Financial figures are computed HERE, never invented by the LLM.
   All outputs are estimates (bands), not quotes.
   ========================================================================== */
"use strict";

/* Base repair-cost points (INR) per category — reference values, tunable. */
const BASE_COST = {
  smartphone: 4500,
  laptop: 7500,
  tablet: 4500,
  desktop: 6000,
  tv: 9000,
  home_appliance: 5000,
  wearable: 3500,
  audio: 2500,
  camera: 7000,
  other: 4000
};

/* Approximate replacement value (INR) per category — reference, tunable. */
const REPLACEMENT_VALUE = {
  smartphone: 25000,
  laptop: 45000,
  tablet: 22000,
  desktop: 40000,
  tv: 40000,
  home_appliance: 18000,
  wearable: 12000,
  audio: 9000,
  camera: 30000,
  other: 12000
};

const SEVERITY_MULT = { minor: 0.5, moderate: 1.0, major: 2.0, severe: 3.0 };

function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

/** Deterministic repair cost band: { min, max, currency, point }. */
function estimateRepairCost(category, severity) {
  const base = BASE_COST[category] || BASE_COST.other;
  const mult = SEVERITY_MULT[severity] || 1.0;
  const point = Math.round(base * mult);
  return {
    currency: "INR",
    point,
    min: Math.round(point * 0.7),
    max: Math.round(point * 1.3)
  };
}

/** Replacement value estimate: { value, currency }. */
function estimateReplacement(category) {
  return { value: REPLACEMENT_VALUE[category] || REPLACEMENT_VALUE.other, currency: "INR" };
}

/**
 * Deterministic repair-vs-replace decision.
 * @param {{category:string,severity:string,ageYears?:number}} diag
 * @returns {{repairCost:*, replacement:*, repairCostRatio:number, decisionScore:number,
 *            verdict:string, explanation:string}}
 */
function recommend(diag) {
  const repairCost = estimateRepairCost(diag.category, diag.severity);
  const replacement = estimateReplacement(diag.category);
  const ageYears = Number(diag.ageYears || 0) || 2;

  let ratio = replacement.value ? repairCost.point / replacement.value : 0.5;

  let score = 100 - ratio * 100;
  if (diag.severity === "severe") score -= 10;
  if (diag.severity === "major") score -= 4;
  if (ageYears > 5) score -= 10;
  if (ageYears < 1) score += 5;
  score = Math.round(clamp(score, 0, 100));

  const verdict = score >= 70 ? "repair_recommended" : score >= 40 ? "consider_repair" : "replace_recommended";

  const explanation =
    `The estimated repair cost (about ₹${repairCost.point.toLocaleString("en-IN")}) is roughly ` +
    `${Math.round(ratio * 100)}% of the estimated replacement cost (₹${replacement.value.toLocaleString("en-IN")}+), ` +
    `and the device is about ${ageYears} year(s) old. Based on the available information, ` +
    `${verdict === "repair_recommended" ? "repairing is the more economical option." :
      verdict === "consider_repair" ? "repair is worth considering, but compare quotes before deciding." :
      "replacement may be more economical than repair."}`;

  return {
    repairCost,
    replacement,
    repairCostRatio: Math.round(ratio * 1000) / 1000,
    decisionScore: score,
    verdict,
    explanation
  };
}

module.exports = { estimateRepairCost, estimateReplacement, recommend };
