/* ==========================================================================
   RepairConnect AI — Cloud Functions (secure AI backend)
   --------------------------------------------------------------------------
   • analyzeRepair — AI damage analysis. OpenAI (primary) → Groq (failover) →
                     normalize → deterministic recommendation → Firestore.
   • assistant     — context-aware AI assistant (OpenAI → Groq failover).

   SECURITY: every callable verifies Firebase Authentication (context.auth),
   validates payload size, and is rate-limited per user (defense-in-depth —
   enable Firebase App Check for a stronger guarantee).
   Secrets (OPENAI_API_KEY / GROQ_API_KEY) live in server env ONLY and are
   never returned to the client.
   ========================================================================== */
"use strict";

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const ai = require("./lib/ai");
const { normalizeDiagnosis } = require("./lib/normalize");
const { recommend } = require("./lib/estimate");
const { utcDay, decodeImage, MAX_TEXT_CHARS } = require("./lib/guard");
const { createStorage, createMemcodeAdapter, createFirebaseBackupAdapter, newMediaId } = require("./lib/storage");
const prompts = require("./lib/prompts");

admin.initializeApp();
const db = admin.firestore();
const ts = admin.firestore.FieldValue.serverTimestamp;

const DEFAULT_DAILY_LIMIT = 20;

/* Storage adapters (created once). Memcode is the PRIMARY; Firebase Storage
   is the BACKUP. Roles are never reversed. */
const memcodeAdapter = createMemcodeAdapter();
const firebaseBackupAdapter = createFirebaseBackupAdapter();

function env(name) { return process.env[name] || ""; }

function friendly(err) {
  if (err && err.code === "functions/unauthenticated") return "Please sign in to continue.";
  if (err && err.code === "functions/resource-exhausted") return "Daily analysis limit reached. Please try again tomorrow.";
  if (err && err.code === "functions/invalid-argument") return err.message;
  if (err && err.isAiError) return "The AI service is temporarily unavailable. Please try again.";
  return "Something went wrong. Please try again.";
}

/* Per-user daily rate limit (best-effort; enable App Check for stronger protection). */
async function enforceRateLimit(uid) {
  const limit = parseInt(process.env.ANALYZE_DAILY_LIMIT || "", 10) || DEFAULT_DAILY_LIMIT;
  const usageRef = db.collection("usage").doc(uid);
  const today = utcDay();

  await db.runTransaction(async (t) => {
    const snap = await t.get(usageRef);
    const data = snap.exists ? snap.data() : null;
    const count = data && data.analyzeDay === today ? (data.analyzeCount || 0) : 0;
    if (count >= limit) {
      throw new functions.https.HttpsError("resource-exhausted", "Daily analysis limit reached.");
    }
    t.set(usageRef, {
      analyzeDay: today,
      analyzeCount: count + 1,
      updatedAt: ts()
    }, { merge: true });
  });
}

/* ==========================================================================
   analyzeRepair — image (+ optional description) → structured diagnosis
   ========================================================================== */
