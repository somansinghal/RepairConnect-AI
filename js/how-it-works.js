/* ==========================================================================
   RepairConnect AI — How It Works page interactions
   Clicking a step updates the detail panel without reloading the page.
   ========================================================================== */
window.RC = window.RC || {};

RC.howItWorks = (function () {
  "use strict";

  var STEPS = [
    { t: "Identify the problem", d: "Start by telling us what's broken. A short description — \"my laptop fell and the screen cracked\" — is enough to begin.", note: "" },
    { t: "Upload media", d: "Add a clear photo of the damaged area. JPG, PNG, and WebP up to 5 MB are accepted; a short video works where supported.", note: "" },
    { t: "AI analysis", d: "The AI identifies the device and visible damage, and lists possible causes — clearly separating what it can see from what it infers.", note: "Demo / mock in the current build — the backend is implemented in code but requires configuration to go live." },
    { t: "Understand possible causes", d: "Review the structured diagnosis: severity, confidence, possible causes, and safety warnings — never certainty about hidden damage.", note: "" },
    { t: "Repair vs replace", d: "A deterministic estimate compares repair cost with replacement value, giving you a transparent repair-vs-replace recommendation.", note: "" },
    { t: "Find repairers", d: "See nearby repair professionals on a map, ranked by distance, rating, price, expertise, and turnaround.", note: "Demo providers are samples, not real businesses." },
    { t: "Request repair", d: "Send a repair request with your preferred date, time, and notes — tied to your diagnosis and chosen repairer.", note: "" },
    { t: "Track repair", d: "Follow the status timeline: Requested → Accepted → Scheduled → Received → In Progress → Ready → Completed.", note: "" },
    { t: "Complete repair", d: "Your item is fixed. Every diagnosis and request stays in your history for future reference.", note: "" }
  ];

  function init() {
    var stepsEl = document.getElementById("wiSteps");
    var detail = document.getElementById("wiDetail");
    if (!stepsEl || !detail) return;

    var buttons = stepsEl.querySelectorAll(".wi-step");
    function activate(i) {
      buttons.forEach(function (b, idx) {
        b.classList.toggle("active", idx === i);
        b.setAttribute("aria-selected", idx === i ? "true" : "false");
      });
      var s = STEPS[i];
      detail.innerHTML =
        '<div class="wd-step">Step ' + (i + 1) + " of " + STEPS.length + "</div>" +
        "<h2>" + s.t + "</h2>" +
        "<p>" + s.d + "</p>" +
        (s.note ? '<div class="wd-note">⚠ ' + s.note + "</div>" : "");
    }
    buttons.forEach(function (b, i) {
      b.addEventListener("click", function () { activate(i); });
    });
    activate(0);
  }

  return { init: init };
})();
