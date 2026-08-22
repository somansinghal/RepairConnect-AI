#!/usr/bin/env node
/* ==========================================================================
   RepairConnect AI — Product demo recording (Playwright)
   --------------------------------------------------------------------------
   Records the primary user journey as a WebM video suitable for GitHub,
   portfolio, judging, and social media. Uses DEMO DATA ONLY — no API keys,
   no credentials, no personal data.
   Output: recordings/demo.webm
   ========================================================================== */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const PORT = 8126;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT_DIR = path.join(ROOT, "recordings");
const OUT_FILE = path.join(OUT_DIR, "demo.webm");

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8",
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      if (p === "/") p = "/index.html";
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        res.writeHead(404); res.end(); return;
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(f).toLowerCase()] || "application/octet-stream" });
      fs.createReadStream(f).pipe(res);
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // clear any previous recording artifacts
  fs.readdirSync(OUT_DIR).forEach((f) => {
    if (f.endsWith(".webm")) fs.rmSync(path.join(OUT_DIR, f));
  });
  const server = await startServer();
  console.log(`Serving ${BASE}`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 800 } },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  const goto = async (file, settleMs) => {
    await page.goto(`${BASE}/${file}`, { waitUntil: "load", timeout: 15000 });
    await page.evaluate(() => {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
    }).catch(() => {});
    await wait(settleMs || 1500);
  };

  /* The recording drives the real demo flow: enter the demo session first
     (via the login page's demo entry), then every protected page is allowed. */
  await page.addInitScript(() => {
    try {
      localStorage.setItem("rc-demo-store-v1:user",
        JSON.stringify({ uid: "demo-user", email: "demo@repairconnect.ai", name: "Alex Demo" }));
    } catch (e) {}
  });

  console.log("Recording demo journey…");

  // 1. Landing
  await goto("index.html", 2600);

  // 2. Judge Demo entry (login page → "Try Demo" → dashboard)
  await goto("login.html", 1600);
  await page.click('[data-demo-enter]').catch(() => {});
  await wait(1600);

  // 3. Dashboard
  await goto("dashboard.html", 2200);

  // 4. Add/select device (profile modal)
  await goto("profile.html", 800);
  await page.click("#addDeviceBtn").catch(() => {});
  await wait(700);
  await page.click("#deviceModalClose").catch(() => {});
  await wait(500);

  // 5. Analyze
  await goto("analyze.html", 1800);

  // 6. Diagnosis
  await goto("diagnosis.html", 2200);

  // 7. Repair vs Replace
  await goto("repair-decision.html", 2400);

  // 8. Repairer discovery (map)
  await goto("repairers.html", 2600);

  // 9. Comparison
  await goto("compare.html", 2000);

  // 10. Request repair (fill demo form + submit to success state)
  await goto("request-repair.html", 600);
  await page.fill("#prefDate", "2026-09-01").catch(() => {});
  await page.fill("#contactPhone", "+91 90000 00000").catch(() => {});
  await page.click('#requestForm button[type="submit"]').catch(() => {});
  await wait(2200);

  // 11. Repair tracking
  await goto("tracking.html", 2200);

  // 12. AI assistant (ask a suggested question)
  await goto("assistant.html", 600);
  await page.click('.suggest[data-key="whyrepair"]').catch(() => {});
  await wait(2200);

  await ctx.close();
  await browser.close();
  server.close();

  // Playwright names the video after the page; rename to a stable name.
  const generated = fs.readdirSync(OUT_DIR).find((f) => f.endsWith(".webm"));
  if (generated) {
    if (fs.existsSync(OUT_FILE)) fs.rmSync(OUT_FILE);
    fs.renameSync(path.join(OUT_DIR, generated), OUT_FILE);
  }

  if (fs.existsSync(OUT_FILE)) {
    const mb = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(1);
    console.log(`✔ Recording saved: ${OUT_FILE} (${mb} MB)`);
    if (errors.length) console.log(`⚠ ${errors.length} page error(s) recorded (non-fatal)`);
  } else {
    console.error("✖ Recording failed — no output file produced.");
    process.exit(1);
  }
}

main().catch((e) => { console.error("Fatal:", e); process.exit(2); });
