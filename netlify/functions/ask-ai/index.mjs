import process from "node:process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIdf, retrieve } from "./retrieve.mjs";

const FN_DIR = dirname(fileURLToPath(import.meta.url));
const MAX_QUESTION_LEN = 500;
const MAX_HISTORY = 6;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const SYSTEM = `You answer questions about Volcano (https://volcano.sh) using only the documentation context below.

- If the context is not enough, say you don't know and mention the closest doc URLs from the context.
- Don't invent APIs or behavior.
- Keep answers short. Bullet lists are fine.
- Don't add a Sources section; the UI shows links.
- Decline off-topic questions.`;

let cachedIndex = null;
const hitsByIp = new Map();

function loadIndex() {
  if (cachedIndex) return cachedIndex;
  const parsed = JSON.parse(
    readFileSync(join(FN_DIR, "docs-index.json"), "utf8"),
  );
  cachedIndex = { chunks: parsed.chunks, idf: buildIdf(parsed.chunks) };
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
      } else if (
        hostname === "volcano.sh" ||
        hostname.endsWith(".netlify.app")
      ) {
        allow = origin;
      }
    } catch {
      // ignore bad Origin
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

async function callModel(messages) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey && !process.env.OPENAI_BASE_URL) {
    throw new Error("missing OPENAI_API_KEY");
  }

  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = process.env.ASK_AI_MODEL || "gpt-4o-mini";

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `model error (${res.status})`;
    throw new Error(msg);
  }

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("empty model response");
  return text;
}

export default async (req) => {
  const headers = corsHeaders(req.headers.get("origin") || "");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" }, headers);
  }
  if (rateLimited(clientIp(req))) {
    return json(429, { error: "Rate limit exceeded. Try again later." }, headers);
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
      { error: `question too long (max ${MAX_QUESTION_LEN})` },
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
      { error: "Docs index missing. Run npm run build:ask-ai-index" },
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
          "No matching docs found. Try asking about Queues, VolcanoJob, the scheduler, or installation.",
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
          "Ask AI is not configured. Run with `netlify dev`, or set OPENAI_API_KEY.",
      },
      headers,
    );
  }

  const messages = [{ role: "system", content: SYSTEM }];
  for (const turn of history) {
    if (!turn || typeof turn.content !== "string") continue;
    if (turn.role === "user" || turn.role === "assistant") {
      messages.push({ role: turn.role, content: turn.content.slice(0, 2000) });
    }
  }
  messages.push({
    role: "user",
    content: `Documentation context:\n\n${buildContext(sources)}\n\n---\n\nQuestion: ${question}`,
  });

  try {
    const answer = await callModel(messages);

    const seen = new Set();
    const uniqueSources = [];
    for (const s of sources) {
      if (seen.has(s.url)) continue;
      seen.add(s.url);
      uniqueSources.push({ title: s.title.split(" - ")[0], url: s.url });
    }

    return json(200, { answer, sources: uniqueSources }, headers);
  } catch (e) {
    console.error("ask-ai error", e);
    return json(
      500,
      { error: e.message || "Failed to generate answer" },
      headers,
    );
  }
};

export const config = {
  path: "/api/ask-ai",
};
