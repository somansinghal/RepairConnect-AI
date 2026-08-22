/* ==========================================================================
   RepairConnect AI — Auth (login + signup) behavior
   --------------------------------------------------------------------------
<<<<<<< HEAD
   Firebase Authentication is the ONLY authentication provider:
   • Email/password → RC.data.signIn / signUp (signInWithEmailAndPassword /
     createUserWithEmailAndPassword).
   • Google → RC.data.signInWithGoogle (GoogleAuthProvider + signInWithPopup).
   • Password reset → RC.data.resetPassword (sendPasswordResetEmail).
   • Remember-me → Firebase auth persistence (LOCAL/SESSION).
   When Firebase is not configured, every action fails with a clear, friendly
   message — never a simulated success, never a stuck loading state. Handlers
   guard against a missing RC.data API so the buttons always recover.
=======
   LIVE MODE: Firebase Authentication — email/password, Google popup, password
   reset, remember-me persistence, and a Firestore user document on success.
   DEMO MODE (Firebase not configured): clearly-labelled simulation.
>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356
   Firebase error codes are mapped to user-friendly messages; internal errors
   are never shown verbatim. Passwords are NEVER stored anywhere.
   ========================================================================== */
window.RC = window.RC || {};

RC.auth = (function () {
  "use strict";

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var ERROR_MAP = {
<<<<<<< HEAD
    "auth/invalid-credential": "Incorrect email or password. Please try again.",
    "auth/wrong-password": "Incorrect email or password. Please try again.",
=======
    "auth/invalid-credential": "Invalid email or password.",
    "auth/wrong-password": "Invalid email or password.",
>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356
    "auth/user-not-found": "No account found with this email.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password is too weak — use at least 8 characters.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please try again in a moment.",
<<<<<<< HEAD
    "auth/network-request-failed": "Unable to connect. Check your internet connection and try again.",
    "auth/requires-recent-login": "Please sign in again to continue.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
=======
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/requires-recent-login": "Please sign in again to continue.",
    "auth/popup-closed-by-user": "The sign-in window was closed before finishing.",
>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356
    "auth/popup-blocked": "The sign-in popup was blocked. Please allow popups and try again.",
    "auth/cancelled-popup-request": "Only one sign-in window can be open at a time.",
    "auth/account-exists-with-different-credential": "An account already exists with a different sign-in method.",
    "auth/operation-not-allowed": "This sign-in method isn't enabled for this project yet."
  };

<<<<<<< HEAD
  /* RC.data must be present and expose the auth methods we call; otherwise the
     handlers would throw mid-click and leave the button stuck on a spinner. */
  function hasData() { return !!(window.RC && RC.data); }

  function friendly(err) {
    if (!err) return "Something went wrong. Please try again.";
    if (err.message === "AUTH_NOT_CONFIGURED") return "Authentication is not configured yet. Connect Firebase to enable sign-in.";
    if (err.message === "JUDGE_NOT_CONFIGURED") return "The demo account isn't configured yet.";
    if (err.message === "DEMO_MODE") return "Google sign-in is not currently configured.";
    if (err.message === "GOOGLE_UNAVAILABLE") return "Google sign-in is not currently configured.";
    if (err.message === "AUTH_UNAVAILABLE") return "Authentication is temporarily unavailable. Please try again.";
    var code = err.code || "";
    if (ERROR_MAP[code]) return ERROR_MAP[code];
    if (code && code.indexOf("auth/") === 0) return "Incorrect email or password. Please try again.";
=======
  function friendly(err) {
    if (!err) return "Something went wrong. Please try again.";
    if (err.message === "JUDGE_NOT_CONFIGURED") return "The demo account isn't configured yet.";
    if (err.message === "DEMO_MODE") return "Google sign-in requires Firebase configuration.";
    var code = err.code || "";
    if (ERROR_MAP[code]) return ERROR_MAP[code];
    if (code && code.indexOf("auth/") === 0) return "Authentication failed. Please try again.";
>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356
    return "Something went wrong. Please try again.";
  }

  function setInvalid(field, invalid, message) {
    field.classList.toggle("invalid", invalid);
    var err = field.querySelector(".form-error");
    if (err) err.textContent = invalid ? (message || "") : "";
  }

  function loading(btn, on, label) {
    if (!btn) return;
    btn.disabled = on;
    if (on) {
      btn.dataset.orig = btn.innerHTML;
      btn.innerHTML = '<span class="spinner spinner--dark" aria-hidden="true"></span> ' + label;
    } else if (btn.dataset.orig) {
      btn.innerHTML = btn.dataset.orig;
    }
  }

  function redirectToDashboard() {
    /* Preserve an intended destination passed via ?next= or ?redirect=.
       Only internal .html routes are accepted (no open redirects). */
    var next = RC.getParam("next") || RC.getParam("redirect");
    var allowed = /^(dashboard|analyze|diagnosis|repair-decision|repairers|compare|request-repair|tracking|assistant|profile)\.html$/;
    var target = (next && allowed.test(next)) ? next : "dashboard.html";
    window.location.href = target;
  }

  /* Show a friendly "sign in required" banner when arriving via a redirect. */
  function showRequiredBanner() {
    var banner = document.getElementById("authRequiredBanner");
    if (!banner) return;
    var next = RC.getParam("next") || RC.getParam("redirect");
    if (next) banner.classList.remove("hidden");
  }

  /* ---------- Password show/hide toggles ---------- */
  function bindPasswordToggles() {
    document.querySelectorAll("[data-pw-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var input = document.getElementById(btn.getAttribute("data-pw-toggle"));
        if (!input) return;
        var show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
        btn.setAttribute("aria-pressed", show ? "true" : "false");
        btn.classList.toggle("active", show);
        input.focus();
      });
    });
  }

