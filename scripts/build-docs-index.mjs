#!/usr/bin/env node
/**
 * Build a chunked docs index for Ask AI RAG.
 * Reads markdown under docs/ into netlify/functions/ask-ai/docs-index.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(ROOT, "docs");
const OUT_DIR = path.join(ROOT, "netlify", "functions", "ask-ai");
const OUT_FILE = path.join(OUT_DIR, "docs-index.json");

const MAX_CHUNK_CHARS = 1800;

function walkMarkdown(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkMarkdown(full));
    else if (entry.name.endsWith(".md") || entry.name.endsWith(".mdx"))
      files.push(full);
  }
  return files;
}

function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, (block) =>
      block
        .replace(/```\w*\n?/, "")
        .replace(/```$/, "")
        .trim(),
    )
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`~>]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitSections(body) {
  const parts = body.split(/(?=^#{2,3}\s+)/m).map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts : [body];
}

function chunkText(text, max = MAX_CHUNK_CHARS) {
  if (text.length <= max) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > max) {
    let cut = remaining.lastIndexOf("\n\n", max);
    if (cut < max * 0.4) cut = remaining.lastIndexOf(" ", max);
    if (cut < max * 0.4) cut = max;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function docUrl(relPath, frontmatter) {
  if (frontmatter.slug) {
    const slug = String(frontmatter.slug).replace(/^\//, "");
    return `/docs/${slug}`;
  }
  const withoutExt = relPath.replace(/\.mdx?$/, "").replace(/\\/g, "/");
  return `/docs/${withoutExt}`;
}

function build() {
  if (!fs.existsSync(DOCS_DIR)) {
    console.error("docs/ not found");
    process.exit(1);
  }

  const files = walkMarkdown(DOCS_DIR);
  const chunks = [];

  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8");
    const { data, content } = matter(raw);
    if (data.draft === true) continue;

    const relPath = path.relative(DOCS_DIR, file);
    const title = data.title || path.basename(relPath, path.extname(relPath));
    const url = docUrl(relPath, data);
    const sections = splitSections(content);

    for (const section of sections) {
      const headingMatch = section.match(/^#{2,3}\s+(.+)$/m);
      const heading = headingMatch ? headingMatch[1].trim() : null;
      const cleaned = stripMarkdown(section);
      if (cleaned.length < 40) continue;

      for (const part of chunkText(cleaned)) {
        chunks.push({
          id: `${url}#${chunks.length}`,
          title: heading ? `${title} — ${heading}` : title,
          url,
          content: part,
        });
      }
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    OUT_FILE,
    JSON.stringify({ generatedAt: new Date().toISOString(), chunks }, null, 0),
  );
  console.log(`Ask AI index: ${chunks.length} chunks from ${files.length} docs → ${path.relative(ROOT, OUT_FILE)}`);
}

build();
