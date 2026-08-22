/* ==========================================================================
   RepairConnect AI — Global error handling (frontend)
   Catches unexpected errors + unhandled promise rejections and shows a
   friendly, generic notice. NEVER exposes stack traces, internal paths,
   secrets, or infrastructure details to the user (or the console).
   ========================================================================== */
window.RC = window.RC || {};

RC.errors = (function () {
  "use strict";

  function report() {
    /* Intentionally generic — no stack traces, paths, or config details. */
    if (window.RC && typeof RC.toast === "function") {
      RC.toast("Something went wrong. Please try again.", "error");
    }
  }

  function init() {
    window.addEventListener("error", function () {
      report();
    });
    window.addEventListener("unhandledrejection", function () {
      report();
    });
  }

  return { init: init };
})();
