/* ==========================================================================
   RepairConnect AI — Landing page interactions
   Interactive journey strip, demo preview (category selector), and the
   educational repair-vs-replace calculator. All clearly labelled demo.
   ========================================================================== */
window.RC = window.RC || {};

RC.landing = (function () {
  "use strict";

  var DEMO_CATS = {
    smartphone: {
      label: "Smartphone",
      steps: [
        ["Upload", "A photo of a cracked phone screen is added."],
        ["AI analysis", "Visible damage is identified and possible causes are listed."],
        ["Estimate", "A deterministic repair-cost band is estimated from damage type."],
        ["Recommendation", "Repair vs replace is compared against the phone's value."]
      ],
      result: { device: "Smartphone", issue: "Cracked screen", cost: "₹3,000 – ₹6,000", verdict: "repair", verdictLabel: "Repair likely worthwhile" }
    },
    laptop: {
      label: "Laptop",
      steps: [
        ["Upload", "A photo of a laptop with a cracked display is added."],
        ["AI analysis", "The display damage and severity are assessed."],
        ["Estimate", "A repair-cost band is estimated from the damage type."],
        ["Recommendation", "Repair cost is compared with replacement cost."]
      ],
      result: { device: "Laptop", issue: "Cracked display", cost: "₹7,000 – ₹10,000", verdict: "repair", verdictLabel: "Repair likely worthwhile" }
    },
    appliance: {
      label: "Appliance",
      steps: [
        ["Upload", "A photo of a washing machine fault is added."],
        ["AI analysis", "Visible damage and possible causes are assessed."],
        ["Estimate", "A service-cost band is estimated by category."],
        ["Recommendation", "Repair vs replace is weighed against appliance age."]
      ],
      result: { device: "Washing machine", issue: "Not spinning", cost: "₹1,500 – ₹4,000", verdict: "consider", verdictLabel: "Get a professional opinion" }
    },
    electronics: {
      label: "Electronics",
      steps: [
        ["Upload", "A photo of a damaged TV is added."],
        ["AI analysis", "Screen damage and severity are assessed."],
        ["Estimate", "A repair-cost band is estimated from the panel type."],
        ["Recommendation", "Panel cost is compared with a new TV's price."]
      ],
      result: { device: "TV", issue: "Screen damage", cost: "₹9,000 – ₹15,000", verdict: "consider", verdictLabel: "Compare quotes before deciding" }
    },
    audio: {
      label: "Audio",
      steps: [
        ["Upload", "A photo of headphones with one dead side is added."],
        ["AI analysis", "Possible causes (cable, driver) are listed."],
        ["Estimate", "A repair-cost band is estimated by category."],
        ["Recommendation", "Repair is compared with a replacement pair."]
      ],
      result: { device: "Headphones", issue: "One side silent", cost: "₹500 – ₹1,500", verdict: "repair", verdictLabel: "Repair likely worthwhile" }
    }
  };

  /* ---------- Journey strip ---------- */
  var JOURNEY = [
    { t: "Broken item", d: "Something stops working — a phone, laptop, or appliance.", e: "🔧" },
    { t: "Upload", d: "Add a photo (or a short description) of the damage.", e: "📷" },
    { t: "AI analysis", d: "The AI identifies the device and visible damage, and lists possible causes.", e: "🤖" },
    { t: "Diagnosis", d: "You get a structured result: severity, confidence, causes, and safe next steps.", e: "📋" },
    { t: "Repair vs replace", d: "A deterministic estimate shows whether repair is the smarter spend.", e: "⚖️" },
    { t: "Find repairer", d: "See nearby professionals ranked by distance, rating, price, and expertise.", e: "📍" },
    { t: "Request repair", d: "Send a repair request with your preferred date and notes.", e: "📨" },
    { t: "Track repair", d: "Follow the status timeline to completion.", e: "✅" }
  ];

  function initJourney() {
    var strip = document.getElementById("journeyStrip");
    var detail = document.getElementById("journeyDetail");
    if (!strip || !detail) return;

    var items = strip.querySelectorAll(".journey-step");
    function activate(i) {
      items.forEach(function (el, idx) { el.classList.toggle("active", idx === i); });
      var j = JOURNEY[i];
      detail.innerHTML =
        '<span class="jd-emoji" aria-hidden="true">' + j.e + "</span>" +
        '<div><div class="jd-title">' + j.t + "</div>" +
        '<div class="jd-text">' + j.d + "</div></div>";
    }
    items.forEach(function (el, idx) {
      el.addEventListener("click", function () { activate(idx); });
      el.addEventListener("mouseenter", function () { activate(idx); });
    });
    activate(0);
  }

  /* ---------- Demo preview ---------- */
  function initDemo() {
    var row = document.getElementById("demoCatRow");
    var stepsEl = document.getElementById("demoSteps");
    var resultEl = document.getElementById("demoResult");
    if (!row || !stepsEl || !resultEl) return;

    function render(key) {
      var cat = DEMO_CATS[key];
      row.querySelectorAll(".demo-cat").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-cat") === key);
      });
      stepsEl.innerHTML = cat.steps.map(function (s, i) {
        return '<div class="demo-step"><div class="ds-dot">' + (i + 1) + "</div>" +
          '<div><div class="ds-title">' + s[0] + "</div><div class=\"ds-text\">" + s[1] + "</div></div></div>";
      }).join("");

      var vCls = cat.result.verdict === "repair" ? "repair" : cat.result.verdict === "consider" ? "consider" : "replace";
      var vEmoji = cat.result.verdict === "repair" ? "🟢" : cat.result.verdict === "consider" ? "🟡" : "🔴";
      resultEl.innerHTML =
        '<span class="dr-badge">Demo Preview</span>' +
        '<div class="dr-head">' + cat.label + " — example analysis</div>" +
        '<div class="dr-item"><span class="k">Device</span><span class="v">' + cat.result.device + "</span></div>" +
        '<div class="dr-item"><span class="k">Issue</span><span class="v">' + cat.result.issue + "</span></div>" +
        '<div class="dr-item"><span class="k">Est. repair</span><span class="v">' + cat.result.cost + "</span></div>" +
        '<div class="dr-verdict ' + vCls + '"><span>' + vEmoji + "</span> " + cat.result.verdictLabel + "</div>";
    }

    row.querySelectorAll(".demo-cat").forEach(function (btn) {
      btn.addEventListener("click", function () { render(btn.getAttribute("data-cat")); });
    });
    render("smartphone");
  }

  /* ---------- Repair-vs-replace educational calculator ---------- */
  function initCalc() {
    var repair = document.getElementById("calcRepair");
    var replacement = document.getElementById("calcReplacement");
    var age = document.getElementById("calcAge");
    if (!repair || !replacement || !age) return;

    function recompute() {
      var r = Number(repair.value);
      var p = Number(replacement.value);
      var a = Number(age.value);

      var ratio = p ? r / p : 0;
      var score = Math.round(Math.min(100, Math.max(0, 100 - ratio * 100 - a * 4)));

      var verdict, emoji, cls;
      if (score >= 60) { verdict = "Repair looks worthwhile"; emoji = "🟢"; cls = "repair"; }
      else if (score >= 35) { verdict = "Compare quotes first"; emoji = "🟡"; cls = "consider"; }
      else { verdict = "Replacement may be better"; emoji = "🔴"; cls = "replace"; }

      document.getElementById("calcRepairVal").textContent = "₹" + r.toLocaleString("en-IN");
      document.getElementById("calcReplacementVal").textContent = "₹" + p.toLocaleString("en-IN");
      document.getElementById("calcAgeVal").textContent = a + " yrs";
      document.getElementById("calcScore").textContent = score;
      document.getElementById("calcVerdictEmoji").textContent = emoji;
      document.getElementById("calcVerdict").textContent = verdict;

      var fill = document.getElementById("calcFill");
      fill.style.width = score + "%";
      fill.style.background = score >= 60 ? "var(--success)" : score >= 35 ? "var(--warn)" : "var(--danger)";

      var ratioEl = document.getElementById("calcRatioNum");
      if (ratioEl) ratioEl.textContent = Math.round(ratio * 100) + "%";
    }

    [repair, replacement, age].forEach(function (el) {
      el.addEventListener("input", recompute);
    });
    recompute();
  }

  function init() {
    initJourney();
    initDemo();
    initCalc();
  }

  return { init: init };
})();
