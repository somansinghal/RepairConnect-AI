/* ==========================================================================
   RepairConnect AI — request validation helpers (pure, unit-testable)
   ========================================================================== */
"use strict";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_TEXT_CHARS = 2000;
const ACCEPTED_MIME = { "image/jpeg": true, "image/png": true, "image/webp": true };

/** UTC day string "YYYY-MM-DD" for rate-limit windows. */
function utcDay(date) {
  return new Date(date || Date.now()).toISOString().slice(0, 10);
}

/**
 * Decode a `data:<mime>;base64,...` string. Returns { mime, buffer, dataUrl }
 * or null when missing/unsupported/oversized.
 */
function decodeImage(base64) {
  if (typeof base64 !== "string" || !base64) return null;
  const match = base64.match(/^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  if (!ACCEPTED_MIME[mime]) return null;
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) return null;
  return { mime, buffer, dataUrl: base64 };
}

module.exports = { utcDay, decodeImage, MAX_IMAGE_BYTES, MAX_TEXT_CHARS, ACCEPTED_MIME };
