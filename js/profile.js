/* ==========================================================================
   RepairConnect AI — Profile page
   LIVE: loads the authenticated user's profile + devices from Firebase via
   RC.data; supports add/edit/delete device and updating the display name.
   DEMO: falls back to localStorage-backed demo devices (clearly labelled).
   ========================================================================== */
window.RC = window.RC || {};

RC.profile = (function () {
  "use strict";

  var editingId = null;

  function devIcon(category) {
    var map = (window.RCData && RCData.deviceIcons) || {};
    return map[category] || RC.icon("device");
  }

  function renderUser() {
    var u = RC.data.currentUser();
    var avatar = document.getElementById("profileAvatar");
    var nameEl = document.getElementById("profileName");
    var emailEl = document.getElementById("profileEmail");
    if (avatar && u && u.name) avatar.textContent = u.name.split(" ").map(function (s) { return s[0]; }).slice(0, 2).join("").toUpperCase();
    if (nameEl) nameEl.textContent = u && u.name ? u.name : "User";
    if (emailEl) emailEl.textContent = (u && u.email) ? u.email : "—";
  }

  function renderDevices() {
    var el = document.getElementById("profileDevices");
    if (!el) return;
    RC.data.listDevices().then(function (list) {
      if (!list || !list.length) {
        el.innerHTML = '<div class="empty-state" style="grid-column:1/-1">' + RC.icon("device") +
          "<h3>No devices yet</h3><p>Add your first device to reuse it in future analyses.</p></div>";
        return;
      }
      el.innerHTML = list.map(function (dev) {
        var name = dev.name || (dev.brand ? dev.brand + (dev.model ? " " + dev.model : "") : "Device");
        var meta = dev.meta || (dev.ageYears ? dev.ageYears + " yrs old" : "");
        return (
          '<div class="device-tile">' +
            '<div class="dev-icon">' + devIcon(dev.category || dev.icon) + "</div>" +
            '<div style="flex:1;min-width:0"><div class="dev-name">' + RC.escape(name) + "</div>" +
            '<div class="dev-meta">' + RC.escape(meta) + "</div></div>" +
            '<button class="btn btn-ghost btn-sm" data-act="edit" data-id="' + RC.escape(dev.id || "") + '" aria-label="Edit device">✎</button>' +
            '<button class="btn btn-ghost btn-sm" data-act="del" data-id="' + RC.escape(dev.id || "") + '" aria-label="Delete device" style="color:var(--danger)">✕</button>' +
          "</div>"
        );
      }).join("");
    }).catch(function () {
      el.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>Couldn\'t load devices.</h3></div>';
    });
  }

  function openModal(dev) {
    var m = document.getElementById("deviceModal");
    var title = document.getElementById("deviceModalTitle");
    if (!m) return;
    editingId = dev && dev.id ? dev.id : null;
    if (title) title.textContent = editingId ? "Edit device" : "Add device";
    document.getElementById("deviceId").value = editingId || "";
    document.getElementById("devCategory").value = (dev && dev.category) || "laptop";
    document.getElementById("devBrand").value = (dev && dev.brand) || "";
    document.getElementById("devModel").value = (dev && dev.model) || "";
    document.getElementById("devAge").value = (dev && dev.ageYears) || "";
    m.classList.remove("hidden");
  }

  function closeModal() {
    var m = document.getElementById("deviceModal");
    if (m) m.classList.add("hidden");
  }

  /* Preferences — persist to Firestore (live) or localStorage (demo). */
  function loadPreferences() {
    RC.data.getPreferences().then(function (prefs) {
      document.querySelectorAll("[data-pref]").forEach(function (cb) {
        var key = cb.getAttribute("data-pref");
        cb.checked = prefs ? !!prefs[key] : cb.checked;
      });
    }).catch(function () {});
  }

  function bindPreferences() {
    document.querySelectorAll("[data-pref]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var next = {
          emailNotifications: (document.querySelector('[data-pref="emailNotifications"]') || {}).checked,
          smsUpdates: (document.querySelector('[data-pref="smsUpdates"]') || {}).checked,
          sustainabilityTips: (document.querySelector('[data-pref="sustainabilityTips"]') || {}).checked
        };
        RC.data.updatePreferences(next).catch(function () {
          RC.toast("Couldn't save preferences.", "error");
        });
      });
    });
  }

  function init() {
    renderUser();
    loadPreferences();
    bindPreferences();

    var signout = document.getElementById("signoutBtn");
    if (signout) {
      signout.addEventListener("click", function (e) {
        e.preventDefault();
        RC.data.signOut().then(function () { window.location.href = "index.html"; });
      });
    }

    var edit = document.getElementById("editProfileBtn");
    if (edit) {
      edit.addEventListener("click", function () {
        var name = window.prompt("Your display name:", RC.data.currentUser().name || "");
        if (name && name.trim().length >= 2) {
          RC.data.updateProfile(name.trim()).then(function () {
            RC.toast("Profile updated.", "success");
            renderUser();
          });
        }
      });
    }

    var add = document.getElementById("addDeviceBtn");
    if (add) add.addEventListener("click", function () { openModal(null); });

    var close = document.getElementById("deviceModalClose");
    if (close) close.addEventListener("click", closeModal);
    var m = document.getElementById("deviceModal");
    if (m) m.addEventListener("click", function (e) { if (e.target === m) closeModal(); });

    var form = document.getElementById("deviceForm");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var dev = {
          id: document.getElementById("deviceId").value || null,
          category: document.getElementById("devCategory").value,
          brand: document.getElementById("devBrand").value.trim(),
          model: document.getElementById("devModel").value.trim(),
          ageYears: parseFloat(document.getElementById("devAge").value) || 0
        };
        RC.data.saveDevice(dev).then(function () {
          closeModal();
          renderDevices();
        }).catch(function () {
          RC.toast("Couldn't save the device.", "error");
        });
      });
    }

    /* Delegate edit/delete clicks in the device list. */
    var list = document.getElementById("profileDevices");
    if (list) {
      list.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-act]");
        if (!btn) return;
        var id = btn.getAttribute("data-id");
        var act = btn.getAttribute("data-act");
        if (act === "del") {
          if (window.confirm("Delete this device?")) {
            RC.data.deleteDevice(id).then(renderDevices);
          }
        } else if (act === "edit") {
          RC.data.listDevices().then(function (devs) {
            var dev = devs.find(function (d) { return d.id === id; });
            openModal(dev);
          });
        }
      });
    }

    renderDevices();
  }

  return { init: init };
})();
