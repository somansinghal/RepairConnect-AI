/* ==========================================================================
   RepairConnect AI — Diagnosis screen renderer
   Loads the diagnosis by ?id= from Firestore (live) or falls back to the
   clearly-labelled demo diagnosis (demo mode). Normalizes the stored shape
   into one display object, then renders. AI output is always escaped.
   ========================================================================== */
window.RC = window.RC || {};

RC.diagnosis = (function () {
  "use strict";

  /* Map either a demo or Firestore diagnosis into a unified display shape. */
  function toDisplay(d) {
    var rec = d.recommendation || {};
    return {
      device: d.detectedDevice || d.device || "Unidentified device",
      damage: d.detectedDamage || d.damage || "—",
      severity: d.severity || "moderate",
      confidence: typeof d.confidence === "number" ? d.confidence : 0,
      observations: d.observations || [],
      possibleCauses: d.possibleCauses || [],
      troubleshooting: d.troubleshooting || [],
      warnings: d.warnings || [],
      professionalInspectionAdvised: !!d.professionalInspectionAdvised,
      disclaimer: d.disclaimer || "",
      recommendation: {
        min: rec.estimatedRepairCost ? rec.estimatedRepairCost.min : null,
        max: rec.estimatedRepairCost ? rec.estimatedRepairCost.max : null,
        replacementValue: rec.replacementValue || null,
        verdict: rec.verdict || "consider_repair",
        lifespan: rec.estimatedLifespanYears || null,
        env: rec.environmentalBenefit || "Repairing keeps the device's materials in use and avoids manufacturing a full replacement."
      },
      createdAt: d.createdAt || null,
      aiProvider: d.aiProvider || null
    };
  }

  function render(d) {
    var sev = RC.severityMeta[d.severity] || { label: "Medium", cls: "sev-medium" };
    var sevEl = document.getElementById("dSeverity");
    if (sevEl) { sevEl.className = "sev-pill " + sev.cls; sevEl.textContent = sev.label; }

    var confEl = document.getElementById("dConfidence");
    if (confEl) confEl.textContent = RC.percent(d.confidence);
    var confBadge = document.getElementById("dConfBadge");
    if (confBadge) {
      var cm = RC.confidenceMeta(d.confidence);
      confBadge.className = "badge " + cm.cls;
      confBadge.textContent = cm.label;
    }
    var devEl = document.getElementById("dDevice");
    if (devEl) devEl.textContent = d.device;
    var issueEl = document.getElementById("dIssue");
    if (issueEl) issueEl.textContent = d.damage;

    /* provider chip (truthful about what generated the result) */
    var chip = document.getElementById("dSource");
    if (chip) {
      if (d.aiProvider) chip.textContent = d.aiProvider === "openai" ? "OpenAI" : d.aiProvider === "groq" ? "Groq (fallback)" : d.aiProvider;
      else chip.textContent = RC.data.isLive() ? "AI analysis" : "Demo data";
    }

    var obsEl = document.getElementById("dObservations");
    if (obsEl) {
      obsEl.innerHTML = "";
      if (!d.observations.length) {
        obsEl.innerHTML = '<li><span class="muted small">No visible observations recorded.</span></li>';
      }
      d.observations.forEach(function (o) {
        var li = document.createElement("li");
        li.innerHTML = RC.icon("check") + "<span>" + RC.escape(o) + "</span>";
        obsEl.appendChild(li);
      });
    }

    var repEst = document.getElementById("dRepairEstimate");
    var replEst = document.getElementById("dReplacementEstimate");
    var verdictEl = document.getElementById("dVerdict");
    if (repEst && d.recommendation.min != null) repEst.textContent = RC.inr(d.recommendation.min) + " – " + RC.inr(d.recommendation.max);
    if (replEst && d.recommendation.replacementValue != null) replEst.textContent = RC.inr(d.recommendation.replacementValue) + "+";
    if (verdictEl) {
      var vm = RC.verdictMeta[d.recommendation.verdict] || { label: "—", emoji: "", short: "—" };
      verdictEl.innerHTML = '<span class="badge badge-success">' + vm.emoji + " " + RC.escape(vm.short || vm.label) + "</span>";
    }

    var causesEl = document.getElementById("dCauses");
    if (causesEl) {
      causesEl.innerHTML = "";
      d.possibleCauses.forEach(function (c) {
        var text = typeof c === "string" ? c : c.text;
        var kind = typeof c === "object" && c.kind === "visible" ? "visible" : "inferred";
        var li = document.createElement("li");
        li.innerHTML = RC.icon("info") + "<span>" + RC.escape(text) +
          '<span class="tag-infer" style="color:' + (kind === "visible" ? "var(--success)" : "var(--muted-2)") + '">(' +
          (kind === "visible" ? "visible" : "possible — not visible") + ")</span></span>";
        causesEl.appendChild(li);
      });
    }

    var stepsEl = document.getElementById("dSteps");
    if (stepsEl) {
      stepsEl.innerHTML = "";
      d.troubleshooting.forEach(function (s) {
        var step = typeof s === "string" ? s : s.step;
        var note = typeof s === "object" && s.safetyNote ? s.safetyNote : "";
        var li = document.createElement("li");
        li.innerHTML = '<span class="tick">' + RC.icon("check") + "</span><span>" + RC.escape(step) +
          (note ? '<span class="safety-note">' + RC.icon("warn") + " " + RC.escape(note) + "</span>" : "") + "</span>";
        stepsEl.appendChild(li);
      });
    }

    var warnEl = document.getElementById("dWarnings");
    if (warnEl) {
      warnEl.innerHTML = "";
      d.warnings.forEach(function (w) {
        var div = document.createElement("div");
        div.className = "alert alert-warn";
        div.innerHTML = RC.icon("warn") + "<div><p>" + RC.escape(w) + "</p></div>";
        warnEl.appendChild(div);
      });
      if (d.disclaimer) {
        var dis = document.createElement("div");
        dis.className = "alert alert-info";
        dis.innerHTML = RC.icon("info") + "<div><strong>Preliminary assessment</strong><p>" + RC.escape(d.disclaimer) + "</p></div>";
        warnEl.appendChild(dis);
      }
    }

    var proEl = document.getElementById("dProInspection");
    if (proEl) proEl.classList.toggle("hidden", !d.professionalInspectionAdvised);
  }

  function showError() {
    var wrap = document.querySelector(".diag-hero");
    if (wrap) {
      wrap.innerHTML =
        '<div class="error-state" style="grid-column:1/-1">' + RC.icon("warn") +
        "<h3>We couldn't load this diagnosis.</h3>" +
        "<p>It may have been removed, or there's a connection problem. Please try again.</p>" +
        '<div class="row mt-16" style="justify-content:center;gap:10px"><a class="btn btn-primary" href="analyze.html">Analyze again</a>' +
        '<a class="btn btn-outline" href="dashboard.html">Dashboard</a></div></div>';
    }
  }

  function init() {
    var id = RC.getParam("id");
    var loader = document.getElementById("diagLoader");
    if (loader) loader.classList.remove("hidden");

    var promise;
    if (id) {
      promise = RC.data.getDiagnosis(id);
    } else {
      promise = Promise.resolve(RCData.activeDiagnosis);
    }

    promise.then(function (doc) {
      if (loader) loader.classList.add("hidden");
      if (!doc) { showError(); return; }
      var did = doc.id || id || null;
      var cta = document.getElementById("checkRepairabilityBtn");
      if (cta) cta.href = "repair-decision.html" + (did ? "?id=" + encodeURIComponent(did) : "");
      render(toDisplay(doc));
    }).catch(function () {
      if (loader) loader.classList.add("hidden");
      /* demo/graceful fallback only when not live */
      if (!RC.data.isLive()) {
        render(toDisplay(RCData.activeDiagnosis));
      } else {
        showError();
      }
    });
  }

  return { init: init };
})();
