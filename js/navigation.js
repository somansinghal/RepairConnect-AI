/* ==========================================================================
   RepairConnect AI — Navigation (header behavior shared across pages)
   Responsibilities: mobile nav toggle, active-link highlighting, demo auth
   state chip. No network calls, no secrets.
   ========================================================================== */
window.RC = window.RC || {};

RC.navigation = (function () {
  "use strict";

  function init() {
    var toggle = document.getElementById("navToggle");
    var nav = document.getElementById("mainNav");

    function closeMenu() {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    }

    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      });
      nav.addEventListener("click", function (e) {
        if (e.target.closest("a")) closeMenu();
      });
      /* Close on outside click (touch + mouse). */
      document.addEventListener("click", function (e) {
        if (nav.classList.contains("open") &&
            !e.target.closest("#mainNav") && !e.target.closest("#navToggle")) {
          closeMenu();
        }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeMenu();
      });
      /* Reset state when crossing back to desktop (nav becomes static). */
      var desktopMq = window.matchMedia("(min-width: 901px)");
      var onMq = function (e) { if (e.matches) closeMenu(); };
      if (desktopMq.addEventListener) desktopMq.addEventListener("change", onMq);
      else if (desktopMq.addListener) desktopMq.addListener(onMq);
    }

    /* Highlight the nav link matching the current page. */
    var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    document.querySelectorAll(".main-nav .nav-link").forEach(function (a) {
      var href = (a.getAttribute("href") || "").toLowerCase();
      if (href === page || (page === "" && href === "index.html")) {
        a.classList.add("active");
        a.setAttribute("aria-current", "page");
      }
    });
  }

  return { init: init };
})();
