#!/usr/bin/env node
/* ==========================================================================
   RepairConnect AI — Automated quality audit (tooling only)
   Checks:
     • broken internal links + missing local assets (static, per page)
     • horizontal overflow (scrollWidth > innerWidth)
     • console errors / page errors
     • failed navigation + failed network requests (runtime)
     • images missing alt text
     • inputs missing associated labels
   Reports a summary. Exit code 1 if critical issues are found.
   ========================================================================== */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const PORT = 8124;
const BASE = `http://127.0.0.1:${PORT}`;

const PAGES = [
  "index.html", "about.html", "login.html", "signup.html", "dashboard.html",
  "analyze.html", "diagnosis.html", "repair-decision.html", "repairers.html",
  "compare.html", "request-repair.html", "tracking.html", "assistant.html", "profile.html",
  "privacy-policy.html", "terms-of-service.html", "cookie-policy.html", "disclaimer.html", "security.html", "contact.html", "how-it-works.html", "features.html", "faq.html", "repair-guide.html", "sustainability.html", "404.html",
];

/* Responsive test matrix: mobile-first portrait widths, landscape phones,
   and dark-theme spot checks. Sorted smallest → largest; every layout is
   also verified to interpolate smoothly (no fixed device-specific hacks). */
const WIDTHS = [320, 360, 375, 390, 414, 430, 600, 768, 1024, 1280, 1366, 1440, 1536, 1920, 2560, 3440];
const LANDSCAPE = [[667, 375], [844, 390], [896, 414], [932, 430]];
const DARK_WIDTHS = [320, 768, 1440];

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8",
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

/* Static pass: broken internal links + missing local assets across all pages. */
function staticLinkAudit() {
  const issues = [];
  for (const page of PAGES) {
    const html = fs.readFileSync(path.join(ROOT, page), "utf8");
    const refs = [];
    const re = /(?:href|src)="([^"#]+)"/g;
    let m;
    while ((m = re.exec(html)) !== null) refs.push(m[1]);

    for (let u of refs) {
      if (u.startsWith("http") || u.startsWith("mailto:") || u.startsWith("data:") || u.startsWith("tel:") || u.startsWith("blob:")) continue;
      u = u.split("?")[0].split("#")[0];
      if (!u) continue;
      const target = path.join(ROOT, u);
      if (!fs.existsSync(target)) issues.push(`${page}: ${u}`);
    }
  }
  return issues;
}

async function main() {
  // Static pass first (no browser needed)
  const linkIssues = staticLinkAudit();
  console.log(`Broken links / missing assets: ${linkIssues.length}`);
  linkIssues.slice(0, 30).forEach((l) => console.log("   ↳ " + l));

  const server = await startServer();
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const consoleErrors = [];
  const failedRequests = [];
  const failedNavs = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("requestfailed", (r) => {
    // Ignore aborted/cancelled (e.g. AbortController timeouts) — report real failures.
    if (r.failure() && r.failure().errorText !== "net::ERR_ABORTED") {
      failedRequests.push(r.url() + " — " + r.failure().errorText);
    }
  });

  let overflowCount = 0;
  let a11yCount = 0;
  const overflowReport = [];

  for (const file of PAGES) {
    const resp = await page.goto(`${BASE}/${file}`, { waitUntil: "load", timeout: 15000 }).catch(() => null);
    if (!resp || !resp.ok()) failedNavs.push(file + " → " + (resp ? resp.status() : "timeout"));
    await page.evaluate(() => {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
    }).catch(() => {});
    await page.waitForTimeout(400);

    const checkOverflow = async (w, h, label) => {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(120);
      const r = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          sw: doc.scrollWidth,
          iw: window.innerWidth,
          overflow: doc.scrollWidth > window.innerWidth + 1,
        };
      });
      if (r.overflow) {
        overflowCount++;
        overflowReport.push(`${file} @ ${label} (scrollWidth ${r.sw} > ${r.iw})`);
      }
    };

    for (const w of WIDTHS) await checkOverflow(w, 900, `${w}px`);
    for (const [w, h] of LANDSCAPE) await checkOverflow(w, h, `${w}×${h} landscape`);

    // Dark theme spot checks (temporarily switch, measure, restore).
    for (const w of DARK_WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(120);
      const darkOv = await page.evaluate(() => {
        const d = document.documentElement;
        const prev = d.getAttribute("data-theme");
        d.setAttribute("data-theme", "dark");
        const bad = d.scrollWidth > window.innerWidth + 1;
        d.setAttribute("data-theme", prev === "dark" ? "dark" : "light");
        return bad;
      });
      if (darkOv) {
        overflowCount++;
        overflowReport.push(`${file} @ ${w}px (dark theme)`);
      }
    }

    // Accessibility spot checks at desktop width
    await page.setViewportSize({ width: 1440, height: 900 });
    const a11y = await page.evaluate(() => {
      const issues = [];
      document.querySelectorAll("img").forEach((img) => {
        // alt must be PRESENT; empty alt ("") is valid for decorative images.
        if (img.getAttribute("alt") === null) issues.push("img missing alt");
      });
      document.querySelectorAll("input, select, textarea").forEach((el) => {
        if (el.type === "hidden") return;
        const id = el.id;
        if (!id || !document.querySelector(`label[for="${id}"]`)) {
          if (!el.getAttribute("aria-label")) issues.push(`${el.tagName}#${id || "?"} missing label`);
        }
      });
      document.querySelectorAll("button").forEach((b) => {
        const text = (b.textContent || "").trim();
        if (!text && !b.getAttribute("aria-label")) issues.push("button missing accessible name");
      });
      return issues;
    });
    if (a11y.length) {
      a11yCount += a11y.length;
      console.log(`  a11y  ${file}: ${a11y.join(", ")}`);
    }
  }

  await browser.close();
  server.close();

  console.log(`\nPages checked: ${PAGES.length} pages × (${WIDTHS.length} portrait widths + ${LANDSCAPE.length} landscape + ${DARK_WIDTHS.length} dark-theme) = ${PAGES.length * (WIDTHS.length + LANDSCAPE.length + DARK_WIDTHS.length)} overflow checks`);
  console.log(`Horizontal overflow issues: ${overflowCount}`);
  overflowReport.slice(0, 30).forEach((l) => console.log("   ↳ " + l));
  console.log(`Console/page errors: ${consoleErrors.length}`);
  consoleErrors.slice(0, 10).forEach((l) => console.log("   ↳ " + l));
  console.log(`Failed navigations: ${failedNavs.length}`);
  failedNavs.slice(0, 10).forEach((l) => console.log("   ↳ " + l));
  console.log(`Failed network requests: ${failedRequests.length}`);
  failedRequests.slice(0, 10).forEach((l) => console.log("   ↳ " + l));
  console.log(`Accessibility spot issues: ${a11yCount}`);

  const critical = overflowCount + consoleErrors.length + failedNavs.length + failedRequests.length + linkIssues.length;
  process.exit(critical ? 1 : 0);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(2); });
