import process from "node:process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { buildIdf, retrieve } from "./retrieve.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAX_QUESTION_LEN = 500;
const MAX_HISTORY = 6;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const SYSTEM = `You are the Ask AI assistant for Volcano (https://volcano.sh), a CNCF cloud-native batch scheduling system.

Rules:
- Answer ONLY using the provided documentation context. If the context is insufficient, say you do not know and point to the closest related doc URLs from the context.
- Do not invent APIs, flags, or behavior not present in the context.
- Prefer concise, practical answers. Use short bullet lists when helpful.
- Do not add a Sources section; the UI lists sources separately.
- If the user asks something unrelated to Volcano, politely decline.`;

/** @type {{ chunks: any[], idf: Map<string, number> } | null} */
let cachedIndex = null;

/** @type {Map<string, number[]>} */
const hitsByIp = new Map();

function loadIndex() {
  if (cachedIndex) return cachedIndex;
  const raw = readFileSync(join(__dirname, "docs-index.json"), "utf8");
  const parsed = JSON.parse(raw);
  cachedIndex = {
    chunks: parsed.chunks,
    idf: buildIdf(parsed.chunks),
  };
  return cachedIndex;
}

function clientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-nf-client-connection-ip") || "unknown";
}

function rateLimited(ip) {
  const now = Date.now();
  const prev = (hitsByIp.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (prev.length >= RATE_LIMIT) {
    hitsByIp.set(ip, prev);
    return true;
  }
  prev.push(now);
  hitsByIp.set(ip, prev);
  return false;
}

function corsHeaders(origin) {
  let allow = "https://volcano.sh";
  if (origin) {
    try {
      const { hostname, protocol } = new URL(origin);
      if (
        (hostname === "localhost" || hostname === "127.0.0.1") &&
        (protocol === "http:" || protocol === "https:")
      ) {
        allow = origin;
      } else if (hostname === "volcano.sh" || hostname.endsWith(".netlify.app")) {
        allow = origin;
      }
    } catch {
      // keep default
    }
  }
  return {
    "Access-Control-Allow-Origin": allow,
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

  if (rateLimited(clientIp(req))) {
    return json(
      429,
      { error: "Too many questions. Please try again later." },
      headers,
    );
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
      { error: `question must be <= ${MAX_QUESTION_LEN} characters` },
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

  const sources = retrieve(index.chunks, question, {
    topK: 6,
    idf: index.idf,
  });
  if (!sources.length) {
    return json(
      200,
      {
        answer:
          "I could not find relevant Volcano documentation for that question. Try asking about Queues, VolcanoJob, the scheduler, or installation, or browse /docs/Home/Introduction.",
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
          "Ask AI backend is not configured. Use netlify dev locally, or ensure Netlify AI Gateway / OPENAI_API_KEY is available in deploy.",
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
      "I could not generate an answer. Please try again or check the documentation.";

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
