/* ==========================================================================
   RepairConnect AI — Firebase client initialization
   --------------------------------------------------------------------------
   Initializes the Firebase Web SDK (compat build) from js/firebase-config.js.
   The app stays in clearly-labelled DEMO MODE until real config is provided.
   ========================================================================== */
window.RC = window.RC || {};

RC.fb = (function () {
  "use strict";

  var app = null, db = null, auth = null, functions = null, _live = false, _initDone = false;

  function isConfigured() {
    var c = (window.RC_CONFIG && window.RC_CONFIG.firebase) || {};
    return !!(
      c.projectId &&
      c.projectId.indexOf("your-project-id") === -1 &&
      c.apiKey &&
      c.apiKey.indexOf("YOUR_") === -1 &&
      c.appId &&
      c.appId.indexOf("YOUR_") === -1
    );
  }

  function init() {
    if (_initDone) return { live: _live };
    _initDone = true;
    if (!isConfigured()) return { live: false };
    if (!window.firebase) return { live: false };
    try {
      app = firebase.initializeApp(window.RC_CONFIG.firebase);
      db = firebase.firestore(app);
      auth = firebase.auth(app);
      functions = firebase.functions(app);
      var region = window.RC_CONFIG.firebase.functionsRegion;
      if (region) functions.region = region;
      _live = true;
    } catch (e) {
      _live = false;
    }
    return { live: _live };
  }

  function isLive() { return _live; }

  return {
    init: init,
    isConfigured: isConfigured,
    isLive: isLive,
    get app() { return app; },
    get db() { return db; },
    get auth() { return auth; },
    get functions() { return functions; }
  };
})();
