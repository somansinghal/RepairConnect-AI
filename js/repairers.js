/* ==========================================================================
   RepairConnect AI — Nearby Repairers (discovery) screen
   --------------------------------------------------------------------------
   Renders clearly-labelled DEMO providers + a map mock. The map area is a
   styled placeholder container (#mapShell) designed for Leaflet +
   OpenStreetMap integration (no paid maps API). Distances shown are demo
   values; the live build computes them with the Haversine formula.
   Compare selection is stored in sessionStorage for the compare screen.
   ========================================================================== */
window.RC = window.RC || {};

RC.repairers = (function () {
  "use strict";

  var selected = new Set();
  var diagnosisId = RC.getParam("diagnosis") || "";

  function requestUrl(providerId) {
    return "request-repair.html?provider=" + encodeURIComponent(providerId) +
      (diagnosisId ? "&diagnosis=" + encodeURIComponent(diagnosisId) : "");
  }
  function compareUrl(ids) {
    return "compare.html?ids=" + encodeURIComponent(ids.join(",")) +
      (diagnosisId ? "&diagnosis=" + encodeURIComponent(diagnosisId) : "");
  }


  function readSelected() {
    try {
      var raw = sessionStorage.getItem("rcCompare");
      if (raw) raw.split(",").forEach(function (id) { if (id) selected.add(id); });
    } catch (e) { /* storage may be unavailable */ }
  }

  function saveSelected() {
    try { sessionStorage.setItem("rcCompare", Array.from(selected).join(",")); } catch (e) {}
  }

  function starStr(rating) {
    return "★ " + rating.toFixed(1);
  }

  function providerCard(p) {
    var isBest = !!p.best;
    var checked = selected.has(p.id) ? "checked" : "";
    return (
      '<article class="card provider-card' + (isBest ? " best" : "") + '" data-id="' + p.id + '">' +
        (isBest ? '<span class="best-ribbon">' + RC.icon("spark") + " Best Match</span>" : "") +
        '<div class="provider-head">' +
          '<div class="provider-logo">' + RC.escape(p.short) + "</div>" +
          "<div>" +
            '<div class="provider-name">' + RC.escape(p.name) + "</div>" +
            '<div class="provider-cat">' + RC.escape(p.expertise[0] || p.categories[0]) + "</div>" +
          "</div>" +
          '<div class="provider-rating"><div class="r">' + starStr(p.rating) + '</div><div class="star">★★★★★</div></div>' +
        "</div>" +
        '<div class="provider-meta">' +
          '<span class="pmeta">' + RC.icon("mapPin") + RC.escape(p.distanceKm.toFixed(1)) + " km away</span>" +
          '<span class="pmeta">' + RC.icon("wallet") + RC.inr(p.priceRange.min) + "–" + RC.inr(p.priceRange.max) + "</span>" +
          '<span class="pmeta">' + RC.icon("clock") + RC.escape(p.repairTime) + "</span>" +
          '<span class="pmeta">' + RC.icon("calendar") + RC.escape(p.availability) + "</span>" +
        "</div>" +
        '<div class="provider-actions">' +
          '<a class="btn btn-primary btn-sm" href="' + requestUrl(p.id) + '">Request Repair</a>' +
          '<label class="btn btn-outline btn-sm cmp-toggle" style="cursor:pointer">' +
            '<input type="checkbox" ' + checked + ' data-cmp="' + p.id + '" aria-label="Add ' + RC.escape(p.name) + ' to comparison" style="accent-color:var(--brand-strong);flex:none"> Add to compare' +
          "</label>" +
        "</div>" +
      "</article>"
    );
  }

  function sortProviders(list, key) {
    var copy = list.slice();
    if (key === "distance") copy.sort(function (a, b) { return a.distanceKm - b.distanceKm; });
    else if (key === "rating") copy.sort(function (a, b) { return b.rating - a.rating; });
    else if (key === "price") copy.sort(function (a, b) { return a.priceRange.min - b.priceRange.min; });
    else if (key === "time") copy.sort(function (a, b) { return a.repairTime.localeCompare(b.repairTime); });
    else if (key === "score") copy.sort(function (a, b) { return b.score - a.score; });
    return copy;
  }

  function renderList() {
    var listEl = document.getElementById("providerList");
    if (!listEl) return;
    var sortKey = document.getElementById("sortBy") ? document.getElementById("sortBy").value : "score";
    var cat = document.getElementById("filterCat") ? document.getElementById("filterCat").value : "all";
    var q = (document.getElementById("searchBox") ? document.getElementById("searchBox").value : "").trim().toLowerCase();
    var minRating = parseFloat(document.getElementById("filterRating") ? document.getElementById("filterRating").value : "0") || 0;
    var maxDistance = parseFloat(document.getElementById("filterDistance") ? document.getElementById("filterDistance").value : "0") || 0;

    var list = RCData.repairers.filter(function (p) {
      if (cat !== "all" && p.categories.indexOf(cat) === -1) return false;
      if (minRating && p.rating < minRating) return false;
      if (maxDistance && p.distanceKm > maxDistance) return false;
      if (q) {
        var hay = (p.name + " " + (p.expertise || []).join(" ") + " " + (p.categories || []).join(" ")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    list = sortProviders(list, sortKey);

    if (!list.length) {
      listEl.innerHTML =
        '<div class="empty-state">' + RC.icon("search") +
        "<h3>No providers match these filters</h3><p>Try a different category or clear the filter.</p></div>";
      return;
    }

    listEl.innerHTML = list.map(providerCard).join("");

    listEl.querySelectorAll("[data-cmp]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var id = cb.getAttribute("data-cmp");
        if (cb.checked) selected.add(id); else selected.delete(id);
        saveSelected();
        updateCompareBar();
      });
    });
    updateCompareBar();
    syncPins(list);
  }

  function updateCompareBar() {
    var bar = document.getElementById("compareBar");
    var link = document.getElementById("compareLink");
    if (!bar) return;
    var n = selected.size;
    if (n > 0) {
      bar.classList.remove("hidden");
      var label = document.getElementById("compareCount");
      if (label) label.textContent = n;
      if (link) link.href = n ? compareUrl(Array.from(selected)) : "compare.html";
    } else {
      bar.classList.add("hidden");
    }
  }

  function renderBestMatch() {
    var panel = document.getElementById("bestMatchPanel");
    if (!panel) return;
    var best = RCData.repairers.filter(function (p) { return p.best; })[0] || RCData.repairers[0];
    panel.innerHTML =
      '<div class="card" style="border-color:var(--success)">' +
        '<div class="card-head"><div><span class="badge badge-success">' + RC.icon("spark") + " Best Match</span></div></div>" +
        '<div class="provider-head" style="margin-bottom:12px">' +
          '<div class="provider-logo">' + RC.escape(best.short) + "</div>" +
          "<div><div class=\"provider-name\">" + RC.escape(best.name) + "</div>" +
          '<div class="provider-cat">' + starStr(best.rating) + " · " + RC.escape(best.distanceKm.toFixed(1)) + " km</div></div>" +
        "</div>" +
        '<h4 class="card-sub" style="color:var(--navy);font-weight:700;margin-bottom:8px">Why we recommend it</h4>' +
        '<ul class="why-list">' + best.why.map(function (w) {
          return "<li>" + RC.icon("check") + "<span>" + RC.escape(w) + "</span></li>";
        }).join("") + "</ul>" +
        '<a class="btn btn-success btn-block mt-16" href="' + requestUrl(best.id) + '">Request Repair with ' + RC.escape(best.name) + "</a>" +
      "</div>";
  }

  /* --- Map mock (Leaflet-ready placeholder) --- */
  function project(lat, lng) {
    var pts = [RCData.userLocation].concat(RCData.repairers.map(function (p) { return { lat: p.lat, lng: p.lng }; }));
    var lats = pts.map(function (p) { return p.lat; });
    var lngs = pts.map(function (p) { return p.lng; });
    var minLat = Math.min.apply(null, lats) - 0.012, maxLat = Math.max.apply(null, lats) + 0.012;
    var minLng = Math.min.apply(null, lngs) - 0.012, maxLng = Math.max.apply(null, lngs) + 0.012;
    var x = ((lng - minLng) / (maxLng - minLng)) * 100;
    var y = ((maxLat - lat) / (maxLat - minLat)) * 100;
    return { left: Math.max(4, Math.min(92, x)), top: Math.max(10, Math.min(86, y)) };
  }

  function renderMap() {
    var shell = document.getElementById("mapShell");
    if (!shell) return;
    var pins = document.getElementById("mapPins");
    if (pins) pins.innerHTML = "";

    /* "me" pin */
    var me = project(RCData.userLocation.lat, RCData.userLocation.lng);
    if (pins) {
      var meEl = document.createElement("div");
      meEl.className = "map-pin me";
      meEl.style.left = me.left + "%";
      meEl.style.top = me.top + "%";
      meEl.innerHTML = '<div class="pin-dot"><span>📍</span></div>';
      meEl.title = "Your location (demo)";
      pins.appendChild(meEl);
    }

    RCData.repairers.forEach(function (p) {
      if (!pins) return;
      var pos = project(p.lat, p.lng);
      var el = document.createElement("button");
      el.type = "button";
      el.className = "map-pin" + (p.best ? " best" : "");
      el.style.left = pos.left + "%";
      el.style.top = pos.top + "%";
      el.innerHTML = '<div class="pin-dot"><span>' + RC.escape(p.short) + "</span></div>";
      el.setAttribute("aria-label", p.name + " — view details");
      el.addEventListener("click", function () {
        var card = document.querySelector('.provider-card[data-id="' + p.id + '"]');
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.style.outline = "2px solid var(--brand)";
          setTimeout(function () { card.style.outline = ""; }, 1600);
        }
      });
      pins.appendChild(el);
    });
  }

  function syncPins(visible) {
    var ids = visible.map(function (p) { return p.id; });
    document.querySelectorAll(".map-pin:not(.me)").forEach(function (pin) {
      var aria = pin.getAttribute("aria-label") || "";
      pin.style.display = "none";
      ids.forEach(function (id) {
        var p = RCData.repairers.find(function (x) { return x.id === id; });
        if (p && aria.indexOf(p.name) === 0) pin.style.display = "";
      });
    });
  }

  /* ---------- Real Leaflet + OpenStreetMap map (graceful fallback) ---------- */
  function initLeafletMap() {
    if (typeof window.L === "undefined") return; // keep the placeholder
    var host = document.getElementById("leafletMap");
    var shell = document.getElementById("mapShell");
    if (!host || !shell) return;

    try {
      var map = L.map(host, { zoomControl: true, attributionControl: true })
        .setView([RCData.userLocation.lat, RCData.userLocation.lng], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      /* Mark decorative tile images as such (alt="") for accessibility. */
      var obs = new MutationObserver(function () {
        host.querySelectorAll("img.leaflet-tile:not([alt])").forEach(function (img) {
          img.setAttribute("alt", "");
        });
      });
      obs.observe(host, { childList: true, subtree: true });
      host.querySelectorAll("img.leaflet-tile").forEach(function (img) { img.setAttribute("alt", ""); });

      // user location (demo default)
      var userMarker = L.circleMarker([RCData.userLocation.lat, RCData.userLocation.lng], {
        radius: 8, color: "#011B3A", fillColor: "#011B3A", fillOpacity: 1
      }).addTo(map).bindPopup("Your location (approx.)");

      // provider markers
      RCData.repairers.forEach(function (p) {
        var icon = L.divIcon({
          className: "",
          html: '<div class="pin-dot" style="width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:' +
            (p.best ? "#0FA968" : "#0B6CF2") +
            ';border:2.5px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:#fff;font-weight:800;font-size:.78rem">' +
            RC.escape(p.short) + "</span></div>",
          iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30]
        });
        L.marker([p.lat, p.lng], { icon: icon }).addTo(map)
          .bindPopup("<strong>" + RC.escape(p.name) + "</strong><br>" +
            RC.escape(p.expertise[0] || "") + "<br>★ " + p.rating.toFixed(1) +
            " · " + p.distanceKm.toFixed(1) + " km");
      });

      // Browser geolocation (permission-gated, graceful fallback)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (pos) {
          map.setView([pos.coords.latitude, pos.coords.longitude], 13);
          userMarker.setLatLng([pos.coords.latitude, pos.coords.longitude]);
        }, function () {
          /* denied/unavailable/timeout — keep the demo default location */
        }, { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 });
      }

      // Hide the placeholder once the real map is up.
      var overlayNote = shell.querySelector(".map-overlay");
      var svg = shell.querySelector(".map-canvas:not(#leafletMap)");
      var pins = document.getElementById("mapPins");
      if (overlayNote) overlayNote.style.display = "none";
      if (svg && svg.id !== "leafletMap") svg.style.display = "none";
      if (pins) pins.style.display = "none";
    } catch (e) {
      /* map failed — keep the placeholder, no harm */
    }
  }

  function init() {
    readSelected();
    renderMap();
    initLeafletMap();
    renderBestMatch();

    var sortSel = document.getElementById("sortBy");
    var catSel = document.getElementById("filterCat");
    var ratingSel = document.getElementById("filterRating");
    var distanceSel = document.getElementById("filterDistance");
    var searchBox = document.getElementById("searchBox");
    if (sortSel) sortSel.addEventListener("change", renderList);
    if (catSel) catSel.addEventListener("change", renderList);
    if (ratingSel) ratingSel.addEventListener("change", renderList);
    if (distanceSel) distanceSel.addEventListener("change", renderList);
    if (searchBox) searchBox.addEventListener("input", renderList);

    renderList();
  }

  return { init: init };
})();
