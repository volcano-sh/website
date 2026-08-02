import process from "node:process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { retrieve } from "./retrieve.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAX_QUESTION_LEN = 500;
const MAX_HISTORY = 6;

const SYSTEM = `You are the Ask AI assistant for Volcano (https://volcano.sh), a CNCF cloud-native batch scheduling system.

Rules:
- Answer ONLY using the provided documentation context. If the context is insufficient, say you don't know and suggest related docs links from the context when possible.
- Do not invent APIs, flags, or behavior not present in the context.
- Prefer concise, practical answers. Use short bullet lists when helpful.
- At the end, add a "Sources:" section listing the documentation URLs you used (from the context only).
- If the user asks something unrelated to Volcano, politely decline.`;

function loadIndex() {
  const raw = readFileSync(join(__dirname, "docs-index.json"), "utf8");
  return JSON.parse(raw);
}

function corsHeaders(origin) {
  const allowed =
    origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ? origin
      : "https://volcano.sh";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function buildContext(chunks) {
  return chunks
    .map((c, i) => `[${i + 1}] ${c.title}\nURL: ${c.url}\n${c.content}`)
    .join("\n\n---\n\n");
}

export default async (req) => {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" }, headers);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" }, headers);
  }

  const question = String(body?.question || "").trim();
  if (!question) return json(400, { error: "question is required" }, headers);
  if (question.length > MAX_QUESTION_LEN) {
    return json(
      400,
      { error: `question must be ≤ ${MAX_QUESTION_LEN} characters` },
      headers,
    );
  }

  const history = Array.isArray(body?.history)
    ? body.history.slice(-MAX_HISTORY)
    : [];

  let index;
  try {
    index = loadIndex();
  } catch {
    return json(
      503,
      { error: "Docs index missing. Run: npm run build:ask-ai-index" },
      headers,
    );
  }

  const sources = retrieve(index.chunks, question, { topK: 6 });
  if (!sources.length) {
    return json(
      200,
      {
        answer:
          "I couldn't find relevant Volcano documentation for that question. Try asking about Queues, VolcanoJob, the scheduler, or installation — or browse the docs at /docs/Home/Introduction.",
        sources: [],
      },
      headers,
    );
  }

  if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_BASE_URL) {
    return json(
      503,
      {
        error:
          "AI Gateway is not available. Deploy on Netlify with a credit-based plan, or set OPENAI_API_KEY for local use. Run via `netlify dev` for local AI Gateway access.",
      },
      headers,
    );
  }

  const context = buildContext(sources);
  const input = [];

  for (const turn of history) {
    if (!turn || typeof turn.content !== "string") continue;
    if (turn.role === "user" || turn.role === "assistant") {
      input.push({
        role: turn.role,
        content: turn.content.slice(0, 2000),
      });
    }
  }

  input.push({
    role: "user",
    content: `Documentation context:\n\n${context}\n\n---\n\nQuestion: ${question}`,
  });

  try {
    const client = new OpenAI();
    const model = process.env.ASK_AI_MODEL || "gpt-5-mini";
    const res = await client.responses.create({
      model,
      instructions: SYSTEM,
      input,
    });
    const answer =
      res.output_text?.trim() ||
      "I couldn't generate an answer. Please try again or check the documentation.";

    const seen = new Set();
    const uniqueSources = [];
    for (const s of sources) {
      if (seen.has(s.url)) continue;
      seen.add(s.url);
      uniqueSources.push({ title: s.title.split(" — ")[0], url: s.url });
    }

    return json(200, { answer, sources: uniqueSources }, headers);
  } catch (e) {
    console.error("ask-ai error", e);
    return json(
      500,
      { error: "Failed to generate answer. Please try again." },
      headers,
    );
  }
};

export const config = {
  path: "/api/ask-ai",
};
