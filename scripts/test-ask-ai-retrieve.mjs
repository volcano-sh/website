#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { retrieve } from "../netlify/functions/ask-ai/retrieve.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(
  __dirname,
  "..",
  "netlify",
  "functions",
  "ask-ai",
  "docs-index.json",
);

const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));

const cases = [
  {
    q: "What is a Queue in Volcano?",
    expectUrlPart: "/docs/Concepts/Queue",
  },
  {
    q: "How do I deploy Volcano on Kubernetes?",
    expectUrlPart: "/docs/GettingStarted/Installation",
  },
  {
    q: "How does the scheduler work?",
    expectUrlPart: "/docs/Scheduler/Overview",
  },
  {
    q: "How can I start contributing to Volcano?",
    expectUrlPart: "/docs/Contribution",
  },
];

let failed = 0;
for (const c of cases) {
  const hits = retrieve(index.chunks, c.q, { topK: 6 });
  const ok = hits.some((h) => h.url.includes(c.expectUrlPart));
  if (!ok) {
    failed++;
    console.error("FAIL", c.q, "→", hits.map((h) => h.url));
  } else {
    console.log("ok", c.q, "→", hits[0].url);
  }
}

if (failed) {
  console.error(`${failed} retrieval case(s) failed`);
  process.exit(1);
}
console.log(`retrieval checks passed (${index.chunks.length} chunks)`);
