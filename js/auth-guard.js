/* ==========================================================================
   RepairConnect AI — Protected-route guard (authentication gate)
   --------------------------------------------------------------------------
   Redirects unauthenticated users away from protected pages BEFORE protected
   functionality initializes. This is a UX/security layer — the real boundary
   remains Firebase Auth + Firestore Security Rules.

<<<<<<< HEAD
   Firebase Authentication is the ONLY authentication provider:
   • LIVE mode (Firebase configured): waits for Firebase's auth-state
     listener (no premature redirect, no flicker) with a safety cap so it can
     never hang on "Checking your session…".
   • Not configured / not authenticated: redirect to Login. There is NO
     demo-session bypass — no localStorage key, no guest access, no fake user.
=======
   Auth state is centralized: AUTH_LOADING → AUTHENTICATED | UNAUTHENTICATED.
   • LIVE mode: waits for Firebase's auth-state listener (no premature
     redirect, no flicker) with a safety cap so it can never hang.
   • DEMO mode: a stored demo session counts as "signed in"; with no session
     the user is treated as signed out and redirected to Login.
>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356

   Login/Signup are never redirected (no loops). The `next` destination is
   allow-listed to internal .html routes only (no open redirects).
   ========================================================================== */
window.RC = window.RC || {};

RC.authGuard = (function () {
  "use strict";

  var PROTECTED = [
    "dashboard.html", "analyze.html", "diagnosis.html", "repair-decision.html",
    "repairers.html", "compare.html", "request-repair.html", "tracking.html",
    "assistant.html", "profile.html"
  ];

  var SAFE_TARGETS = /^(dashboard|analyze|diagnosis|repair-decision|repairers|compare|request-repair|tracking|assistant|profile)\.html$/;

  function page() {
    return (location.pathname.split("/").pop() || "index.html").toLowerCase();
  }

  function showLoading() {
    if (document.getElementById("authLoading")) return;
    var el = document.createElement("div");
    el.id = "authLoading";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.innerHTML =
      '<div class="auth-loading-card">' +
        '<span class="spinner spinner--dark" aria-hidden="true"></span>' +
        '<p>Checking your session…</p>' +
      "</div>";
    document.body.appendChild(el);
    document.documentElement.classList.add("js-auth-check");
  }

  function hideLoading() {
    var el = document.getElementById("authLoading");
    if (el) el.remove();
    document.documentElement.classList.remove("js-auth-check");
  }

  function redirectToLogin() {
    var target = page();
    var query = SAFE_TARGETS.test(target) ? ("?next=" + encodeURIComponent(target)) : "";
    location.replace("login.html" + query);
  }

  function init() {
    var required = document.body.getAttribute("data-auth") === "required" ||
      PROTECTED.indexOf(page()) !== -1;
    if (!required) return;

    /* Ensure Firebase/data-service are initialized before checking state —
       both are idempotent, so this is safe regardless of listener order. */
    if (RC.data && typeof RC.data.init === "function") RC.data.init();

    var settled = false;
    function settle(user) {
      if (settled) return;
      settled = true;
      hideLoading();
      if (!user) redirectToLogin();
    }

    if (RC.data && RC.data.isLive() && RC.fb && RC.fb.auth) {
      /* LIVE: wait for Firebase to resolve auth state. */
      showLoading();
      RC.fb.auth.onAuthStateChanged(function (u) {
        settle(u ? { uid: u.uid } : null);
      });
      setTimeout(function () {
        var u = RC.fb.auth.currentUser;
        settle(u ? { uid: u.uid } : null);
      }, 2500); // safety cap — never hang on a stuck auth check
      return;
    }

<<<<<<< HEAD
    /* Firebase is not configured (or not live) — there is no authentication
       to check, so protected pages redirect to Login. No bypass exists. */
    settle(null);
=======
    /* DEMO: session is in localStorage — resolves synchronously. */
    var user = RC.data ? RC.data.currentUser() : null;
    settle(user);
>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return { init: init };
})();
