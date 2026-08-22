/* ==========================================================================
   RepairConnect AI — Demo devices (sample data layer)
   --------------------------------------------------------------------------
   NOTE: This is clearly-labelled DEMO data used only to render the UI.
   It will later be replaced by Firestore reads (see DATABASE_SCHEMA.md,
   `devices` collection). Keep the field names aligned so the swap is a
   find-and-replace of the data source, not a UI rewrite.
   ========================================================================== */
window.RCData = window.RCData || {};

window.RCData.devices = [
  {
    id: "dev-laptop-01",
    category: "laptop",
    icon: "laptop",
    name: "Dell XPS 13",
    meta: "Laptop · 2.5 yrs old"
  },
  {
    id: "dev-phone-01",
    category: "smartphone",
    icon: "phone",
    name: "Samsung Galaxy A52",
    meta: "Smartphone · 1.5 yrs old"
  },
  {
    id: "dev-audio-01",
    category: "audio",
    icon: "headphones",
    name: "Sony WH-1000XM4",
    meta: "Headphones · 3 yrs old"
  }
];

/* Icon key -> inline SVG markup (stroke style) used by renderers */
window.RCData.deviceIcons = {
  laptop: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="11" rx="2"/><path d="M2 19h20"/></svg>',
  phone: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>',
  headphones: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>',
  tv: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M8 3l4 3 4-3"/></svg>',
  appliance: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9z"/><path d="M7 6h10a1 1 0 0 1 1 1v3H6V7a1 1 0 0 1 1-1z"/></svg>',
  tablet: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M11 17h2"/></svg>'
};
