/* ==========================================================================
   RepairConnect AI — Analyze (damage upload) screen
   Responsibilities: drag-and-drop + file picker, image/video preview,
   client-side validation (type/size), and a realistic analysis loading state
   that leads into the demo diagnosis.
   --------------------------------------------------------------------------
   NO REAL AI CALL IS MADE in this build. The loading state is simulated and
   the result is demo data (data/demo-diagnoses.js). The submit handler is the
   single integration point for the `analyzeRepair` Cloud Function
   (OpenAI primary / Groq backup → structured diagnosis → Firestore).
   ========================================================================== */
window.RC = window.RC || {};

RC.analyze = (function () {
  "use strict";

  var ACCEPTED = { "image/jpeg": true, "image/png": true, "image/webp": true, "image/gif": true };
  var MAX_SIZE = 5 * 1024 * 1024; // 5 MB
  var currentFile = null;

  function setState(el, ok) {
    el.classList.toggle("invalid", !ok);
    var err = el.querySelector(".form-error");
    if (err) err.textContent = ok ? "" : err.getAttribute("data-msg") || "Invalid input.";
  }

  function clearFile() {
    currentFile = null;
    var preview = document.getElementById("preview");
    var dz = document.getElementById("dropzone");
    var analyzeBtn = document.getElementById("analyzeBtn");
    if (preview) preview.classList.add("hidden");
    if (dz) dz.classList.remove("hidden");
    if (analyzeBtn) analyzeBtn.disabled = true;
    var fileInput = document.getElementById("fileInput");
    if (fileInput) fileInput.value = "";
  }

  function showFile(file) {
    currentFile = file;
    var dz = document.getElementById("dropzone");
    var preview = document.getElementById("preview");
    var previewImg = document.getElementById("previewImg");
    var fileName = document.getElementById("fileName");
    var fileMeta = document.getElementById("fileMeta");
    var analyzeBtn = document.getElementById("analyzeBtn");

    dz.classList.add("hidden");
    preview.classList.remove("hidden");
    fileName.textContent = file.name;
    fileMeta.textContent = (file.size / 1024 / 1024).toFixed(1) + " MB";

    if (file.type.startsWith("image/")) {
      var reader = new FileReader();
      reader.onload = function (ev) { previewImg.src = ev.target.result; };
      reader.readAsDataURL(file);
    } else {
      previewImg.src = "data:image/svg+xml," + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">' +
        '<rect width="100%" height="100%" fill="#0A2540"/>' +
        '<g fill="none" stroke="#7DE0C1" stroke-width="6" stroke-linecap="round">' +
        '<polygon points="320 140 360 180 320 220 280 180"/></g>' +
        '<text x="320" y="300" fill="#AFC2DA" font-family="sans-serif" font-size="22" text-anchor="middle">Video preview (demo)</text></svg>'
      );
    }
    analyzeBtn.disabled = false;
  }

  function acceptFile(file) {
    if (!file) return;
    /* Reject executable/active content — SVG is blocked for safety. */
    var type = (file.type || "").toLowerCase();
    var name = (file.name || "").toLowerCase();
    if (type === "image/svg+xml" || name.endsWith(".svg")) {
      RC.toast("SVG files aren't supported for safety reasons. Please use JPG, PNG, or WebP.", "error");
      return;
    }
    if (file.size > MAX_SIZE) {
      RC.toast("That file is larger than 5 MB. Please choose a smaller file.", "error");
      return;
    }
    if (!(ACCEPTED[type] || type.startsWith("video/"))) {
      RC.toast("Unsupported file type. Please upload an image (JPG, PNG, WebP).", "error");
      return;
    }
    showFile(file);
  }

  function readAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error("read")); };
      r.readAsDataURL(file);
    });
  }

  function finishSteps(overlay, onDone) {
    var rows = Array.prototype.slice.call(overlay.querySelectorAll(".ac-row"));
    var stagger = 320;
    var done = 0;
    rows.forEach(function (r, i) {
      setTimeout(function () {
        r.classList.add("done");
        var icon = r.querySelector(".icon");
        if (icon) icon.outerHTML = RC.icon("check");
        var label = r.textContent.replace(/^\s+|\s+$/g, "");
        var t = document.getElementById("analysisTitle");
        if (t) t.textContent = label + "…";
        done++;
        if (done === rows.length && onDone) onDone();
      }, stagger * (i + 1));
    });
    return stagger * rows.length + 200;
  }

  function runAnalysis(payload) {
    var panel = document.getElementById("analyzePanel");
    var overlay = document.getElementById("analysisOverlay");
    var errEl = document.getElementById("analyzeError");
    var btn = document.getElementById("analyzeBtn");
    var titleEl = document.getElementById("analysisTitle");
    var subEl = document.getElementById("analysisSub");
    if (errEl) errEl.classList.add("hidden");

    panel.classList.add("hidden");
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-busy", "true");
    if (titleEl) titleEl.textContent = "Preparing Analysis…";
    if (subEl) subEl.textContent = RC.data.isLive() ? "Sending your image for analysis…" : "Demo simulation — no real AI request is being made.";

    var minTime = finishSteps(overlay, null);

    var started = Date.now();
    RC.data.analyze(payload).then(function (res) {
      // truthful: only complete after the request actually finished
      var wait = Math.max(0, minTime - (Date.now() - started));
      setTimeout(function () {
        overlay.setAttribute("aria-busy", "false");
        if (titleEl) titleEl.textContent = "Analysis complete";
        if (subEl) subEl.textContent = "Opening your diagnosis…";
        var all = overlay.querySelectorAll(".ac-row");
        all.forEach(function (r) { r.classList.add("done"); });
        setTimeout(function () {
          window.location.href = "diagnosis.html?id=" + encodeURIComponent(res.diagnosisId);
        }, 600);
      }, wait);
    }).catch(function (err) {
      overlay.setAttribute("aria-busy", "false");
      overlay.classList.add("hidden");
      panel.classList.remove("hidden");
      if (btn) btn.disabled = false;
      var msg = (err && err.message) ? err.message : "We couldn't analyze this image. Please try again.";
      if (errEl) {
        errEl.classList.remove("hidden");
        errEl.querySelector("p").textContent = msg;
      }
      RC.toast("Analysis failed. Please try again.", "error");
    });
  }

  function init() {
    var dz = document.getElementById("dropzone");
    var fileInput = document.getElementById("fileInput");
    var form = document.getElementById("analyzeForm");
    var analyzeBtn = document.getElementById("analyzeBtn");

    if (!dz || !fileInput) return;

    dz.addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () { acceptFile(fileInput.files[0]); });

    ["dragenter", "dragover"].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add("dragover"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove("dragover"); });
    });
    dz.addEventListener("drop", function (e) {
      if (e.dataTransfer.files.length) acceptFile(e.dataTransfer.files[0]);
    });

    var removeBtn = document.getElementById("removeFile");
    if (removeBtn) removeBtn.addEventListener("click", clearFile);

    /* Item info fields — light validation on submit. */
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var category = document.getElementById("category");
      var whatHappened = document.getElementById("whatHappened");

      if (!currentFile) { RC.toast("Please upload a photo of the damaged item first.", "error"); return; }

      var ok = true;
      if (category && !category.value) {
        setState(category.closest(".field"), false);
        ok = false;
      } else if (category) { setState(category.closest(".field"), true); }
      if (whatHappened && whatHappened.value.trim().length < 5) {
        setState(whatHappened.closest(".field"), false);
        ok = false;
      } else if (whatHappened) { setState(whatHappened.closest(".field"), true); }
      if (!ok) return;

      analyzeBtn.disabled = true;
      readAsDataUrl(currentFile).then(function (dataUrl) {
        runAnalysis({
          imageBase64: dataUrl,
          textDescription: whatHappened ? whatHappened.value.trim() : "",
          category: category ? category.value : ""
        });
      }).catch(function () {
        analyzeBtn.disabled = false;
        RC.toast("Couldn't read that file. Please try another image.", "error");
      });
    });
  }

  return { init: init };
})();
