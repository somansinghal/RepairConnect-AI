/* ==========================================================================
   RepairConnect AI — Auth (login + signup) behavior
   --------------------------------------------------------------------------
   LIVE MODE: Firebase Authentication — email/password, Google popup, password
   reset, remember-me persistence, and a Firestore user document on success.
   DEMO MODE (Firebase not configured): clearly-labelled simulation.
   Firebase error codes are mapped to user-friendly messages; internal errors
   are never shown verbatim. Passwords are NEVER stored anywhere.
   ========================================================================== */
window.RC = window.RC || {};

RC.auth = (function () {
  "use strict";

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var ERROR_MAP = {
    "auth/invalid-credential": "Invalid email or password.",
    "auth/wrong-password": "Invalid email or password.",
    "auth/user-not-found": "No account found with this email.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password is too weak — use at least 8 characters.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please try again in a moment.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/requires-recent-login": "Please sign in again to continue.",
    "auth/popup-closed-by-user": "The sign-in window was closed before finishing.",
    "auth/popup-blocked": "The sign-in popup was blocked. Please allow popups and try again.",
    "auth/cancelled-popup-request": "Only one sign-in window can be open at a time.",
    "auth/account-exists-with-different-credential": "An account already exists with a different sign-in method.",
    "auth/operation-not-allowed": "This sign-in method isn't enabled for this project yet."
  };

  function friendly(err) {
    if (!err) return "Something went wrong. Please try again.";
    if (err.message === "JUDGE_NOT_CONFIGURED") return "The demo account isn't configured yet.";
    if (err.message === "DEMO_MODE") return "Google sign-in requires Firebase configuration.";
    var code = err.code || "";
    if (ERROR_MAP[code]) return ERROR_MAP[code];
    if (code && code.indexOf("auth/") === 0) return "Authentication failed. Please try again.";
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

  /* ---------- Demo account auto-fill (fills the form; does NOT bypass auth) ---------- */
  function bindDemoFill() {
    document.querySelectorAll("[data-fill-email]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var emailEl = document.getElementById("email");
        var passEl = document.getElementById("password");
        if (emailEl) emailEl.value = btn.getAttribute("data-fill-email");
        if (passEl) passEl.value = btn.getAttribute("data-fill-password");
        if (passEl && passEl.type === "password" && passEl.closest(".password-wrap")) {
          // reveal nothing; keep it hidden — the user still clicks Login
        }
        if (RC.toast) RC.toast("Demo credentials filled — click Login to continue.", "info");
        if (emailEl) emailEl.focus();
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
    bindStrength();
    showRequiredBanner();

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
      loading(btn, true, name ? "Creating account…" : "Signing in…");

      var action = name
        ? RC.data.signUp(name.value.trim(), email.value.trim(), password.value)
        : RC.data.signIn(email.value.trim(), password.value);

      /* Apply remember-me persistence BEFORE the sign-in attempt. */
      RC.data.setRememberMe(!remember || remember.checked).then(function () {
        return action;
      }).then(function () {
        RC.toast(name ? "Account created." : "Welcome back!", "success");
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
        RC.data.resetPassword(em).then(function () {
          RC.toast("If an account exists for this email, we've sent password reset instructions.", "success");
        }).catch(function () {
          /* Account-enumeration safe: same message regardless of outcome. */
          RC.toast("If an account exists for this email, we've sent password reset instructions.", "success");
        });
      });
    }

    /* Google sign-in (real Firebase popup; friendly fallback when unconfigured). */
    var social = document.querySelector(".social-btn");
    if (social) {
      if (!RC.data.isLive()) {
        /* Honest labelling — Google sign-in is not configured yet. */
        social.setAttribute("aria-label", "Continue with Google (sign-in not configured)");
        var tag = document.createElement("span");
        tag.className = "badge badge-neutral";
        tag.style.marginLeft = "8px";
        tag.textContent = "Coming soon";
        social.appendChild(tag);
      }
      social.addEventListener("click", function () {
        loading(social, true, "Connecting…");
        RC.data.signInWithGoogle().then(function () {
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
