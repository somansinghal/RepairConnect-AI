/* ==========================================================================
   RepairConnect AI — Storage layer (PRIMARY: Memcode · BACKUP: Firebase Storage)
   --------------------------------------------------------------------------
   Orchestration is provider-agnostic and unit-testable (inject adapters).

   • PRIMARY  — Memcode. The adapter is an INTERFACE ONLY until the official
                 Memcode documentation (endpoints, auth, credential names,
                 limits, URL/reference behavior) is verified. It throws a
                 ConfigurationError rather than inventing API behavior.
   • BACKUP   — Firebase Storage (Admin SDK), implemented for real.

   ROLES ARE NOT REVERSED: normal uploads go to the primary first. Firebase
   Storage is used only as the backup destination (or, with an explicit
   TESTING-ONLY opt-in, as a temporary primary — never in production).
   ========================================================================== */
"use strict";

const crypto = require("crypto");

function env(name) { return process.env[name] || ""; }

class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigurationError";
    this.isConfigurationError = true;
  }
}

function newMediaId() { return crypto.randomUUID(); }

/* --------------------------------------------------------------------------
 * PRIMARY — Memcode (adapter interface; pending official docs verification)
 * -------------------------------------------------------------------------- */
function createMemcodeAdapter() {
  return {
    name: "memcode",
    async upload(buffer, meta) {
      // TODO(integration): implement against the OFFICIAL Memcode API after
      // verifying its documentation. No endpoints or credential names are
      // assumed here.
      throw new ConfigurationError(
        "Memcode integration is pending official API verification. " +
        "Implement the Memcode adapter (functions/lib/storage.js) against the " +
        "official docs before enabling production image uploads."
      );
    },
    async remove(reference) {
      throw new ConfigurationError(
        "Memcode deletion is pending official API verification."
      );
    }
  };
}

/* --------------------------------------------------------------------------
 * BACKUP — Firebase Storage (implemented)
 * -------------------------------------------------------------------------- */
/* Lazy-required so the module can be unit-tested without firebase-admin. */
function ensureAdminInit() {
  const admin = require("firebase-admin");
  try { admin.app(); } catch (e) { admin.initializeApp(); }
  return admin;
}

function createFirebaseBackupAdapter() {
  const app = ensureAdminInit();
  return {
    name: "firebase-storage",
    async upload(buffer, meta) {
      const bucket = app.storage().bucket(); // default bucket from project config
      const path = `backup/${meta.userId}/${meta.mediaId}/${meta.name}`;
      const file = bucket.file(path);
      await file.save(buffer, {
        contentType: meta.contentType,
        metadata: { cacheControl: "private, max-age=3600" }
      });
      let url = null;
      try {
        const [signed] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000
        });
        url = signed;
      } catch (e) { /* signed URL optional; reference path still valid */ }
      return { path, url };
    },
    async remove(reference) {
      if (!reference || !reference.path) return;
      await ensureAdminInit().storage().bucket().file(reference.path).delete();
    }
  };
}

/* --------------------------------------------------------------------------
 * Orchestrator — primary + optional backup, with safe failure handling
 * -------------------------------------------------------------------------- */
function createStorage(opts) {
  const primary = opts.primary;
  const backup = opts.backup;
  const backupEnabled = !!opts.backupEnabled;

  /**
   * Store media: primary first; backup second (best-effort).
   * • Primary fails          → throw (caller creates NO Firestore reference).
   * • Backup fails           → primary preserved; backupStatus 'failed'.
   * • Backup disabled        → backupStatus 'not_applicable'.
   */
  async function store(buffer, meta) {
    const primaryRef = await primary.upload(buffer, meta);

    let backupProvider = null;
    let backupReference = null;
    let backupStatus = "not_applicable";

    if (backupEnabled && backup) {
      try {
        backupReference = await backup.upload(buffer, meta);
        backupProvider = backup.name;
        backupStatus = "done";
      } catch (e) {
        console.warn("[storage] backup failed (primary preserved):", e.message);
        backupStatus = "failed";
      }
    }

    return {
      primaryProvider: primary.name,
      primaryReference: primaryRef,
      backupProvider,
      backupReference,
      backupStatus
    };
  }

  /**
   * Remove media. Returns a summary; never throws (partial failures are
   * reported so callers can decide — nothing is silently orphaned).
   */
  async function remove(reference) {
    const summary = { primaryDeleted: false, backupDeleted: false, errors: [] };

    if (reference.primaryReference) {
      try { await primary.remove(reference.primaryReference); summary.primaryDeleted = true; }
      catch (e) { summary.errors.push({ provider: reference.primaryProvider, message: e.message }); }
    } else {
      summary.primaryDeleted = true; // nothing to delete
    }

    if (reference.backupReference) {
      try { await backup.remove(reference.backupReference); summary.backupDeleted = true; }
      catch (e) { summary.errors.push({ provider: reference.backupProvider, message: e.message }); }
    } else {
      summary.backupDeleted = true; // nothing to delete
    }

    return summary;
  }

  return { store, remove };
}

module.exports = {
  createStorage,
  createMemcodeAdapter,
  createFirebaseBackupAdapter,
  ConfigurationError,
  newMediaId
};
