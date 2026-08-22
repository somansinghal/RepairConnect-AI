/* ==========================================================================
   RepairConnect AI — AI provider abstraction (OpenAI primary, Groq backup)
   Runs server-side only. Uses plain fetch (no frontend SDK). Both providers
   are normalized to the same output. Failover is bounded (no endless retry).
   ========================================================================== */
"use strict";

const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_OPENAI_BASE = "https://api.openai.com/v1";
const DEFAULT_GROQ_BASE = "https://api.groq.com/openai/v1";

function env(name) { return process.env[name] || ""; }

function isFailoverCondition(err) {
  if (!err) return false;
  if (err.timeout) return true;
  if (err.status === 429) return true;                 // rate limit / quota
  if (err.status && err.status >= 500) return true;    // provider server error
  if (err.code === "ECONNRESET" || err.code === "ENOTFOUND" || err.code === "ETIMEDOUT") return true;
  return false;
}

function aiError(message, status, timeout) {
  const e = new Error(message);
  e.status = status || 0;
  e.timeout = !!timeout;
  e.isAiError = true;
  return e;
}

async function fetchWithTimeout(url, opts, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, Object.assign({}, opts, { signal: ctrl.signal }));
    clearTimeout(t);
    return res;
  } catch (e) {
    clearTimeout(t);
    if (e && (e.name === "AbortError")) throw aiError("AI request timed out", 0, true);
    e.code = e.code || (e.cause && e.cause.code);
    throw e;
  }
}

/* Build a chat message list from optional image (data URL) + prompt. */
function buildMessages(systemPrompt, userPrompt, imageDataUrl) {
  const content = [];
  if (imageDataUrl) content.push({ type: "image_url", image_url: { url: imageDataUrl } });
  content.push({ type: "text", text: userPrompt });
  return [
    { role: "system", content: systemPrompt },
    { role: "user", content }
  ];
}

/** OpenAI vision call (primary). Returns { text, rawJson }. */
async function callOpenAI({ systemPrompt, userPrompt, imageDataUrl, json }) {
  const key = env("OPENAI_API_KEY");
  const model = env("OPENAI_VISION_MODEL") || "";
  if (!key) throw aiError("OPENAI_API_KEY is not configured", 0, false);
  if (!model) throw aiError("OPENAI_VISION_MODEL is not configured", 0, false);

  const body = {
    model,
    messages: buildMessages(systemPrompt, userPrompt, imageDataUrl),
    temperature: 0.2
  };
  if (json) body.response_format = { type: "json_object" };

  const res = await fetchWithTimeout(
    (env("OPENAI_BASE_URL") || DEFAULT_OPENAI_BASE).replace(/\/+$/, "") + "/chat/completions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify(body)
    },
    DEFAULT_TIMEOUT_MS
  );

  if (!res.ok) {
    throw aiError("OpenAI error " + res.status, res.status, false);
  }
  const data = await res.json();
  const text = data && data.choices && data.choices[0] && data.choices[0].message
    ? (data.choices[0].message.content || "") : "";
  return { provider: "openai", text, rawJson: tryParseJson(text) };
}

/** Groq vision call (backup). Returns { text, rawJson }. */
async function callGroq({ systemPrompt, userPrompt, imageDataUrl, json }) {
  const key = env("GROQ_API_KEY");
  const model = env("GROQ_VISION_MODEL") || "";
  if (!key) throw aiError("GROQ_API_KEY is not configured", 0, false);
  if (!model) throw aiError("GROQ_VISION_MODEL is not configured", 0, false);

  const body = {
    model,
    messages: buildMessages(systemPrompt, userPrompt, imageDataUrl),
    temperature: 0.2
  };
  if (json) body.response_format = { type: "json_object" };

  const res = await fetchWithTimeout(
    (env("GROQ_BASE_URL") || DEFAULT_GROQ_BASE).replace(/\/+$/, "") + "/chat/completions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify(body)
    },
    DEFAULT_TIMEOUT_MS
  );

  if (!res.ok) {
    throw aiError("Groq error " + res.status, res.status, false);
  }
  const data = await res.json();
  const text = data && data.choices && data.choices[0] && data.choices[0].message
    ? (data.choices[0].message.content || "") : "";
  return { provider: "groq", text, rawJson: tryParseJson(text) };
}

function tryParseJson(text) {
  try {
    const cleaned = String(text).replace(/```(?:json)?/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    return JSON.parse(cleaned);
  } catch (e) {
    return null;
  }
}

/**
 * Run an AI call with OpenAI primary and bounded Groq failover.
 * @returns {{provider:string, text:string, rawJson:any|null}}
 */
async function run({ systemPrompt, userPrompt, imageDataUrl, json }) {
  try {
    return await callOpenAI({ systemPrompt, userPrompt, imageDataUrl, json });
  } catch (err) {
    if (!isFailoverCondition(err)) throw err;
    console.warn("[ai] OpenAI failover -> Groq:", err.message);
    return callGroq({ systemPrompt, userPrompt, imageDataUrl, json });
  }
}

module.exports = { run, isFailoverCondition, tryParseJson, aiError };
