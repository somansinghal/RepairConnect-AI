/* ==========================================================================
   RepairConnect AI — AI Repair Assistant (contextual chat)
   --------------------------------------------------------------------------
   Sends messages to the secure `assistant` Cloud Function (OpenAI primary →
   Groq failover) via RC.data. In DEMO MODE (Firebase not configured) the
   data service returns a clearly-labelled simulated reply — no real AI call.
   The user's message is rendered as text only (XSS-safe).
   ========================================================================== */
window.RC = window.RC || {};

RC.assistant = (function () {
  "use strict";

  function addMsg(text, role) {
    var box = document.getElementById("chatMsgs");
    if (!box) return;
    var el = document.createElement("div");
    el.className = "msg " + (role === "user" ? "msg-user" : "msg-ai");
    /* User messages are untrusted input → rendered as text only (XSS-safe).
       AI replies are trusted demo constants. */
    if (role === "user") {
      el.textContent = text;
    } else {
      el.innerHTML = text;
    }
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
    return el;
  }

  function send(text) {
    text = String(text).trim().slice(0, 500);
    if (!text) return;
    addMsg(text, "user");
    var box = document.getElementById("chatMsgs");
    var typing = document.createElement("div");
    typing.className = "msg msg-ai typing";
    typing.innerHTML = '<span class="t-dot"></span><span class="t-dot"></span><span class="t-dot"></span>';
    box.appendChild(typing);
    box.scrollTop = box.scrollHeight;

    var diagnosisId = RC.getParam("id") || null;

    RC.data.askAssistant(text, diagnosisId).then(function (res) {
      typing.remove();
      var reply = (res && res.reply) ? res.reply : "";
      if (!reply) reply = "I couldn't generate a response. Please try again.";
      addMsg(reply, "ai");
    }).catch(function (err) {
      typing.remove();
      addMsg((err && err.message) ? err.message : "I'm having trouble right now. Please try again.", "ai");
    });
  }

  function init() {
    var form = document.getElementById("chatForm");
    var input = document.getElementById("chatInput");

    if (form && input) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var v = input.value;
        if (!v.trim()) { input.focus(); return; }
        if (v.length > 500) {
          RC.toast("Please keep your message under 500 characters.", "error");
          return;
        }
        input.value = "";
        send(v);
      });
    }

    document.querySelectorAll(".suggest").forEach(function (btn) {
      btn.addEventListener("click", function () {
        send(btn.textContent.trim());
      });
    });

    /* Seed with a friendly opener. */
    if (!document.querySelector("#chatMsgs .msg")) {
      addMsg("Hi! I'm your repair assistant. I can see your current diagnosis — <strong>cracked display on your laptop</strong>, rated High severity with repair recommended. What would you like to know?", "ai");
    }
  }

  return { init: init };
})();