exports.analyzeRepair = functions.region("us-central1").https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
  const uid = context.auth.uid;

  data = data || {};
  const textDescription = String(data.textDescription || "").slice(0, MAX_TEXT_CHARS);
  const category = String(data.category || "other").slice(0, 40);

  const img = decodeImage(data.imageBase64);
  if (!data.imageBase64 && !textDescription) {
    throw new functions.https.HttpsError("invalid-argument", "Provide an image or a description.");
  }
  if (data.imageBase64 && !img) {
    throw new functions.https.HttpsError("invalid-argument", "Unsupported or oversized image (JPG/PNG/WebP up to 5 MB).");
  }

  // Abuse control — authenticated users only, capped daily volume.
  await enforceRateLimit(uid);

  // ---- Media storage (PRIMARY: Memcode · BACKUP: Firebase Storage) ----
  // Server-side validation only; the browser's MIME type is never trusted.
  const mediaId = newMediaId();
  let mediaRef = null;

  if (img) {
    const storage = createStorage({
      primary: memcodeAdapter,
      backup: firebaseBackupAdapter,
      backupEnabled: env("BACKUP_ENABLED") === "true"
    });

    let stored;
    try {
      stored = await storage.store(img.buffer, {
        userId: uid,
        mediaId,
        contentType: img.mime,
        ext: img.ext,
        name: "damage." + img.ext
      });
    } catch (e) {
      if (e && e.isConfigurationError) {
        throw new functions.https.HttpsError("failed-precondition", friendly(e));
      }
      // Primary failed → NO Firestore reference is created (nothing to orphan).
      throw new functions.https.HttpsError("internal", "Upload failed. Please try again.");
    }

    mediaRef = stored;
    await db.collection("mediaReferences").doc(mediaId).set({
      mediaId,
      userId: uid,
      type: "image",
      primaryProvider: stored.primaryProvider,
      primaryReference: stored.primaryReference,
      backupProvider: stored.backupProvider || null,
      backupReference: stored.backupReference || null,
      backupStatus: stored.backupStatus,
      contentType: img.mime,
      sizeBytes: img.buffer.length,
      createdAt: ts(),
      updatedAt: ts()
    });
  }

  // AI analysis (OpenAI primary → Groq failover)
  let result;
  try {
    result = await ai.run({
      systemPrompt: prompts.SYSTEM_ANALYSIS,
      userPrompt: prompts.analysisUserPrompt(textDescription, category),
      imageDataUrl: img ? img.dataUrl : null,
      json: true
    });
  } catch (e) {
    throw new functions.https.HttpsError("internal", friendly(e));
  }

  const diagnosis = normalizeDiagnosis(result.rawJson || result.text);

  // Deterministic repair-vs-replace (app-side; the AI never computes prices)
  const recommendation = recommend({ category: diagnosis.category, severity: diagnosis.severity, ageYears: 2 });
  recommendation.explanation = diagnosis.disclaimer + " " + recommendation.explanation;

  // Persist structured diagnosis (with media reference, not the binary)
  const doc = {
    userId: uid,
    mediaId: mediaId || null,
    detectedDevice: diagnosis.device,
    detectedDamage: diagnosis.damage,
    damageType: diagnosis.damageType,
    severity: diagnosis.severity,
    confidence: diagnosis.confidence,
    observations: diagnosis.observations,
    possibleCauses: diagnosis.possibleCauses,
    troubleshooting: diagnosis.troubleshooting,
    repairability: diagnosis.repairability,
    warnings: diagnosis.warnings,
    professionalInspectionAdvised: diagnosis.professionalInspectionAdvised,
    disclaimer: diagnosis.disclaimer,
    recommendation: {
      estimatedRepairCost: recommendation.repairCost,
      replacementValue: recommendation.replacement.value,
      repairCostRatio: recommendation.repairCostRatio,
      decisionScore: recommendation.decisionScore,
      verdict: recommendation.verdict,
      explanation: recommendation.explanation
    },
    aiProvider: result.provider || "unknown",
    createdAt: ts()
  };
  const ref = await db.collection("diagnoses").add(doc);

  return {
    diagnosisId: ref.id,
    diagnosis: Object.assign({ id: ref.id }, doc)
  };
});

/* ==========================================================================
   assistant — context-aware chat (OpenAI primary → Groq failover)
   ========================================================================== */
exports.assistant = functions.region("us-central1").https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Authentication required.");

  data = data || {};
  const message = String(data.message || "").trim().slice(0, 500);
  if (!message) throw new functions.https.HttpsError("invalid-argument", "Message is required.");

  // No diagnosis context stored server-side beyond the (optional) provided id.
  let diagnosis = null;
  if (data.diagnosisId) {
    const snap = await db.collection("diagnoses").doc(String(data.diagnosisId)).get();
    if (snap.exists && snap.data().userId === context.auth.uid) diagnosis = snap.data();
  }

  let result;
  try {
    result = await ai.run({
      systemPrompt: prompts.SYSTEM_ASSISTANT,
      userPrompt: prompts.assistantUserPrompt(diagnosis, data.history || [], message),
      imageDataUrl: null,
      json: false
    });
  } catch (e) {
    throw new functions.https.HttpsError("internal", friendly(e));
  }

  return { reply: String(result.text || "").slice(0, 2000) };
});

/* ==========================================================================
   deleteMedia — safe deletion (ownership-checked, partial-failure-safe)
   Deletes primary (Memcode) + backup (Firebase Storage) objects, then the
   Firestore reference. Nothing is silently orphaned: if the primary cannot
   be removed the reference is kept and a retryable error is returned; if
   only the backup fails, the reference is kept with backupStatus 'delete_failed'.
   ========================================================================== */
exports.deleteMedia = functions.region("us-central1").https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
  const uid = context.auth.uid;
  const mediaId = String(data.mediaId || "");

  if (!mediaId) throw new functions.https.HttpsError("invalid-argument", "mediaId is required.");

  const ref = db.collection("mediaReferences").doc(mediaId);
  const snap = await ref.get();
  if (!snap.exists || snap.data().userId !== uid) {
    throw new functions.https.HttpsError("permission-denied", "Not your media.");
  }
  const doc = snap.data();

  const storage = createStorage({
    primary: memcodeAdapter,
    backup: firebaseBackupAdapter,
    backupEnabled: true
  });

  const summary = await storage.remove({
    primaryProvider: doc.primaryProvider,
    primaryReference: doc.primaryReference,
    backupProvider: doc.backupProvider,
    backupReference: doc.backupReference
  });

  // Primary object could not be removed → keep the reference, allow retry.
  if (!summary.primaryDeleted) {
    throw new functions.https.HttpsError("internal", "Couldn't fully delete the media. Please try again.");
  }

  // Primary removed but backup failed → keep the reference, mark the failure.
  if (!summary.backupDeleted) {
    await ref.update({ backupStatus: "delete_failed", updatedAt: ts() });
    return { deleted: false, partial: true, message: "Backup deletion failed — reference retained for retry." };
  }

  // Everything removed → delete the Firestore reference.
  await ref.delete();
  return { deleted: true, partial: false };
});
