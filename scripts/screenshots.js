#!/usr/bin/env node
/* ==========================================================================
   RepairConnect AI — Screenshot generator (GitHub showcase)
   --------------------------------------------------------------------------
   Tooling only — NOT part of the production frontend. Uses Playwright to
   capture each important page at a consistent viewport and save polished
   PNGs into screenshots/ (desktop) and screenshots/mobile/ (mobile).

   Usage:
     npm run screenshots            # desktop + mobile
     npm run screenshots:desktop    # desktop only
     npm run screenshots:mobile     # mobile only
   ========================================================================== */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const PORT = 8123;
const BASE = `http://127.0.0.1:${PORT}`;

/* Pages to capture, in showcase order. `before` runs after the page is ready
   and after reveal-animations are forced in — use it to put the page into its
   best demo state. */
const PAGES = [
  { file: "index.html",         name: "01-home",           label: "Landing Page" },
  { file: "dashboard.html",     name: "02-dashboard",      label: "Dashboard" },
  { file: "analyze.html",       name: "03-analyze",        label: "Analyze Damage" },
  { file: "diagnosis.html",     name: "04-diagnosis",      label: "AI Diagnosis" },
  { file: "repair-decision.html", name: "05-repair-decision", label: "Repair vs Replace" },
  { file: "repairers.html",     name: "06-repairers",      label: "Nearby Repairers" },
  { file: "compare.html",       name: "07-comparison",     label: "Comparison" },
  { file: "request-repair.html", name: "08-request-repair", label: "Request Repair" },
  { file: "tracking.html",      name: "09-tracking",       label: "Repair Tracking" },
  {
    file: "assistant.html", name: "10-ai-assistant", label: "AI Assistant",
    before: async (page) => {
      // Show a realistic conversation: click a suggested question, wait for reply.
      await page.waitForSelector(".suggest", { timeout: 5000 }).catch(() => {});
      await page.click(".suggest[data-key='whyrepair']").catch(() => {});
      await page.waitForTimeout(1200);
    }
  },
  { file: "profile.html",       name: "11-profile",        label: "Profile" },
  { file: "contact.html",       name: "12-contact",        label: "Contact" },
  { file: "privacy-policy.html", name: "13-privacy-policy", label: "Privacy Policy" },
  { file: "terms-of-service.html", name: "14-terms-of-service", label: "Terms of Service" },
  { file: "cookie-policy.html", name: "15-cookie-policy",  label: "Cookie Policy" },
  { file: "disclaimer.html",    name: "16-disclaimer",     label: "Disclaimer" },
  { file: "security.html",      name: "17-security",       label: "Security" },
  { file: "how-it-works.html",  name: "18-how-it-works",   label: "How It Works" },
  { file: "features.html",      name: "19-features",       label: "Features" },
  { file: "faq.html",           name: "20-faq",            label: "FAQ" },
  { file: "repair-guide.html",  name: "21-repair-guide",   label: "Repair Guide" },
  { file: "sustainability.html",name: "22-sustainability", label: "Sustainability" },
];

const MOBILE_PAGES = [
  { file: "index.html", name: "01-home", label: "Landing Page" },
  { file: "dashboard.html", name: "02-dashboard", label: "Dashboard" },
  { file: "diagnosis.html", name: "03-diagnosis", label: "AI Diagnosis" },
  { file: "repairers.html", name: "04-repairers", label: "Nearby Repairers" },
  { file: "tracking.html", name: "05-tracking", label: "Repair Tracking" },
];

/* ---------- Minimal static file server (no dependencies) ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent(req.url.split("?")[0]);
      if (urlPath === "/") urlPath = "/index.html";
      const filePath = path.join(ROOT, urlPath);
      if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404); res.end("Not found"); return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

/* Establish a demo session + force scroll-reveal elements into view.
   (The auth gate redirects protected pages to login without a session.) */
async function settlePage(page) {
  await page.evaluate(() => {
    try {
      localStorage.setItem("rc-demo-store-v1:user",
        JSON.stringify({ uid: "demo-user", email: "demo@repairconnect.ai", name: "Alex Demo" }));
    } catch (e) {}
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
  });
  // Allow entrance animations to finish before capture.
  await page.waitForTimeout(1100);
}

async function capture(page, spec, outDir, viewport) {
  const url = `${BASE}/${spec.file}`;
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push(String(err)));

  /* Set the demo session BEFORE the page loads so the auth gate allows it. */
  await page.addInitScript(() => {
    try {
      localStorage.setItem("rc-demo-store-v1:user",
        JSON.stringify({ uid: "demo-user", email: "demo@repairconnect.ai", name: "Alex Demo" }));
    } catch (e) {}
  });
  await page.goto(url, { waitUntil: "load", timeout: 15000 });
  await settlePage(page);
  if (spec.before) await spec.before(page);

  const out = path.join(outDir, `${spec.name}.png`);
  await page.screenshot({ path: out });
  const size = fs.statSync(out).size;
  if (size < 3000) throw new Error(`screenshot suspiciously small (${size} bytes)`);
  return { errors };
}

async function main() {
  const args = process.argv.slice(2);
  const wantDesktop = !args.includes("--mobile") || args.includes("--desktop");
  const wantMobile = !args.includes("--desktop") || args.includes("--mobile");

  const server = await startServer();
  console.log(`Static server running at ${BASE}`);

  const browser = await chromium.launch();
  let failures = 0;

  if (wantDesktop) {
    fs.mkdirSync(path.join(ROOT, "screenshots"), { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    console.log("\n— Desktop 1440×900 —");
    for (const spec of PAGES) {
      try {
        const { errors } = await capture(page, spec, path.join(ROOT, "screenshots"), { width: 1440, height: 900 });
        const errNote = errors.length ? ` (${errors.length} console error(s))` : "";
        console.log(`  ✔ ${spec.name}.png  ${spec.label}${errNote}`);
      } catch (e) {
        failures++;
        console.log(`  ✖ ${spec.name}.png  FAILED — ${e.message}`);
      }
    }
    await ctx.close();
  }

  if (wantMobile) {
    fs.mkdirSync(path.join(ROOT, "screenshots", "mobile"), { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    console.log("\n— Mobile 390×844 —");
    for (const spec of MOBILE_PAGES) {
      try {
        const { errors } = await capture(page, spec, path.join(ROOT, "screenshots", "mobile"), { width: 390, height: 844 });
        const errNote = errors.length ? ` (${errors.length} console error(s))` : "";
        console.log(`  ✔ mobile/${spec.name}.png  ${spec.label}${errNote}`);
      } catch (e) {
        failures++;
        console.log(`  ✖ mobile/${spec.name}.png  FAILED — ${e.message}`);
      }
    }
    await ctx.close();
  }

  await browser.close();
  server.close();

  console.log(failures === 0 ? "\nAll screenshots captured ✔" : `\n${failures} screenshot(s) failed ✖`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
