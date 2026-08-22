/* ==========================================================================
   RepairConnect AI — Demo repair providers (sample data layer)
   --------------------------------------------------------------------------
   DEMO DATA ONLY. These are clearly-labelled SAMPLE providers and are NOT
   real businesses. Mirrors the `repairProviders` collection in
   DATABASE_SCHEMA.md so real Firestore data can replace this file later.
   Distances below are pre-computed from the demo user location for the
   sample UI; the live build computes them with the Haversine formula.
   ========================================================================== */
window.RCData = window.RCData || {};

/* Demo user location (Varanasi, India) — used by the map mock. */
window.RCData.userLocation = { lat: 25.3176, lng: 82.9739, label: "Your location" };

window.RCData.repairers = [
  {
    id: "prov-fixpoint",
    name: "FixPoint",
    short: "FP",
    categories: ["laptop", "desktop", "tablet"],
    expertise: ["Laptop screen replacement", "Display repair", "Keyboard"],
    rating: 4.7,
    distanceKm: 1.8,
    priceRange: { min: 7500, max: 9000, currency: "INR" },
    repairTime: "1–2 days",
    availability: "Mon–Sat · 10:00–19:00",
    contact: { phone: "+91 90000 00001", email: "hello@fixpoint.demo" },
    lat: 25.3231, lng: 82.9852,
    best: true,
    why: [
      "Strong laptop expertise",
      "Closest suitable provider",
      "Good rating (4.7)",
      "Competitive estimated price",
      "Fast turnaround"
    ],
    score: 0.91
  },
  {
    id: "prov-techcare",
    name: "TechCare",
    short: "TC",
    categories: ["laptop", "smartphone", "tablet"],
    expertise: ["Laptop repair", "Screen replacement", "Battery"],
    rating: 4.5,
    distanceKm: 2.4,
    priceRange: { min: 6500, max: 8500, currency: "INR" },
    repairTime: "2–3 days",
    availability: "Mon–Sun · 09:30–20:00",
    contact: { phone: "+91 90000 00002", email: "care@techcare.demo" },
    lat: 25.3092, lng: 82.9869,
    best: false,
    why: null,
    score: 0.87
  },
  {
    id: "prov-device-doctor",
    name: "Device Doctor",
    short: "DD",
    categories: ["laptop", "desktop", "home_appliance"],
    expertise: ["General laptop repair", "Motherboard diagnostics"],
    rating: 4.2,
    distanceKm: 4.1,
    priceRange: { min: 6900, max: 8600, currency: "INR" },
    repairTime: "3–4 days",
    availability: "Mon–Sat · 10:00–18:30",
    contact: { phone: "+91 90000 00003", email: "help@devicedoctor.demo" },
    lat: 25.3002, lng: 82.9470,
    best: false,
    why: null,
    score: 0.74
  },
  {
    id: "prov-voltfix",
    name: "VoltFix",
    short: "VF",
    categories: ["smartphone", "laptop", "wearable"],
    expertise: ["Phone battery", "Charging port", "Screen replacement"],
    rating: 4.6,
    distanceKm: 3.2,
    priceRange: { min: 7000, max: 8800, currency: "INR" },
    repairTime: "1–2 days",
    availability: "Mon–Sat · 10:00–20:00",
    contact: { phone: "+91 90000 00004", email: "hi@voltfix.demo" },
    lat: 25.3290, lng: 82.9550,
    best: false,
    why: null,
    score: 0.82
  },
  {
    id: "prov-greenhub",
    name: "GreenRepair Hub",
    short: "GR",
    categories: ["laptop", "home_appliance", "tv"],
    expertise: ["Laptop repair", "Appliance service", "Eco-friendly parts"],
    rating: 4.3,
    distanceKm: 5.6,
    priceRange: { min: 7200, max: 9200, currency: "INR" },
    repairTime: "2–3 days",
    availability: "Tue–Sun · 10:00–19:00",
    contact: { phone: "+91 90000 00005", email: "repair@greenhub.demo" },
    lat: 25.2910, lng: 83.0040,
    best: false,
    why: null,
    score: 0.71
  }
];
