/* ==========================================================================
   RepairConnect AI — Authentication-aware header UI
   --------------------------------------------------------------------------
   Renders the user's auth state into the #authArea slot of the top bar:
     • Signed in   → avatar with the user's initials (links to Profile).
     • Signed out  → Login / Analyze CTAs (Sign up on the login page).
   Listens to the Firebase auth-state listener (or demo current user) so the
   top bar stays correct across pages and sessions.
   ========================================================================== */
window.RC = window.RC || {};

RC.authUI = (function () {
  "use strict";

  function page() {
    return (location.pathname.split("/").pop() || "index.html").toLowerCase();
  }

  function initials(u) {
    var src = u.name || u.email || "U";
    return src.split(/[\s@.]+/).filter(Boolean).map(function (s) { return s[0]; })
      .slice(0, 2).join("").toUpperCase() || "U";
  }

  function render() {
    var area = document.getElementById("authArea");
    if (!area) return;

    var p = page();
    var u = RC.data ? RC.data.currentUser() : null;

    // Auth screens always show their CTA — never a session avatar.
    if (p === "login.html" || p === "signup.html") {
      area.innerHTML = p === "login.html"
        ? '<a class="btn btn-outline" href="signup.html">Sign up</a>'
        : '<a class="btn btn-outline" href="login.html">Login</a>';
      return;
    }

    if (u && u.uid) {
      var initial = initials(u);
      var label = u.name || u.email || "Profile";
      area.innerHTML =
        '<a class="avatar" href="profile.html" aria-label="Open profile — ' + RC.escape(label) + '" title="' + RC.escape(label) + '">' +
        RC.escape(initial) + "</a>";
      return;
    }

    // Signed out
    area.innerHTML =
      '<a class="btn btn-ghost" href="login.html">Login</a>' +
      '<a class="btn btn-primary" href="signup.html">Get Started</a>';
  }

  function init() {
    if (RC.data && RC.data.onAuthChange) {
      RC.data.onAuthChange(function () { render(); });
    } else {
      render();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return { init: init, render: render };
})();