<<<<<<< HEAD
  /* ---------- Demo account auto-fill (fills email + password for the form) ----------
     The demo credentials are intentionally public test credentials shown in the
     DEMO ACCESS block. The buttons only FILL the form — the user must still
     click Log in, which calls Firebase Authentication. No automatic sign-in,
     no bypass, and no production credentials are ever involved. */
=======
  /* ---------- Demo account auto-fill (fills the form; does NOT bypass auth) ---------- */
>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356
  function bindDemoFill() {
    document.querySelectorAll("[data-fill-email]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var emailEl = document.getElementById("email");
        var passEl = document.getElementById("password");
<<<<<<< HEAD
        if (emailEl) emailEl.value = btn.getAttribute("data-fill-email") || "";
        if (passEl) passEl.value = btn.getAttribute("data-fill-password") || "";
        if (RC.toast) RC.toast("Demo credentials filled — click Log in to continue.", "info");
        if (passEl) passEl.focus();
        else if (emailEl) emailEl.focus();
      });
    });
  }

  /* ---------- Demo password copy buttons ----------
     Copies ONLY the demo password next to the button (never anything else),
     with a "Copied!" confirmation. Clipboard data is never sent anywhere. */
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  function bindDemoCopy() {
    document.querySelectorAll("[data-copy-target]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = document.getElementById(btn.getAttribute("data-copy-target"));
        if (!target) return;
        var text = target.textContent || "";
        function done() {
          var orig = btn.textContent;
          btn.textContent = "Copied!";
          btn.classList.add("copied");
          setTimeout(function () {
            btn.textContent = orig;
            btn.classList.remove("copied");
          }, 1500);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
        } else {
          fallbackCopy(text);
          done();
        }
=======
        if (emailEl) emailEl.value = btn.getAttribute("data-fill-email");
        if (passEl) passEl.value = btn.getAttribute("data-fill-password");
        if (passEl && passEl.type === "password" && passEl.closest(".password-wrap")) {
          // reveal nothing; keep it hidden — the user still clicks Login
        }
        if (RC.toast) RC.toast("Demo credentials filled — click Login to continue.", "info");
        if (emailEl) emailEl.focus();
>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356
      });
    });
  }

  /* ---------- Password strength meter (signup only) ---------- */
  function strengthOf(pw) {
    if (!pw) return 0;
    var score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return Math.min(4, score);
  }

  function bindStrength() {
    var input = document.getElementById("password");
    var fill = document.getElementById("pwStrengthFill");
    var label = document.getElementById("pwStrengthLabel");
    if (!input || !fill || !label) return;

    var LEVELS = [
      { w: "0%", color: "var(--danger)", text: "Password strength" },
      { w: "25%", color: "var(--danger)", text: "Weak — add more characters" },
      { w: "50%", color: "var(--warn)", text: "Okay — mix cases or add numbers" },
      { w: "75%", color: "var(--success)", text: "Good password" },
      { w: "100%", color: "var(--success)", text: "Strong password" }
    ];

    input.addEventListener("input", function () {
      var lvl = LEVELS[strengthOf(input.value)];
      fill.style.width = lvl.w;
      fill.style.background = lvl.color;
      label.textContent = lvl.text;
    });
  }

  function init() {
    bindPasswordToggles();
    bindDemoFill();
<<<<<<< HEAD
    bindDemoCopy();
    bindStrength();
    showRequiredBanner();

    /* Honest status: when Firebase isn't connected, say so — never pretend
       sign-in can succeed. */
    if (RC.data && !RC.data.isLive()) {
      var cfg = document.getElementById("authConfigBanner");
      if (cfg) cfg.classList.remove("hidden");
    }

=======
    bindStrength();
    showRequiredBanner();

>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356
    var form = document.getElementById("authForm");
    if (!form) return;

    var email = document.getElementById("email");
    var password = document.getElementById("password");
    var name = document.getElementById("name");
    var confirm = document.getElementById("confirm");
    var terms = document.getElementById("terms");
    var remember = document.getElementById("rememberMe");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = true;

      if (name) {
        if (name.value.trim().length < 2) { setInvalid(name.closest(".field"), true, "Please enter your full name."); valid = false; }
        else setInvalid(name.closest(".field"), false);
      }
      if (!email || !EMAIL_RE.test(email.value.trim())) { setInvalid(email.closest(".field"), true, "Enter a valid email address."); valid = false; }
      else setInvalid(email.closest(".field"), false);
      if (!password || password.value.length < 8) { setInvalid(password.closest(".field"), true, "Password must be at least 8 characters."); valid = false; }
      else setInvalid(password.closest(".field"), false);
      if (confirm) {
        if (confirm.value !== password.value) { setInvalid(confirm.closest(".field"), true, "Passwords do not match."); valid = false; }
        else setInvalid(confirm.closest(".field"), false);
      }
      if (terms && !terms.checked) {
        setInvalid(terms.closest(".check-row"), true, "Please accept the Terms of Service to continue.");
        valid = false;
      } else if (terms) setInvalid(terms.closest(".check-row"), false);
      if (!valid) return;

      var btn = form.querySelector("button[type='submit']");
<<<<<<< HEAD
      var data = hasData() ? RC.data : null;
      var isSignUp = !!name;
      if (!data ||
          (isSignUp ? typeof data.signUp !== "function" : typeof data.signIn !== "function")) {
        /* Auth layer missing → recover the button and fail clearly; never hang. */
        loading(btn, false);
        RC.toast("Authentication is temporarily unavailable. Please try again.", "error");
        return;
      }

      loading(btn, true, isSignUp ? "Creating account…" : "Signing in…");

      var action;
      var rememberStep;
      try {
        action = isSignUp
          ? data.signUp(name.value.trim(), email.value.trim(), password.value)
          : data.signIn(email.value.trim(), password.value);
        /* Apply remember-me persistence BEFORE the sign-in attempt. */
        rememberStep = (typeof data.setRememberMe === "function")
          ? data.setRememberMe(!remember || remember.checked)
          : Promise.resolve();
      } catch (err) {
        loading(btn, false);
        RC.toast("Authentication is temporarily unavailable. Please try again.", "error");
        return;
      }

      rememberStep.then(function () {
        return action;
      }).then(function () {
        RC.toast(isSignUp ? "Account created." : "Welcome back!", "success");
=======
      loading(btn, true, name ? "Creating account…" : "Signing in…");

      var action = name
        ? RC.data.signUp(name.value.trim(), email.value.trim(), password.value)
        : RC.data.signIn(email.value.trim(), password.value);

      /* Apply remember-me persistence BEFORE the sign-in attempt. */
      RC.data.setRememberMe(!remember || remember.checked).then(function () {
        return action;
      }).then(function () {
        RC.toast(name ? "Account created." : "Welcome back!", "success");
>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356
        setTimeout(redirectToDashboard, 400);
      }).catch(function (err) {
        loading(btn, false);
        RC.toast(friendly(err), "error");
      });
    });

    /* Forgot password — real reset flow. */
    var forgot = document.getElementById("forgotLink");
    if (forgot) {
      forgot.addEventListener("click", function (e) {
        e.preventDefault();
        var em = email && email.value.trim();
        if (!em || !EMAIL_RE.test(em)) {
          setInvalid(email.closest(".field"), true, "Enter your email address first, then reset.");
          return;
        }
<<<<<<< HEAD
        if (!hasData() || typeof RC.data.resetPassword !== "function") {
          RC.toast("Authentication is temporarily unavailable. Please try again.", "error");
          return;
        }
        RC.data.resetPassword(em).then(function () {
          RC.toast("If an account exists for this email, we've sent password reset instructions.", "success");
        }).catch(function (err) {
          if (err && err.message === "AUTH_NOT_CONFIGURED") {
            RC.toast("Authentication is not configured yet.", "error");
            return;
          }
=======
        RC.data.resetPassword(em).then(function () {
          RC.toast("If an account exists for this email, we've sent password reset instructions.", "success");
        }).catch(function () {
>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356
          /* Account-enumeration safe: same message regardless of outcome. */
          RC.toast("If an account exists for this email, we've sent password reset instructions.", "success");
        });
      });
    }

    /* Google sign-in (real Firebase popup; friendly fallback when unconfigured). */
    var social = document.querySelector(".social-btn");
    if (social) {
<<<<<<< HEAD
      if (!hasData() || (typeof RC.data.isLive === "function" && !RC.data.isLive())) {
=======
      if (!RC.data.isLive()) {
>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356
        /* Honest labelling — Google sign-in is not configured yet. */
        social.setAttribute("aria-label", "Continue with Google (sign-in not configured)");
        var tag = document.createElement("span");
        tag.className = "badge badge-neutral";
        tag.style.marginLeft = "8px";
        tag.textContent = "Coming soon";
        social.appendChild(tag);
      }
      social.addEventListener("click", function () {
<<<<<<< HEAD
        var data = hasData() ? RC.data : null;
        if (!data || typeof data.signInWithGoogle !== "function") {
          /* Missing API → clear message; the button never gets stuck. */
          RC.toast("Google sign-in is not currently configured.", "error");
          return;
        }
        loading(social, true, "Connecting…");
        var attempt;
        try {
          attempt = data.signInWithGoogle();
        } catch (err) {
          loading(social, false);
          RC.toast("Google sign-in is not currently configured.", "error");
          return;
        }
        attempt.then(function () {
=======
        loading(social, true, "Connecting…");
        RC.data.signInWithGoogle().then(function () {
>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356
          RC.toast("Signed in with Google.", "success");
          setTimeout(redirectToDashboard, 400);
        }).catch(function (err) {
          loading(social, false);
          RC.toast(friendly(err), "error");
        });
      });
    }
  }

  return { init: init };
})();
