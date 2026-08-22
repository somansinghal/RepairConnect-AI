/* ==========================================================================
   RepairConnect AI — Firestore data layer (live)
   --------------------------------------------------------------------------
   All Firestore reads/writes for the authenticated user live here.
   Page code never touches Firestore directly — it goes through RC.data,
   which routes LIVE requests to this module and DEMO requests to the
   localStorage fallback. Authorization is enforced by firestore.rules
   (this layer only performs the calls; the rules are the security boundary).
   ========================================================================== */
window.RC = window.RC || {};

RC.firestore = (function () {
  "use strict";

  function db() { return RC.fb.db; }
  function uid() { return RC.fb.auth.currentUser ? RC.fb.auth.currentUser.uid : null; }
  function ts() { return firebase.firestore.FieldValue.serverTimestamp(); }

  /* ---------------- users ---------------- */
  function ensureUserDoc(user) {
    var ref = db().collection("users").doc(user.uid);
    return ref.get().then(function (snap) {
      if (!snap.exists) {
        return ref.set({
          uid: user.uid,
          name: user.displayName || (user.email ? user.email.split("@")[0] : "User"),
          email: user.email || null,
          photoURL: user.photoURL || null,
          role: "user",
          preferences: { emailNotifications: true, smsUpdates: false, sustainabilityTips: true },
          createdAt: ts(),
          updatedAt: ts()
        }).then(function () { return ref; });
      }
      return ref;
    });
  }

  function getUserDoc() {
    return db().collection("users").doc(uid()).get().then(function (snap) {
      return snap.exists ? snap.data() : null;
    });
  }

  function updateProfile(name) {
    var u = RC.fb.auth.currentUser;
    return u.updateProfile({ displayName: name }).then(function () {
      return db().collection("users").doc(u.uid).update({ name: name, updatedAt: ts() });
    });
  }

  function updatePreferences(prefs) {
    return db().collection("users").doc(uid()).update({
      preferences: {
        emailNotifications: !!prefs.emailNotifications,
        smsUpdates: !!prefs.smsUpdates,
        sustainabilityTips: !!prefs.sustainabilityTips
      },
      updatedAt: ts()
    });
  }

  function getPreferences() {
    return db().collection("users").doc(uid()).get().then(function (snap) {
      if (!snap.exists) return null;
      return snap.data().preferences || null;
    });
  }

  /* ---------------- devices ---------------- */
  function listDevices() {
    return db().collection("devices").where("userId", "==", uid())
      .orderBy("createdAt", "desc").get()
      .then(function (snap) {
        return snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      });
  }

  function saveDevice(dev) {
    var data = {
      userId: uid(),
      category: dev.category || "other",
      brand: dev.brand || "",
      model: dev.model || "",
      ageYears: dev.ageYears || 0,
      updatedAt: ts()
    };
    if (dev.id) {
      return db().collection("devices").doc(dev.id).update(data);
    }
    data.createdAt = ts();
    return db().collection("devices").add(data);
  }

  function deleteDevice(id) {
    return db().collection("devices").doc(id).delete();
  }

  /* ---------------- diagnoses ---------------- */
  function listDiagnoses() {
    return db().collection("diagnoses").where("userId", "==", uid())
      .orderBy("createdAt", "desc").limit(20).get()
      .then(function (snap) {
        return snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      });
  }

  function getDiagnosis(id) {
    return db().collection("diagnoses").doc(id).get().then(function (snap) {
      if (!snap.exists) return null;
      return Object.assign({ id: snap.id }, snap.data());
    });
  }

  /* ---------------- repair requests ---------------- */
  function createRequest(req) {
    var u = uid();
    var docRef = db().collection("repairRequests").doc(); // client-generated id
    var doc = {
      requestId: docRef.id,
      userId: u,
      deviceId: req.deviceId || null,
      diagnosisId: req.diagnosisId || null,
      repairerId: req.repairerId || null,
      status: "submitted",
      estimatedCost: Number(req.estimatedCost) || 0,
      notes: String(req.notes || "").slice(0, 1000),
      prefDate: String(req.prefDate || "").slice(0, 20),
      prefTime: String(req.prefTime || "").slice(0, 20),
      createdAt: ts(),
      updatedAt: ts()
    };
    var history = {
      requestId: docRef.id,
      status: "submitted",
      changedBy: "user",
      notes: "",
      timestamp: ts()
    };
    var batch = db().batch();
    batch.set(docRef, doc);
    batch.set(db().collection("repairStatusHistory").doc(), history);
    return batch.commit().then(function () { return { id: docRef.id }; });
  }

  function getRequestById(id) {
    return db().collection("repairRequests").doc(id).get().then(function (snap) {
      if (!snap.exists) return null;
      return Object.assign({ id: snap.id }, snap.data());
    });
  }

  function listRequests() {
    return db().collection("repairRequests").where("userId", "==", uid())
      .orderBy("createdAt", "desc").limit(20).get()
      .then(function (snap) {
        return snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      });
  }

  function getActiveRequest() {
    return db().collection("repairRequests").where("userId", "==", uid())
      .where("status", "in", ["submitted", "accepted", "scheduled", "received", "diagnosis_confirmed", "in_progress", "ready_for_pickup"])
      .orderBy("createdAt", "desc").limit(1).get()
      .then(function (snap) {
        if (!snap.docs.length) return null;
        var d = snap.docs[0];
        return Object.assign({ id: d.id }, d.data());
      });
  }

  /* Status history: append-only; clients may only create the initial event.
     Further transitions require the backend (later phase) — see firestore.rules. */
  function listHistory(requestId) {
    return db().collection("repairStatusHistory").where("requestId", "==", requestId)
      .orderBy("timestamp", "asc").get()
      .then(function (snap) {
        return snap.docs.map(function (d) { return d.data(); });
      });
  }

  return {
    ensureUserDoc: ensureUserDoc,
    getUserDoc: getUserDoc,
    updateProfile: updateProfile,
    updatePreferences: updatePreferences,
    getPreferences: getPreferences,
    listDevices: listDevices,
    saveDevice: saveDevice,
    deleteDevice: deleteDevice,
    listDiagnoses: listDiagnoses,
    getDiagnosis: getDiagnosis,
    createRequest: createRequest,
    getRequestById: getRequestById,
    listRequests: listRequests,
    getActiveRequest: getActiveRequest,
    listHistory: listHistory
  };
})();
