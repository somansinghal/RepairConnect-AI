/* ==========================================================================
   RepairConnect AI — App bootstrap (shared across all pages)
   Loaded last. Wires the navigation and shared footer year. Kept tiny so the
   product stays fast; page-specific behavior lives in each page module.
   ========================================================================== */
window.RC = window.RC || {};

document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  if (RC.theme) RC.theme.init();
  if (RC.navigation) RC.navigation.init();
  if (RC.errors) RC.errors.init();
  if (RC.data) RC.data.init();

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Any element with [data-demo-toast] shows a demo notice on click —
     used for controls that will later trigger Firebase/Groq calls. */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-demo-toast]");
    if (t && RC.toast) {
      RC.toast(t.getAttribute("data-demo-toast"), t.getAttribute("data-demo-type") || "info");
    }
  });

  /* "Try Demo" entry — enters DEMO MODE (no real account) and navigates.
     Clearly labelled; does not touch authentication architecture.
     Defensive: only navigate to an allow-listed internal page. */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-demo-enter]");
    if (!t) return;
    e.preventDefault();
    var href = t.getAttribute("href") || "";
    var allowed = /^(dashboard|index|analyze|repairers|assistant|tracking|profile)\.html$/;
    if (!allowed.test(href)) return; // never follow arbitrary/unsafe targets
    if (RC.toast) RC.toast("Entering demo mode — sample data, no real account.", "info");
    /* Establish a demo session FIRST so the auth guard accepts the visit.
       RC.demo is available on every page (including public ones without the
       full data-service). */
    var done = (RC.data && RC.data.enterDemo)
      ? RC.data.enterDemo()
      : (RC.demo ? RC.demo.enter() : Promise.resolve());
    done.then(function () { window.location.href = href; });
  });

  /* Dispatch to the page module named by <body data-page="...">.
     Kebab-case page keys are normalized to camelCase namespace keys. */
  var pageKey = document.body.getAttribute("data-page");
  if (pageKey) {
    var ns = pageKey.replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); });
    if (RC[ns] && typeof RC[ns].init === "function") RC[ns].init();
  }
});
