/* ==========================================================================
   RepairConnect AI — UI helpers (shared)
   Namespace: window.RC
   Responsibilities: icons, formatting, toasts, meta maps for verdicts/severity/
   status. Pure UI glue — no business logic, no secrets, no network calls.
   ========================================================================== */
window.RC = window.RC || {};

(function () {
  "use strict";

  /* ---------- Inline SVG icon set (Feather-style, MIT, stroke-based) ---------- */
  var I = function (paths, vb) {
    vb = vb || "0 0 24 24";
    return (
      '<svg class="icon" viewBox="' + vb + '" fill="none" stroke="currentColor" stroke-width="1.9" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + "</svg>"
    );
  };

  RC.icons = {
    check: I('<polyline points="20 6 9 17 4 12"/>'),
    checkCircle: I('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'),
    info: I('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'),
    warn: I('<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
    chevronRight: I('<polyline points="9 18 15 12 9 6"/>'),
    mapPin: I('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),
    clock: I('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
    wallet: I('<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/><path d="M16 15h2"/>'),
    spark: I('<path d="M12 2l1.9 5.7L19.6 9l-5.7 1.9L12 16.6l-1.9-5.7L4.4 9l5.7-1.9L12 2z"/><path d="M19 15l.9 2.6L22.5 18l-2.6.9L19 21.5l-.9-2.6L15.5 18l2.6-.9L19 15z"/>'),
    wrench: I('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'),
    calendar: I('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
    search: I('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
    history: I('<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><polyline points="12 7 12 12 15 15"/>'),
    device: I('<rect x="4" y="4" width="16" height="11" rx="2"/><path d="M2 19h20"/>'),
  };

  RC.icon = function (name) { return RC.icons[name] || ""; };

  /* ---------- Safe text ---------- */
  RC.escape = function (str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };

  /* ---------- Formatting ---------- */
  RC.inr = function (n) {
    return "₹" + Number(n).toLocaleString("en-IN");
  };
  RC.percent = function (r) {
    return Math.round(Number(r) * 100) + "%";
  };

  /* ---------- Toast ---------- */
  RC.toast = function (msg, type) {
    var region = document.querySelector(".toast-region");
    if (!region) {
      region = document.createElement("div");
      region.className = "toast-region";
      region.setAttribute("aria-live", "polite");
      document.body.appendChild(region);
    }
    var el = document.createElement("div");
    el.className = "toast toast-" + (type || "info");
    var ic = type === "success" ? RC.icon("checkCircle") : type === "error" ? RC.icon("warn") : RC.icon("info");
    el.innerHTML = ic + "<span>" + RC.escape(msg) + "</span>";
    region.appendChild(el);
    setTimeout(function () {
      el.style.transition = "opacity .25s ease, transform .25s ease";
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
      setTimeout(function () { el.remove(); }, 260);
    }, 3200);
  };

  /* ---------- Meta maps (single source of truth for labels/colors) ---------- */
  RC.severityMeta = {
    minor:    { label: "Low",      cls: "sev-low" },
    moderate: { label: "Medium",   cls: "sev-medium" },
    major:    { label: "High",     cls: "sev-high" },
    severe:   { label: "Critical", cls: "sev-critical" }
  };

  RC.verdictMeta = {
    repair_recommended:  { label: "Repair Recommended",  emoji: "🟢", cls: "verdict-repair", short: "REPAIR" },
    consider_repair:     { label: "Consider Repair",     emoji: "🟡", cls: "verdict-consider", short: "CONSIDER" },
    replace_recommended: { label: "Replace Recommended", emoji: "🔴", cls: "verdict-replace", short: "REPLACE" }
  };

  RC.statusMeta = {
    submitted:          { label: "Request Submitted", cls: "badge-neutral", emoji: "🟢" },
    accepted:           { label: "Repairer Confirmed", cls: "badge-info", emoji: "🟢" },
    received:           { label: "Device Received", cls: "badge-info", emoji: "🟢" },
    diagnosis_confirmed:{ label: "Diagnosis Confirmed", cls: "badge-info", emoji: "⚪" },
    in_progress:        { label: "Repair In Progress", cls: "badge-warn", emoji: "🟡" },
    ready_for_pickup:   { label: "Quality Check", cls: "badge-info", emoji: "⚪" },
    completed:          { label: "Repair Completed", cls: "badge-success", emoji: "🟢" },
    declined:           { label: "Declined", cls: "badge-danger", emoji: "🔴" },
    cancelled:          { label: "Cancelled", cls: "badge-danger", emoji: "🔴" }
  };

  RC.confidenceMeta = function (c) {
    if (c >= 0.8) return { label: "High confidence", cls: "badge-success" };
    if (c >= 0.5) return { label: "Medium confidence", cls: "badge-warn" };
    return { label: "Low confidence", cls: "badge-danger" };
  };

  /* ---------- Query helpers ---------- */
  RC.getParam = function (name) {
    return new URLSearchParams(window.location.search).get(name);
  };
<<<<<<< HEAD
=======

  /* ---------- Demo session (shared, available on every page) ----------
     The auth guard treats a stored demo session as "signed in" in DEMO mode.
     This helper writes that session so entry points on public pages (which
     don't load the full data-service) can establish it too. */
  RC.demo = (function () {
    var KEY = "rc-demo-store-v1:user";
    function enter() {
      try {
        localStorage.setItem(KEY, JSON.stringify({
          uid: "demo-user", email: "demo@repairconnect.ai", name: "Alex Demo"
        }));
      } catch (e) {}
      return Promise.resolve();
    }
    function clear() {
      try { localStorage.removeItem(KEY); } catch (e) {}
    }
    return { enter: enter, clear: clear, KEY: KEY };
  })();
>>>>>>> 28c9ed7f1c972dcc2dd6035eba09b3a09345a356
})();
