/* ==========================================================================
   RepairConnect AI — Firebase configuration (PLACEHOLDERS)
   --------------------------------------------------------------------------
   IMPORTANT:
   • The Firebase web config is NOT a server-side secret. It identifies the
     project and is expected in the frontend; data protection comes from
     Firebase Authentication + Firestore/Storage Security Rules + backend
     authorization — never from hiding this config.
   • Replace the placeholder values below with your real Firebase project's
     web config to switch the app from DEMO MODE into LIVE MODE.
   • Never put service-account credentials or any API key in this file.
   ========================================================================== */
window.RC_CONFIG = window.RC_CONFIG || {};

window.RC_CONFIG.firebase = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000",
  functionsRegion: "us-central1"
};

/* Judge / demo account.
   The password must NOT be hardcoded here. Configure it via your deployment
   environment (e.g. Vercel env vars injected at build/render time) and expose
   only the values needed. Leave password empty and the "Judge Demo" button
   will be disabled with a clear message. */
window.RC_CONFIG.judgeDemo = {
  email: "judge@repairconnect.ai",
  password: ""
};
