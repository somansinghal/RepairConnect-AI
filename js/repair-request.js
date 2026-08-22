/* ==========================================================================
   RepairConnect AI — Repair Request screen
   Loads the selected provider + the diagnosis (by ?diagnosis=) and persists a
   `repairRequests` doc (+ initial `repairStatusHistory` event) via RC.data.
   Prevents duplicate submissions. Falls back to clearly-labelled demo data
   when the backend isn't configured.
   ========================================================================== */
window.RC = window.RC || {};

RC.repairRequest = (function () {
  "use strict";

  var diagnosisId = RC.getParam("diagnosis") || "";
  var submitting = false;

  function init() {
    var providerId = RC.getParam("provider");
    var provider = RCData.repairers.find(function (p) { return p.id === providerId; }) ||
                   RCData.repairers.find(function (p) { return p.best; }) ||
                   RCData.repairers[0];

    var set = function (id, text) { var el = document.getElementById(id); if (el) el.textContent = text; };

    /* Resolve the diagnosis (real id, or demo fallback). */
    function resolveDiagnosis(doc) {
      var d = doc || RCData.activeDiagnosis;
      set("sumDevice", d.detectedDevice || d.device || "—");
      set("sumIssue", d.detectedDamage || d.damage || "—");
      set("sumDiagnosis", (d.detectedDamage || d.damage || "Damage") + " (preliminary AI assessment)");
      set("sumProvider", provider.name);
      set("sumCost", RC.inr(provider.priceRange.min) + "–" + RC.inr(provider.priceRange.max));
      set("sumStatus", "Awaiting Confirmation");
      return d;
    }

    var diagnosisPromise = diagnosisId
      ? RC.data.getDiagnosis(diagnosisId)
      : Promise.resolve(RCData.activeDiagnosis);

    diagnosisPromise.then(resolveDiagnosis).catch(function () { resolveDiagnosis(null); });

    /* Form */
    var form = document.getElementById("requestForm");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (submitting) return; // prevent duplicate submissions

      var date = document.getElementById("prefDate");
      var phone = document.getElementById("contactPhone");
      var notes = document.getElementById("notes");
      var ok = true;

      if (date && !date.value) { date.closest(".field").classList.add("invalid"); ok = false; }
      else if (date) { date.closest(".field").classList.remove("invalid"); }

      if (phone && phone.value.trim().length < 7) { phone.closest(".field").classList.add("invalid"); ok = false; }
      else if (phone) { phone.closest(".field").classList.remove("invalid"); }

      if (notes && notes.value.length > 1000) { notes.closest(".field").classList.add("invalid"); ok = false; }
      else if (notes) { notes.closest(".field").classList.remove("invalid"); }

      if (!ok) return;

      submitting = true;
      var btn = form.querySelector("button[type='submit']");
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Sending request…';

      var payload = {
        diagnosisId: diagnosisId || "diag-demo",
        repairerId: provider.id,
        estimatedCost: provider.priceRange ? provider.priceRange.min : 0,
        notes: notes ? notes.value : "",
        prefDate: date ? date.value : "",
        prefTime: document.getElementById("prefTime") ? document.getElementById("prefTime").value : ""
      };

      RC.data.createRequest(payload).then(function (res) {
        document.getElementById("requestFormPanel").classList.add("hidden");
        var success = document.getElementById("successPanel");
        success.classList.remove("hidden");
        var rid = (res && res.id) ? res.id : "REQ-" + String(Date.now()).slice(-6);
        set("successRepairId", rid);
        var trackBtn = document.getElementById("trackRepairBtn");
        if (trackBtn) trackBtn.href = "tracking.html?id=" + encodeURIComponent(rid);
        RC.toast("Repair request created.", "success");
      }).catch(function (err) {
        submitting = false;
        btn.disabled = false;
        btn.innerHTML = "Request Repair";
        RC.toast((err && err.message) ? err.message : "Couldn't send the request. Please try again.", "error");
      });
    });
  }

  return { init: init };
})();
