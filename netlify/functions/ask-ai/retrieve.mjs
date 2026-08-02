/**
 * Lightweight keyword retrieval over docs chunks.
 * ponytail: TF-IDF + title/URL boosts; swap for embeddings if recall dips.
 */
import process from "node:process";
import { pathToFileURL } from "node:url";

const STOP = new Set([
  "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "is", "are",
  "what", "how", "does", "do", "can", "i", "my", "me", "with", "from", "that",
  "this", "it", "be", "as", "at", "by", "we", "you", "your", "about", "into",
  "volcano", "please", "using", "use", "used", "when", "where", "which", "who",
  "why", "there", "their", "them", "than", "then", "also", "any", "all",
]);

const SYNONYMS = {
  deploy: ["install", "installation", "setup"],
  deploying: ["install", "installation"],
  installation: ["install", "deploy"],
  install: ["installation", "deploy"],
  contributing: ["contribution", "contribute", "contributor"],
  contribute: ["contribution", "contributing"],
  contribution: ["contribute", "contributing"],
  queue: ["queues"],
  queues: ["queue"],
  scheduler: ["scheduling", "schedule"],
  scheduling: ["scheduler"],
};

export function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function expandTokens(tokens) {
  const out = new Set(tokens);
  for (const t of tokens) {
    for (const s of SYNONYMS[t] || []) out.add(s);
  }
  return [...out];
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countMatches(text, token) {
  const re = new RegExp(`\\b${escapeRe(token)}\\b`, "gi");
  return (text.match(re) || []).length;
}

function buildIdf(chunks) {
  const df = new Map();
  for (const chunk of chunks) {
    const seen = new Set(tokenize(`${chunk.title} ${chunk.content}`));
    for (const t of seen) df.set(t, (df.get(t) || 0) + 1);
  }
  const n = chunks.length || 1;
  const idf = new Map();
  for (const [t, c] of df) {
    idf.set(t, Math.log(1 + n / (1 + c)));
  }
  return idf;
}

function scoreChunk(tokens, chunk, idf) {
  const title = chunk.title.toLowerCase();
  const url = chunk.url.toLowerCase();
  const body = chunk.content.toLowerCase();
  let score = 0;
  const aboutScheduler = tokens.some((t) => t === "scheduler" || t === "scheduling");

  for (const t of tokens) {
    const w = idf.get(t) || 1;
    const titleHits = countMatches(title, t);
    const urlHits = countMatches(url.replace(/\//g, " "), t);
    const bodyHits = countMatches(body, t);

    if (titleHits) score += 12 * w * titleHits;
    if (urlHits) score += 8 * w * urlHits;
    if (bodyHits) score += w * Math.min(bodyHits, 4);

    // Exact concept-page boost: /docs/Concepts/Queue for token "queue"
    if (url.includes(`/concepts/${t}`)) score += 20 * w;
    // Section boost: /docs/Scheduler/... for token "scheduler"
    if (url.includes(`/docs/${t}/`) || url.includes(`/${t}/`)) score += 10 * w;
  }

  // Prefer overview / getting-started pages over deep how-tos when tied
  if (/\/(overview|introduction|installation)$/i.test(chunk.url)) score += 10;
  if (/\/userguide\//i.test(chunk.url)) score -= 2;
  if (/\/keyfeatures\//i.test(chunk.url) && aboutScheduler) score -= 8;

  return score;
}

export function retrieve(chunks, query, { topK = 6 } = {}) {
  const tokens = expandTokens(tokenize(query));
  if (!tokens.length) return [];

  const idf = buildIdf(chunks);
  return chunks
    .map((chunk) => ({ chunk, score: scoreChunk(tokens, chunk, idf) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((r) => r.chunk);
}

// Runnable check: node netlify/functions/ask-ai/retrieve.mjs
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sample = [
    {
      title: "Queue",
      url: "/docs/Concepts/Queue",
      content: "Queue is a collection of PodGroups used for resource division.",
    },
    {
      title: "VolcanoJob",
      url: "/docs/Concepts/VolcanoJob",
      content: "VolcanoJob defines a batch job for scheduling.",
    },
  ];
  const hits = retrieve(sample, "What is a Queue in Volcano?");
  if (hits[0]?.url !== "/docs/Concepts/Queue") {
    console.error("retrieve check failed", hits);
    process.exit(1);
  }
  console.log("retrieve.mjs ok", hits.map((h) => h.url));
}
