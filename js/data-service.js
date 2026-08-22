/* ==========================================================================
   RepairConnect AI — Data service (single backend seam)
   --------------------------------------------------------------------------
   Every page talks to the backend through RC.data.
     • LIVE  (Firebase configured)  → Firebase Auth + RC.firestore.
     • DEMO  (not configured)       → clearly-labelled localStorage fallback.
   DO NOT bypass this layer from page code. Authorization is enforced by
   firestore.rules; this layer only routes calls.
   ========================================================================== */
window.RC = window.RC || {};

RC.data = (function () {
  "use strict";

  var live = false;
  var DB = "rc-demo-store-v1";

  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms || 350); }); }

  function demoToast(msg) {
    if (window.RC && RC.toast) RC.toast(msg, "info");
  }

  /* ---------------- demo store (localStorage) ---------------- */
  function demoRead(key, fallback) {
    try {
      var raw = localStorage.getItem(DB + ":" + key);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return fallback;
  }
  function demoWrite(key, val) {
    try { localStorage.setItem(DB + ":" + key, JSON.stringify(val)); } catch (e) {}
  }

  /* ---------------- init ---------------- */
  var _initDone = false;
  function init() {
    if (_initDone) return live;
    _initDone = true;
    var r = RC.fb.init();
    live = r.live;
    if (live && RC.fb.auth) {
      RC.fb.auth.onAuthStateChanged(function (user) {
        if (user) RC.firestore.ensureUserDoc(user);
      });
    }
    return live;
  }

  function isLive() { return live; }

  /* ---------------- auth ---------------- */
  function currentUser() {
    if (live && RC.fb.auth) {
      var u = RC.fb.auth.currentUser;
      if (u) return { uid: u.uid, email: u.email, name: u.displayName, photoURL: u.photoURL };
      return null; // live but signed out
    }
    /* DEMO mode: only a stored demo session counts as "signed in".
       Previously a default user was returned here, which made the auth
       guard treat every visitor as authenticated. */
    return demoRead("user", null) || null;
  }

  /* Establish a clearly-labelled demo session (no real account). Used by the
     "Try Demo" / "Explore demo" entry points so the auth guard sees a valid
     session before entering protected pages. */
  function enterDemo() {
    if (live) return Promise.resolve();
    RC.demo.enter();
    return delay(250);
  }

  function signUp(name, email, password) {
    if (!live) {
      demoToast("Demo mode — no real account is created (Firebase not configured).");
      return delay(700).then(function () {
        demoWrite("user", { uid: "demo-user", email: email, name: name });
        return { demo: true };
      });
    }
    return RC.fb.auth.createUserWithEmailAndPassword(email, password)
      .then(function (cred) {
        return cred.user.updateProfile({ displayName: name }).then(function () { return cred; });
      })
      .then(function (cred) { return RC.firestore.ensureUserDoc(cred.user); });
  }

  function signIn(email, password) {
    if (!live) {
      demoToast("Demo sign-in (Firebase not configured).");
      return delay(700).then(function () {
        demoWrite("user", { uid: "demo-user", email: email, name: "Alex Demo" });
        return { demo: true };
      });
    }
    return RC.fb.auth.signInWithEmailAndPassword(email, password)
      .then(function (cred) { return RC.firestore.ensureUserDoc(cred.user); });
  }

  /* Remember me: LOCAL persists across browser restarts; SESSION clears when
     the tab closes. Must be set BEFORE the next sign-in. */
  function setRememberMe(remember) {
    if (!live || !RC.fb.auth) return Promise.resolve();
    var P = firebase.auth.Auth.Persistence;
    return RC.fb.auth.setPersistence(remember ? P.LOCAL : P.SESSION);
  }

  /* Google sign-in via Firebase popup (real integration; falls back to a
     friendly error when Firebase isn't configured). */
  function signInWithGoogle() {
    if (!live) {
      demoToast("Google sign-in requires Firebase configuration (demo mode).");
      return Promise.reject(new Error("DEMO_MODE"));
    }
    var provider = new firebase.auth.GoogleAuthProvider();
    return RC.fb.auth.signInWithPopup(provider)
      .then(function (cred) { return RC.firestore.ensureUserDoc(cred.user); });
  }

  function judgeSignIn() {
    var j = (window.RC_CONFIG && window.RC_CONFIG.judgeDemo) || {};
    if (!j.email || !j.password) {
      return Promise.reject(new Error("JUDGE_NOT_CONFIGURED"));
    }
    return signIn(j.email, j.password);
  }

  function signOut() {
    if (live && RC.fb.auth) return RC.fb.auth.signOut();
    demoWrite("user", null);
    return Promise.resolve();
  }

  function resetPassword(email) {
    if (!live) {
      demoToast("Demo mode — password reset is simulated (Firebase not configured).");
      return Promise.resolve();
    }
    return RC.fb.auth.sendPasswordResetEmail(email);
  }

  function onAuthChange(cb) {
    if (live && RC.fb.auth) {
      RC.fb.auth.onAuthStateChanged(function (u) {
        cb(u ? { uid: u.uid, email: u.email, name: u.displayName, photoURL: u.photoURL } : null);
      });
    } else {
      setTimeout(function () { cb(currentUser()); }, 0);
    }
  }

  /* ---------------- profile / devices ---------------- */
  function updateProfile(name) {
    if (!live) {
      var u = demoRead("user", currentUser());
      u.name = name; demoWrite("user", u);
      demoToast("Profile updated (demo).");
      return Promise.resolve();
    }
    return RC.firestore.updateProfile(name);
  }

  function updatePreferences(prefs) {
    if (!live) {
      var u = demoRead("user", currentUser());
      u.preferences = prefs; demoWrite("user", u);
      demoToast("Preferences saved (demo).");
      return Promise.resolve();
    }
    return RC.firestore.updatePreferences(prefs);
  }

  function getPreferences() {
    if (!live) {
      var u = demoRead("user", currentUser());
      return Promise.resolve((u && u.preferences) || {
        emailNotifications: true, smsUpdates: false, sustainabilityTips: true
      });
    }
    return RC.firestore.getPreferences().then(function (p) {
      return p || { emailNotifications: true, smsUpdates: false, sustainabilityTips: true };
    });
  }

  function listDevices() {
    if (!live) return Promise.resolve(demoRead("devices", null) || (window.RCData && RCData.devices) || []);
    return RC.firestore.listDevices();
  }

  function saveDevice(dev) {
    if (!live) {
      var base = (window.RCData && RCData.devices) ? RCData.devices.slice() : [];
      var list = demoRead("devices", null) || base;
      if (dev.id) {
        list = list.map(function (d) { return d.id === dev.id ? Object.assign({}, d, dev) : d; });
      } else {
        dev.id = "dev-" + Date.now();
        list.unshift(dev);
      }
      demoWrite("devices", list);
      demoToast("Device saved (demo).");
      return Promise.resolve();
    }
    return RC.firestore.saveDevice(dev);
  }

  function deleteDevice(id) {
    if (!live) {
      var base = (window.RCData && RCData.devices) ? RCData.devices.slice() : [];
      var list = (demoRead("devices", null) || base).filter(function (d) { return d.id !== id; });
      demoWrite("devices", list);
      demoToast("Device removed (demo).");
      return Promise.resolve();
    }
    return RC.firestore.deleteDevice(id);
  }

  /* ---------------- diagnoses ---------------- */
  function listDiagnoses() {
    if (!live) return Promise.resolve((window.RCData && RCData.recentDiagnoses) || []);
    return RC.firestore.listDiagnoses();
  }

  function getDiagnosis(id) {
    if (!live || !id) return Promise.resolve((window.RCData && RCData.activeDiagnosis) || null);
    return RC.firestore.getDiagnosis(id);
  }

  /* Analyze — secure AI backend (Cloud Functions): OpenAI primary → Groq
     failover → normalized diagnosis → Firestore. */
  function analyze(payload) {
    if (!live) {
      demoToast("Demo mode — simulated analysis (no real AI request).");
      return delay(1200).then(function () {
        return { diagnosisId: "diag-demo", diagnosis: (window.RCData && RCData.activeDiagnosis) || null };
      });
    }
    if (!RC.fb.functions) {
      return Promise.reject(new Error("AI analysis requires the backend (Cloud Functions)."));
    }
    var fn = RC.fb.functions.httpsCallable("analyzeRepair");
    return fn(payload).then(function (res) { return res.data; });
  }

  /* ---------------- repair requests ---------------- */
  function createRequest(req) {
    if (!live) {
      demoWrite("request", Object.assign({ id: "req-demo", status: "submitted", createdAt: Date.now() }, req));
      demoToast("Repair request created (demo).");
      return delay(600).then(function () { return { id: "REQ-" + String(Date.now()).slice(-6) }; });
    }
    return RC.firestore.createRequest(req);
  }

  function getActiveRequest() {
    if (!live) return Promise.resolve((window.RCData && RCData.activeRepair) || null);
    return RC.firestore.getActiveRequest();
  }

  function getRequestById(id) {
    if (!live || !id) return Promise.resolve(null);
    return RC.firestore.getRequestById(id);
  }

  function listRequests() {
    if (!live) return Promise.resolve((window.RCData && RCData.repairHistoryItems) || []);
    return RC.firestore.listRequests();
  }

  function listHistory(requestId) {
    if (!live || !requestId) return Promise.resolve([]);
    return RC.firestore.listHistory(requestId);
  }

  /* Status transitions: clients may only create the initial "submitted" event
     (enforced by rules). Advancing requires the backend — later phase. */
  function advanceStatus(id, note) {
    if (!live) {
      demoToast("Demo mode — status is advanced locally only.");
      return Promise.resolve({ demo: true });
    }
    return Promise.reject(new Error("Status changes require the backend (later phase). Rules prevent client-side transitions."));
  }

  /* ---------------- assistant (AI — later phase) ---------------- */
  function askAssistant(message, diagnosisId) {
    if (!live) {
      demoToast("Demo mode — assistant responses are simulated (no real AI).");
      return delay(900).then(function () {
        return { reply: "Demo reply: based on your diagnosis, a cracked display is rated High severity and usually repairable. Connect the backend to get real AI answers." };
      });
    }
    if (!RC.fb.functions) {
      return Promise.reject(new Error("The AI assistant requires the backend (Cloud Functions) — coming in a later phase."));
    }
    var fn = RC.fb.functions.httpsCallable("assistant");
    return fn({ message: message, diagnosisId: diagnosisId || null }).then(function (res) {
      return res.data;
    });
  }

  return {
    init: init, isLive: isLive,
    currentUser: currentUser, signUp: signUp, signIn: signIn, judgeSignIn: judgeSignIn,
    signInWithGoogle: signInWithGoogle, setRememberMe: setRememberMe, enterDemo: enterDemo,
    signOut: signOut, resetPassword: resetPassword, onAuthChange: onAuthChange,
    updateProfile: updateProfile,
    updatePreferences: updatePreferences,
    getPreferences: getPreferences,
    listDevices: listDevices, saveDevice: saveDevice, deleteDevice: deleteDevice,
    listDiagnoses: listDiagnoses, getDiagnosis: getDiagnosis, analyze: analyze,
    createRequest: createRequest, getActiveRequest: getActiveRequest,
    getRequestById: getRequestById, listRequests: listRequests, listHistory: listHistory,
    advanceStatus: advanceStatus, askAssistant: askAssistant
  };
})();
