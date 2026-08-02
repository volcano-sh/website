import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { retrieve } from "../netlify/functions/ask-ai/retrieve.mjs";

const indexPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "netlify",
  "functions",
  "ask-ai",
  "docs-index.json",
);

const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));

const cases = [
  ["What is a Queue in Volcano?", "/docs/Concepts/Queue"],
  ["How do I deploy Volcano on Kubernetes?", "/docs/GettingStarted/Installation"],
  ["How does the scheduler work?", "/docs/Scheduler/Overview"],
  ["How can I start contributing to Volcano?", "/docs/Contribution"],
];

let failed = 0;
for (const [q, expect] of cases) {
  const hits = retrieve(index.chunks, q, { topK: 6 });
  if (!hits.some((h) => h.url.includes(expect))) {
    failed++;
    console.error("FAIL", q, hits.map((h) => h.url));
  } else {
    console.log("ok", q, "->", hits[0].url);
  }
}

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("ok,", index.chunks.length, "chunks");
