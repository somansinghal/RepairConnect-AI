/* ==========================================================================
   RepairConnect AI — Contact form behavior
   --------------------------------------------------------------------------
   There is NO email backend in this project. The form is honest about that:
   submitting builds a `mailto:` link to the project's real contact address
   (somansinghal06@gmail.com) with the subject/body pre-filled, so the user's
   email app opens — no fake "message sent" claim is made. A "copy email"
   fallback is provided.
   ========================================================================== */
window.RC = window.RC || {};

RC.contact = (function () {
  "use strict";

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var CONTACT_EMAIL = "somansinghal06@gmail.com";

  function setInvalid(field, invalid, message) {
    field.classList.toggle("invalid", invalid);
    var err = field.querySelector(".form-error");
    if (err) err.textContent = invalid ? (message || "") : "";
  }

  function init() {
    var form = document.getElementById("contactForm");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = document.getElementById("cName");
      var email = document.getElementById("cEmail");
      var subject = document.getElementById("cSubject");
      var message = document.getElementById("cMessage");

      var ok = true;
      if (name.value.trim().length < 2) { setInvalid(name.closest(".field"), true, "Please enter your name."); ok = false; }
      else setInvalid(name.closest(".field"), false);
      if (!EMAIL_RE.test(email.value.trim())) { setInvalid(email.closest(".field"), true, "Enter a valid email address."); ok = false; }
      else setInvalid(email.closest(".field"), false);
      if (subject.value.trim().length < 2) { setInvalid(subject.closest(".field"), true, "Please add a short subject."); ok = false; }
      else setInvalid(subject.closest(".field"), false);
      if (message.value.trim().length < 10) { setInvalid(message.closest(".field"), true, "Please write at least a short message (10+ characters)."); ok = false; }
      else setInvalid(message.closest(".field"), false);
      if (!ok) return;

      var btn = form.querySelector("button[type='submit']");
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner--dark" aria-hidden="true"></span> Preparing email…';

      setTimeout(function () {
        var body =
          "Hi RepairConnect AI,\n\n" +
          message.value.trim() + "\n\n" +
          "— " + name.value.trim() + " (" + email.value.trim() + ")";

        var mailto =
          "mailto:" + CONTACT_EMAIL +
          "?subject=" + encodeURIComponent("[Contact] " + subject.value.trim()) +
          "&body=" + encodeURIComponent(body);

        window.location.href = mailto;

        /* Honest success state — no email backend exists. */
        var panel = document.getElementById("contactSuccess");
        if (panel) panel.classList.remove("hidden");
        if (RC.toast) RC.toast("Opening your email app…", "info");

        btn.disabled = false;
        btn.innerHTML = "Send message";
      }, 600);
    });

    var copy = document.getElementById("copyEmailBtn");
    if (copy) {
      copy.addEventListener("click", function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(CONTACT_EMAIL).then(function () {
            if (RC.toast) RC.toast("Email copied to clipboard.", "success");
          }).catch(function () {});
        } else {
          if (RC.toast) RC.toast("Email: " + CONTACT_EMAIL, "info");
        }
      });
    }
  }

  return { init: init };
})();
