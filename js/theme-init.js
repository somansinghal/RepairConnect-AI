/* ==========================================================================
   RepairConnect AI — Theme bootstrap (no-flash)
   Loaded synchronously in <head> BEFORE the stylesheets so the correct theme
   is applied before first paint.
   Preference ('light' | 'dark' | 'system') is read from localStorage (key:
   rc-theme). With no saved preference, the OS setting (prefers-color-scheme)
   is used. data-theme = RESOLVED value; data-theme-pref = the preference.
   ========================================================================== */
(function () {
  "use strict";
  var pref = "system";
  try { pref = localStorage.getItem("rc-theme") || "system"; } catch (e) { pref = "system"; }

  var dark;
  if (pref === "dark") dark = true;
  else if (pref === "light") dark = false;
  else dark = !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme-pref", pref);
})();
