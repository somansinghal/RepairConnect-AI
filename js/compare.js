/* ==========================================================================
   RepairConnect AI — Compare screen renderer
   Builds a side-by-side comparison of the selected (or default) demo
   providers and highlights the Best Match with its transparent reasons.
   The live build will keep this UI and feed it Firestore + the deterministic
   `rankProviders` Cloud Function result (AI_SPEC.md §5).
   ========================================================================== */
window.RC = window.RC || {};

RC.compare = (function () {
  "use strict";

  function pickProviders() {
    var ids = [];
    var q = RC.getParam("ids");
    if (q) ids = q.split(",").filter(Boolean);
    else {
      try {
        var raw = sessionStorage.getItem("rcCompare");
        if (raw) ids = raw.split(",").filter(Boolean);
      } catch (e) {}
    }
    var chosen = [];
    ids.forEach(function (id) {
      var p = RCData.repairers.find(function (x) { return x.id === id; });
      if (p) chosen.push(p);
    });
    /* Default: best match + next two. */
    if (!chosen.length) {
      var sorted = RCData.repairers.slice().sort(function (a, b) { return b.score - a.score; });
      chosen = sorted.slice(0, 3);
    }
    return chosen;
  }

  function row(label, cells) {
    return "<tr><th>" + label + "</th>" + cells.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>";
  }

  function init() {
    var providers = pickProviders();
    var wrap = document.getElementById("cmpWrap");
    if (!wrap) return;

    var best = RCData.repairers.find(function (p) { return p.best; });
    var bestId = best ? best.id : (providers[0] && providers[0].id);

    var headCells = providers.map(function (p) {
      var isBest = p.id === bestId;
      return '<th class="' + (isBest ? "col-best" : "") + '" style="min-width:170px">' +
        (isBest ? '<span class="badge badge-success" style="margin-bottom:8px">' + RC.icon("spark") + " Best Match</span><br>" : "") +
        '<span class="provider-cell"><span class="provider-logo" style="width:38px;height:38px;font-size:.85rem">' + RC.escape(p.short) + "</span></span><br>" +
        '<span style="color:var(--navy);font-weight:700">' + RC.escape(p.name) + "</span>" +
        "</th>";
    }).join("");

    var table =
      '<table class="cmp-table"><thead><tr><th style="width:150px">Factor</th>' + headCells + "</tr></thead><tbody>" +
      row("Distance", providers.map(function (p) { return RC.escape(p.distanceKm.toFixed(1)) + " km"; })) +
      row("Rating", providers.map(function (p) { return "★ " + p.rating.toFixed(1); })) +
      row("Estimated price", providers.map(function (p) { return RC.inr(p.priceRange.min) + "–" + RC.inr(p.priceRange.max); })) +
      row("Repair time", providers.map(function (p) { return RC.escape(p.repairTime); })) +
      row("Expertise", providers.map(function (p) { return RC.escape(p.expertise[0]); })) +
      row("Availability", providers.map(function (p) { return RC.escape(p.availability); })) +
      row("", providers.map(function (p) {
        var diagnosisId = RC.getParam("diagnosis") || "";
        var href = "request-repair.html?provider=" + encodeURIComponent(p.id) +
          (diagnosisId ? "&diagnosis=" + encodeURIComponent(diagnosisId) : "");
        return '<a class="btn btn-primary btn-sm" href="' + href + '">Select Repairer</a>';
      })) +
      "</tbody></table>";

    wrap.innerHTML = table;

    /* Highlight the best column cells. */
    if (bestId) {
      var idx = providers.findIndex(function (p) { return p.id === bestId; }) + 1; // +1 for factor column
      wrap.querySelectorAll("tr").forEach(function (tr) {
        var td = tr.children[idx];
        if (td) td.classList.add("col-best");
      });
    }

    /* "Why" panel */
    var whyEl = document.getElementById("whyPanel");
    if (whyEl && best) {
      whyEl.innerHTML =
        '<h3 class="card-title mb-16">Why ' + RC.escape(best.name) + " is the best match</h3>" +
        '<ul class="why-list">' + best.why.map(function (w) {
          return "<li>" + RC.icon("check") + "<span>" + RC.escape(w) + "</span></li>";
        }).join("") + "</ul>" +
        '<p class="compare-note mt-16">Recommendation factors: distance, price, rating, expertise, and turnaround time — weighted transparently by the ranking engine.</p>';
    }
  }

  return { init: init };
})();
