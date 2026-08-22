/* ==========================================================================
   RepairConnect AI — Theme toggle (reliable two-state Light / Dark)
   --------------------------------------------------------------------------
   Fix notes:
   • Previously the button cycled Light → Dark → System → Light; when the OS
     preference matched the resolved theme, two of the three states looked
     identical, so clicking appeared to do nothing. It is now a reliable
     two-state toggle: click switches Light ⇄ Dark and stores the explicit
     preference.
   • On first visit (no saved preference) the OS scheme is respected; the
     first click stores an explicit choice.
   • Adds a subtle cross-fade transition on switch (respects reduced motion)
     and keeps the <meta name="theme-color"> in sync for mobile UI chrome.
   ========================================================================== */
window.RC = window.RC || {};

RC.theme = (function () {
  "use strict";

  function pref() {
    try { return localStorage.getItem("rc-theme") || "system"; } catch (e) { return "system"; }
  }

  function resolvedDark(p) {
    if (p === "dark") return true;
    if (p === "light") return false;
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  function apply(p, animate) {
    var dark = resolvedDark(p);
    var root = document.documentElement;

    if (animate) root.classList.add("theme-transition");

    root.setAttribute("data-theme", dark ? "dark" : "light");
    root.setAttribute("data-theme-pref", p);
    try { localStorage.setItem("rc-theme", p); } catch (e) {}

    /* Keep the browser chrome colour in sync (mobile address bar). */
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0B1424" : "#0A5FE0");

    var btn = document.getElementById("themeToggle");
    if (btn) {
      var label = dark ? "Switch to light theme" : "Switch to dark theme";
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
    }

    if (animate) {
      setTimeout(function () { root.classList.remove("theme-transition"); }, 320);
    }
  }

  function init() {
    var btn = document.getElementById("themeToggle");
    if (!btn) return;

    apply(pref(), false);

    btn.addEventListener("click", function () {
      apply(resolvedDark(pref()) ? "light" : "dark", true);
    });

    /* Follow OS preference live only until the user makes an explicit choice. */
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      var onChange = function () { if (pref() === "system") apply("system", false); };
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  return { init: init };
})();
