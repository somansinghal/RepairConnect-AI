/* ==========================================================================
   RepairConnect AI — Repair vs Replace screen renderer
   --------------------------------------------------------------------------
   Loads the diagnosis by ?id= (Firestore live / demo fallback) and renders the
   deterministic recommendation. Financial figures come from the backend's
   estimate engine — this renderer only displays them (never invents prices).
   ========================================================================== */
window.RC = window.RC || {};

RC.repairDecision = (function () {
  "use strict";

  /* Normalize either a demo or Firestore diagnosis into one display shape. */
  function toDisplay(d) {
    var rec = (d && d.recommendation) || {};
    var cost = rec.estimatedRepairCost || {};
    var point = (typeof rec.pointEstimate === "number" ? rec.pointEstimate : cost.point) ||
                (cost.min != null ? Math.round((cost.min + cost.max) / 2) : null);
    return {
      id: d.id || null,
      severity: d.severity || "moderate",
      verdict: rec.verdict || "consider_repair",
      point: point,
      min: cost.min != null ? cost.min : null,
      max: cost.max != null ? cost.max : null,
      replacementValue: rec.replacementValue != null ? rec.replacementValue : null,
      repairCostRatio: rec.repairCostRatio,
      decisionScore: rec.decisionScore,
      explanation: rec.explanation || "",
      disclaimer: d.disclaimer || ""
    };
  }

  function render(d) {
    var vm = RC.verdictMeta[d.verdict] || RC.verdictMeta.consider_repair;
    var sev = RC.severityMeta[d.severity] || { label: "Medium" };

    var vc = document.getElementById("verdictCard");
    if (vc) {
      vc.className = "verdict-card " + vm.cls;
      vc.innerHTML =
        '<div class="v-emoji">' + vm.emoji + "</div>" +
        '<div class="v-title">' + RC.escape(vm.label) + "</div>" +
        '<div class="v-sub">Based on the estimated repair and replacement costs</div>';
    }

    var repVal = document.getElementById("repairVal");
    if (repVal) repVal.textContent = d.point != null ? RC.inr(d.point) : "—";
    var repRange = document.getElementById("repairRange");
    if (repRange) repRange.textContent = d.min != null ? (RC.inr(d.min) + " – " + RC.inr(d.max)) : "—";
    var replVal = document.getElementById("replacementVal");
    if (replVal) replVal.textContent = d.replacementValue != null ? RC.inr(d.replacementValue) + "+" : "—";

    var ratioNum = document.getElementById("ratioNum");
    if (ratioNum) ratioNum.textContent = d.repairCostRatio != null ? RC.percent(d.repairCostRatio) : "—";

    var ring = document.getElementById("decisionRing");
    var score = (typeof d.decisionScore === "number") ? Math.round(d.decisionScore) : 0;
    if (ring) {
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var numEl = ring.querySelector(".ring-num");
      if (reduce || !window.requestAnimationFrame) {
        ring.style.setProperty("--val", score);
        if (numEl) numEl.textContent = score;
      } else {
        var start = null, dur = 900;
        function frame(ts) {
          if (!start) start = ts;
          var p = Math.min(1, (ts - start) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          var val = Math.round(score * eased);
          ring.style.setProperty("--val", val);
          if (numEl) numEl.textContent = val;
          if (p < 1) window.requestAnimationFrame(frame);
        }
        window.requestAnimationFrame(frame);
      }
    }

    var factorsEl = document.getElementById("factors");
    if (factorsEl) {
      var sevPct = { minor: 25, moderate: 50, major: 75, severe: 95 }[d.severity] || 50;
      var repairabilityPct = d.verdict === "repair_recommended" ? 85 : d.verdict === "consider_repair" ? 55 : 25;
      factorsEl.innerHTML =
        '<div class="bar-row"><div class="bar-top"><span class="lbl">Damage severity</span><span class="val">' + RC.escape(sev.label) + '</span></div>' +
        '<div class="bar"><div class="bar-fill" style="width:' + sevPct + '%;background:var(--warn)"></div></div></div>' +
        '<div class="bar-row"><div class="bar-top"><span class="lbl">Repairability</span><span class="val">' + RC.escape(vm.short || vm.label) + '</span></div>' +
        '<div class="bar"><div class="bar-fill" style="width:' + repairabilityPct + '%;background:var(--success)"></div></div></div>' +
        '<div class="bar-row"><div class="bar-top"><span class="lbl">Repair score</span><span class="val">' + score + ' / 100</span></div>' +
        '<div class="bar"><div class="bar-fill" style="width:' + score + '%"></div></div></div>';
    }

    var explEl = document.getElementById("explanation");
    if (explEl) explEl.textContent = d.explanation;

    var lifespanEl = document.getElementById("lifespanText");
    if (lifespanEl) {
      lifespanEl.textContent = d.verdict === "repair_recommended"
        ? "Repairing is expected to extend this device's useful life; confirm the exact lifespan with the repairer."
        : "Replacement may be the more sensible path for this device's remaining lifespan.";
    }
    var envEl = document.getElementById("envBenefitText");
    if (envEl) {
      envEl.textContent = "Repairing keeps the device's materials in use and avoids manufacturing a full replacement. (Figures are estimates, not quotes.)";
    }

    /* Carry the diagnosis forward to the repairer flow. */
    var findBtn = document.getElementById("findRepairersBtn");
    if (findBtn) {
      findBtn.href = "repairers.html" + (d.id ? "?diagnosis=" + encodeURIComponent(d.id) : "");
    }
  }

  function showError() {
    var wrap = document.querySelector(".decision-hero");
    if (wrap) {
      wrap.innerHTML =
        '<div class="error-state" style="grid-column:1/-1">' + RC.icon("warn") +
        "<h3>We couldn't load this recommendation.</h3>" +
        "<p>The diagnosis may have been removed, or there's a connection problem.</p>" +
        '<div class="row mt-16" style="justify-content:center;gap:10px"><a class="btn btn-primary" href="diagnosis.html">Back to diagnosis</a>' +
        '<a class="btn btn-outline" href="dashboard.html">Dashboard</a></div></div>';
    }
  }

  function init() {
    var id = RC.getParam("id");

    var promise = id ? RC.data.getDiagnosis(id) : Promise.resolve(RCData.activeDiagnosis);

    promise.then(function (doc) {
      if (!doc) { showError(); return; }
      render(toDisplay(doc));
    }).catch(function () {
      if (!RC.data.isLive()) {
        render(toDisplay(RCData.activeDiagnosis));
      } else {
        showError();
      }
    });
  }

  return { init: init };
})();
