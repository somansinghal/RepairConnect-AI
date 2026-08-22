#!/usr/bin/env node
/* ==========================================================================
   RepairConnect AI — Backend unit tests (pure logic, no credentials needed)
   Run: npm run test:unit
   ========================================================================== */
"use strict";

const assert = require("assert");
const path = require("path");
const { normalizeDiagnosis } = require(path.join(__dirname, "..", "functions", "lib", "normalize.js"));
const { recommend } = require(path.join(__dirname, "..", "functions", "lib", "estimate.js"));
const { isFailoverCondition, tryParseJson } = require(path.join(__dirname, "..", "functions", "lib", "ai.js"));
const { utcDay, decodeImage } = require(path.join(__dirname, "..", "functions", "lib", "guard.js"));
const { createStorage, ConfigurationError } = require(path.join(__dirname, "..", "functions", "lib", "storage.js"));

// normalize
const n = normalizeDiagnosis({
  device: "Laptop", category: "laptop", damage: "Cracked display", damageType: "cracked_screen",
  severity: "major", confidence: 0.89, observations: ["Cracked glass"],
  possibleCauses: [{ text: "panel damage", kind: "visible" }],
  troubleshooting: [{ step: "Restart", safetyNote: "" }], warnings: [], repairability: "repair_recommended"
});
assert.equal(n.severity, "major");
assert.equal(n.category, "laptop");
assert.equal(n.confidence, 0.89);
assert.equal(n.possibleCauses[0].kind, "visible");
assert.ok(n.warnings.length >= 1);
assert.equal(n.professionalInspectionAdvised, true);

// malformed input → safe defaults
const bad = normalizeDiagnosis("not json {{{");
assert.equal(bad.severity, "moderate");
assert.equal(bad.confidence, 0);
assert.equal(bad.category, "other");

// clamp
assert.equal(normalizeDiagnosis({ confidence: 5 }).confidence, 1);
assert.equal(normalizeDiagnosis({ confidence: -1 }).confidence, 0);

// recommend
const rec = recommend({ category: "laptop", severity: "major", ageYears: 2 });
assert.equal(rec.repairCost.currency, "INR");
assert.ok(rec.repairCost.min < rec.repairCost.max);
assert.ok(rec.decisionScore >= 0 && rec.decisionScore <= 100);
assert.ok(["repair_recommended", "consider_repair", "replace_recommended"].includes(rec.verdict));

const rep = recommend({ category: "tv", severity: "severe", ageYears: 8 });
assert.equal(rep.verdict, "replace_recommended");

// failover
assert.ok(isFailoverCondition({ timeout: true }));
assert.ok(isFailoverCondition({ status: 429 }));
assert.ok(isFailoverCondition({ status: 500 }));
assert.ok(!isFailoverCondition({ status: 401 }));

// json extraction
assert.deepEqual(tryParseJson('```json\n{"a":1}\n```'), { a: 1 });

// request guard — utcDay + decodeImage
assert.match(utcDay(new Date("2026-08-22T10:00:00Z")), /^\d{4}-\d{2}-\d{2}$/);
assert.equal(utcDay(new Date("2026-08-22T23:59:59Z")), "2026-08-22");

const png = "data:image/png;base64," + Buffer.from([0x89, 0x50, 0x4E, 0x47]).toString("base64");
const ok = decodeImage(png);
assert.equal(ok.mime, "image/png");
assert.equal(ok.buffer.length, 4);

assert.equal(decodeImage("data:image/svg+xml;base64,AAAA"), null); // SVG rejected
assert.equal(decodeImage("data:text/html;base64,AAAA"), null);     // HTML rejected
assert.equal(decodeImage("not-a-data-url"), null);                 // malformed
assert.equal(decodeImage(""), null);                               // empty
assert.equal(decodeImage(null), null);                             // null

// oversized image rejected
const big = "data:image/png;base64," + Buffer.alloc(5 * 1024 * 1024 + 1, 1).toString("base64");
assert.equal(decodeImage(big), null);

/* ---- Storage orchestration (fake adapters — no credentials needed) ---- */
function fakePrimary(behavior) {
  return {
    name: "memcode",
    upload: behavior.upload,
    remove: behavior.remove || (async () => {})
  };
}
function fakeBackup(behavior) {
  return {
    name: "firebase-storage",
    upload: behavior.upload,
    remove: behavior.remove || (async () => {})
  };
}
const META = { userId: "u1", mediaId: "m1", contentType: "image/png", ext: "png", name: "damage.png" };

(async () => {
  // 1) primary + backup success
  let s = createStorage({
    primary: fakePrimary({ upload: async () => ({ key: "p" }) }),
    backup: fakeBackup({ upload: async () => ({ path: "backup/u1/m1/damage.png" }) }),
    backupEnabled: true
  });
  let r = await s.store(Buffer.from("x"), META);
  assert.equal(r.primaryProvider, "memcode");
  assert.equal(r.backupProvider, "firebase-storage");
  assert.equal(r.backupStatus, "done");
  console.log("storage: primary+backup success ✔");

  // 2) primary fails → throws (caller creates NO Firestore reference)
  s = createStorage({
    primary: fakePrimary({ upload: async () => { throw new Error("boom"); } }),
    backup: fakeBackup({ upload: async () => ({ path: "x" }) }),
    backupEnabled: true
  });
  let threw = false;
  try { await s.store(Buffer.from("x"), META); } catch (e) { threw = true; }
  assert.ok(threw, "primary failure must throw");
  console.log("storage: primary failure → throws, no reference ✔");

  // 3) backup fails → primary preserved, backupStatus 'failed'
  s = createStorage({
    primary: fakePrimary({ upload: async () => ({ key: "p" }) }),
    backup: fakeBackup({ upload: async () => { throw new Error("backup down"); } }),
    backupEnabled: true
  });
  r = await s.store(Buffer.from("x"), META);
  assert.equal(r.primaryProvider, "memcode");
  assert.equal(r.backupStatus, "failed");
  console.log("storage: backup failure → primary preserved, status failed ✔");

  // 4) backup disabled → 'not_applicable', primary only
  s = createStorage({
    primary: fakePrimary({ upload: async () => ({ key: "p" }) }),
    backup: fakeBackup({ upload: async () => { throw new Error("must not be called"); } }),
    backupEnabled: false
  });
  r = await s.store(Buffer.from("x"), META);
  assert.equal(r.backupStatus, "not_applicable");
  assert.equal(r.backupProvider, null);
  console.log("storage: backup disabled → not_applicable ✔");

  // 5) removal — partial failure reported (primary ok, backup fails)
  let backupDeleted = false;
  s = createStorage({
    primary: fakePrimary({ remove: async () => {} }),
    backup: fakeBackup({ remove: async () => { backupDeleted = true; throw new Error("cannot delete backup"); } }),
    backupEnabled: true
  });
  const rm = await s.remove({ primaryReference: { key: "p" }, backupReference: { path: "x" } });
  assert.equal(rm.primaryDeleted, true);
  assert.equal(rm.backupDeleted, false);
  assert.ok(rm.errors.length === 1);
  console.log("storage: removal partial failure reported ✔");

  console.log("✔ Backend unit tests passed (normalize, estimate, failover, json, guard, storage).");
})().catch((e) => { console.error(e); process.exit(1); });

