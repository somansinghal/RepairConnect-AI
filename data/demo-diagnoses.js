/* ==========================================================================
   RepairConnect AI — Demo diagnoses (sample data layer)
   --------------------------------------------------------------------------
   DEMO DATA ONLY. Mirrors the structured JSON contract defined in AI_SPEC.md
   (§2.2) so it can be replaced 1:1 by a real `analyzeDamage` Cloud Function
   response without touching the UI.
   ========================================================================== */
window.RCData = window.RCData || {};

/* The featured demo diagnosis used across diagnosis / repair-decision /
   assistant / request / tracking screens. */
window.RCData.activeDiagnosis = {
  id: "diag-001",
  device: "Laptop",
  category: "laptop",
  damage: "Cracked display",
  damageType: "cracked_screen",
  severity: "major",                 // minor | moderate | major | severe
  severityLabel: "High",
  confidence: 0.89,
  observations: [
    "Cracked front glass with impact point in the top-left corner.",
    "Display panel appears partially lit behind the crack.",
    "No visible damage to the hinge or outer casing in this image."
  ],
  possibleCauses: [
    { text: "Display panel damage", kind: "visible" },
    { text: "Display connector damage", kind: "inferred" },
    { text: "Internal display component damage", kind: "inferred" }
  ],
  troubleshooting: [
    { step: "Restart the device.", safetyNote: "" },
    { step: "Connect an external display if available.", safetyNote: "" },
    { step: "Check whether the device powers on.", safetyNote: "" },
    { step: "Check for additional visible damage.", safetyNote: "" }
  ],
  repairability: "repair_recommended",
  warnings: [
    "This is a preliminary AI assessment based only on visible damage. It cannot detect internal issues.",
    "If you notice sparks, smoke, unusual heat, battery swelling, or other dangerous symptoms, stop using the device and seek professional help."
  ],
  professionalInspectionAdvised: true,
  recommendation: {
    estimatedRepairCost: { min: 7000, max: 10000, currency: "INR" },
    pointEstimate: 8500,
    replacementValue: 45000,
    repairCostRatio: 0.19,
    decisionScore: 78,
    verdict: "repair_recommended",   // repair_recommended | consider_repair | replace_recommended
    estimatedLifespanYears: 3,       // demo value — extra useful life a repair can add
    environmentalBenefit: "Repairing keeps the device's materials in use and avoids manufacturing a full replacement — extending its useful life by about 3 years (demo estimate).",
    explanation:
      "The estimated repair cost (about ₹8,500) is roughly 19% of the estimated replacement cost (₹45,000+), and the device is only about 2.5 years old. Based on the available information, repairing is the more economical option."
  },
  createdAt: "Today, 10:24 AM"
};

/* Recent diagnoses for the dashboard list. */
window.RCData.recentDiagnoses = [
  {
    id: "diag-001",
    device: "Laptop",
    damage: "Cracked display",
    severityLabel: "High",
    verdict: "repair_recommended",
    verdictLabel: "Repair",
    time: "Today, 10:24 AM",
    icon: "laptop"
  },
  {
    id: "diag-002",
    device: "Smartphone",
    damage: "Battery draining fast",
    severityLabel: "Medium",
    verdict: "repair_recommended",
    verdictLabel: "Repair",
    time: "Yesterday",
    icon: "phone"
  },
  {
    id: "diag-003",
    device: "Headphones",
    damage: "Left ear no sound",
    severityLabel: "Low",
    verdict: "consider_repair",
    verdictLabel: "Consider",
    time: "3 days ago",
    icon: "headphones"
  }
];

/* Repair history entries for the dashboard + history screen. */
window.RCData.repairHistoryItems = [
  {
    id: "req-100",
    device: "Phone Battery",
    provider: "VoltFix",
    status: "completed",
    statusLabel: "Completed",
    date: "Aug 2, 2026"
  },
  {
    id: "req-101",
    device: "Tablet Charging Port",
    provider: "TechCare",
    status: "completed",
    statusLabel: "Completed",
    date: "Jul 18, 2026"
  }
];

/* Active repair shown on the dashboard. */
window.RCData.activeRepair = {
  id: "req-200",
  title: "Laptop Screen Repair",
  device: "Dell XPS 13",
  provider: "FixPoint",
  status: "in_progress",
  statusLabel: "Repairing",
  updatedAt: "Today, 11:02 AM"
};
