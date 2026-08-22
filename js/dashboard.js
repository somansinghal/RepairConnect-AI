/* ==========================================================================
   RepairConnect AI — Dashboard renderer
   LIVE: loads the authenticated user's devices, diagnoses, active repair, and
   repair history from Firestore via RC.data. DEMO: clearly-labelled fallback.
   ========================================================================== */
window.RC = window.RC || {};

RC.dashboard = (function () {
  "use strict";

  function devIcon(category) {
    var map = RCData.deviceIcons || {};
    return map[category] || RC.icon("device");
  }

  function renderDevices(list) {
    var el = document.getElementById("deviceList");
    if (!el) return;
    if (!list || !list.length) {
      el.innerHTML = '<div class="empty-state">' + RC.icon("device") +
        "<h3>No devices yet</h3><p>Add a device from your profile to reuse it in future analyses.</p></div>";
      return;
    }
    el.innerHTML = list.map(function (dev) {
      var name = dev.name || (dev.brand ? dev.brand + (dev.model ? " " + dev.model : "") : "Device");
      var meta = dev.meta || (dev.ageYears ? dev.ageYears + " yrs old" : "Saved device");
      return (
        '<div class="device-tile">' +
          '<div class="dev-icon">' + devIcon(dev.category || dev.icon) + "</div>" +
          '<div style="min-width:0"><div class="dev-name">' + RC.escape(name) + "</div>" +
          '<div class="dev-meta">' + RC.escape(meta) + "</div></div>" +
        "</div>"
      );
    }).join("");
  }

  function renderDiagnoses(list) {
    var el = document.getElementById("recentDiagnoses");
    if (!el) return;
    if (!list || !list.length) {
      el.innerHTML = '<div class="empty-state">' + RC.icon("search") +
        "<h3>No diagnoses yet</h3><p>Upload a photo of a damaged item to get your first AI diagnosis.</p></div>";
      return;
    }
    el.innerHTML = list.slice(0, 5).map(function (r) {
      var vm = RC.verdictMeta[(r.recommendation && r.recommendation.verdict) || r.verdict] || { label: "—", short: "—", emoji: "" };
      var damage = r.detectedDamage || r.damage || "—";
      var device = r.detectedDevice || r.device || "Device";
      var sev = RC.severityMeta[r.severity] || { label: "Medium" };
      return (
        '<a class="diag-item" href="diagnosis.html?id=' + encodeURIComponent(r.id || "") + '">' +
          '<div class="diag-icon">' + devIcon(r.category || r.icon) + "</div>" +
          '<div style="flex:1;min-width:0"><div class="diag-title">' + RC.escape(device) + " · " + RC.escape(damage) + "</div>" +
          '<div class="diag-meta">' + RC.escape(r.time || "") + "</div></div>" +
          '<span class="badge badge-danger" style="margin-right:8px">' + RC.escape(sev.label) + "</span>" +
          '<span class="badge badge-success">' + vm.emoji + " " + RC.escape(vm.short || vm.label) + "</span>" +
          '<span class="chev">' + RC.icon("chevronRight") + "</span>" +
        "</a>"
      );
    }).join("");
  }

  function renderActive(req) {
    var el = document.getElementById("activeRepair");
    if (!el) return;
    if (!req) {
      el.innerHTML = '<div class="empty-state">' + RC.icon("wrench") +
        "<h3>No active repairs</h3><p>When you request a repair, it will show up here.</p></div>";
      return;
    }
    var meta = RC.statusMeta[req.status] || { label: req.statusLabel || req.status, cls: "badge-neutral", emoji: "" };
    el.innerHTML =
      '<div class="device-tile">' +
        '<div class="dev-icon" style="background:var(--warn-tint);color:var(--warn)">' + RC.icon("wrench") + "</div>" +
        '<div style="flex:1;min-width:0"><div class="dev-name">' + RC.escape(req.title || req.device || "Repair") + "</div>" +
        '<div class="dev-meta">' + RC.escape(req.provider || "") + (req.updatedAt ? " · " + RC.escape(req.updatedAt) : "") + "</div></div>" +
        '<span class="badge ' + meta.cls + '"><span class="dot"></span>' + meta.emoji + " " + RC.escape(meta.label) + "</span>" +
      "</div>";
    var link = document.getElementById("viewTrackingBtn");
    if (link && req.id) link.href = "tracking.html?id=" + encodeURIComponent(req.id);
  }

  function renderHistory(list) {
    var el = document.getElementById("repairHistoryList");
    if (!el) return;
    if (!list || !list.length) {
      el.innerHTML = '<div class="empty-state">' + RC.icon("history") +
        "<h3>No repair requests yet</h3><p>Completed repairs will appear here.</p></div>";
      return;
    }
    el.innerHTML = list.slice(0, 6).map(function (h) {
      var meta = RC.statusMeta[h.status] || { label: h.status, cls: "badge-neutral", emoji: "•" };
      return (
        '<a class="diag-item" href="tracking.html?id=' + encodeURIComponent(h.id || h.requestId || "") + '">' +
          '<div class="diag-icon">' + RC.icon("history") + "</div>" +
          '<div style="flex:1;min-width:0"><div class="diag-title">' + RC.escape(h.device || h.title || "Repair request") + "</div>" +
          '<div class="diag-meta">' + RC.escape(h.notes ? h.notes.slice(0, 60) : "") + "</div></div>" +
          '<span class="badge ' + meta.cls + '"><span class="dot"></span>' + meta.emoji + " " + RC.escape(meta.label) + "</span>" +
          '<span class="chev">' + RC.icon("chevronRight") + "</span>" +
        "</a>"
      );
    }).join("");
  }

  function demoFallback(list) {
    return !RC.data.isLive() ? list : null;
  }

  function init() {
    RC.data.listDevices().then(renderDevices)
      .catch(function () { renderDevices(demoFallback(RCData.devices)); });

    RC.data.listDiagnoses().then(renderDiagnoses)
      .catch(function () { renderDiagnoses(demoFallback(RCData.recentDiagnoses)); });

    RC.data.getActiveRequest().then(renderActive)
      .catch(function () { renderActive(demoFallback(RCData.activeRepair)); });

    RC.data.listRequests().then(renderHistory)
      .catch(function () { renderHistory(demoFallback(RCData.repairHistoryItems)); });

    var u = RC.data.currentUser();
    var greet = document.getElementById("greetName");
    if (greet && u && u.name) greet.textContent = u.name.split(" ")[0];
  }

  return { init: init };
})();
