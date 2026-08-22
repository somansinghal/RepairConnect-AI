/* ==========================================================================
   RepairConnect AI — Repair Tracking screen
   LIVE: renders the request status (from Firestore) as a timeline; status
   changes come from the repairer/backend (no arbitrary client manipulation).
   DEMO: local interactive timeline with a clearly-labelled advance control.
   ========================================================================== */
window.RC = window.RC || {};

RC.tracking = (function () {
  "use strict";

  var FLOW_KEYS = ["submitted", "accepted", "scheduled", "received", "diagnosis_confirmed", "in_progress", "ready_for_pickup", "completed"];

  var DEMO_TIMES = {
    submitted: "Today, 10:30 AM",
    accepted: "Today, 10:41 AM",
    scheduled: "Today, 10:50 AM",
    received: "Today, 11:00 AM",
    diagnosis_confirmed: "Today, 11:15 AM",
    in_progress: "Today, 11:32 AM"
  };

  var currentIdx = 4; // demo current stage

  function now() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

  function fmtTs(ts) {
    if (!ts) return "";
    var d = ts && ts.toDate ? ts.toDate() : (typeof ts === "number" ? new Date(ts) : new Date(ts));
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function renderTimeline(status, times) {
    var el = document.getElementById("timeline");
    if (!el) return;
    var idx = FLOW_KEYS.indexOf(status);
    if (idx === -1) idx = 0;

    el.innerHTML = FLOW_KEYS.map(function (key, i) {
      var meta = RC.statusMeta[key] || { label: key, emoji: "•" };
      var state = i < idx ? "done" : i === idx ? "current" : "upcoming";
      var icon = state === "done" ? RC.icon("check")
               : state === "current" ? RC.icon("wrench")
               : '<span style="width:8px;height:8px;border-radius:50%;background:var(--muted-2);display:inline-block"></span>';
      var time = state === "done" || state === "current"
        ? ((times && times[key]) || DEMO_TIMES[key] || "")
        : "";
      return (
        '<div class="tl-item ' + state + '">' +
          '<div class="tl-node">' + icon + "</div>" +
          '<div class="tl-title">' + meta.emoji + " " + RC.escape(meta.label) + "</div>" +
          (time ? '<div class="tl-time">' + RC.escape(time) + "</div>" : "") +
        "</div>"
      );
    }).join("");

    var meta = RC.statusMeta[status] || { label: status, emoji: "•", cls: "badge-neutral" };
    var hero = document.getElementById("statusHero");
    if (hero) {
      hero.querySelector(".sh-emoji").textContent = meta.emoji;
      hero.querySelector(".sh-title").textContent = meta.label;
      hero.querySelector(".sh-sub").textContent = status === "completed"
        ? "Your repair is complete. Thank you!"
        : "Your device is being handled by the selected repairer.";
      var pill = document.getElementById("statusPill");
      if (pill) {
        pill.className = "badge " + meta.cls;
        pill.innerHTML = '<span class="dot"></span>' + meta.emoji + " " + RC.escape(meta.label);
      }
    }
    var updated = document.getElementById("lastUpdated");
    if (updated) updated.textContent = now();

    var adv = document.getElementById("advanceBtn");
    if (adv) {
      adv.disabled = idx >= FLOW_KEYS.length - 1;
      adv.textContent = idx >= FLOW_KEYS.length - 1 ? "Repair completed" : "Demo: advance status";
    }
  }

  function init() {
    var id = RC.getParam("id");

    if (RC.data.isLive() && id) {
      RC.data.getRequestById(id).then(function (req) {
        if (!req) { renderTimeline("submitted"); return; }
        var adv = document.getElementById("advanceBtn");
        var hint = document.getElementById("demoHint");
        if (adv) adv.classList.add("hidden");
        if (hint) hint.textContent = "Live request — status updates come from the repairer.";
        RC.data.listHistory(id).then(function (history) {
          var times = {};
          (history || []).forEach(function (e) {
            if (!times[e.status]) times[e.status] = fmtTs(e.timestamp);
          });
          renderTimeline(req.status, times);
        }).catch(function () { renderTimeline(req.status); });
      }).catch(function () { renderTimeline("submitted"); });
      return;
    }

    /* Demo mode */
    renderTimeline(FLOW_KEYS[currentIdx]);
    var adv = document.getElementById("advanceBtn");
    if (adv) {
      adv.addEventListener("click", function () {
        if (currentIdx < FLOW_KEYS.length - 1) {
          currentIdx++;
          renderTimeline(FLOW_KEYS[currentIdx]);
        }
      });
    }
  }

  return { init: init };
})();
