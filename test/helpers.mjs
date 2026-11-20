// Shared helpers for the guide e2e runner (test/e2e/run-guide.mjs) and its static checks
// (test/source/e2e-plans.test.mjs). Node built-ins only, no test cases.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

// Line-based fence parser. Fences must start at column 0, which is how the Ecosystem pages are written.
// Returns [{ lang, meta, title, line, body, unclosed }]: meta is the rest of the opening line after the language,
// title is the value of a title="..." in meta (or undefined), and line is the 1-based line of the opening fence.
export function mdFences(md) {
  const out = [];
  let cur = null;
  md.split("\n").forEach((text, i) => {
    if (!cur) {
      const open = text.match(/^```(.*)$/);
      if (open) {
        const info = open[1].trim();
        const lang = info.split(/\s+/)[0] || "";
        const meta = info.slice(lang.length).trim();
        cur = { lang, meta, title: meta.match(/\btitle="([^"]+)"/)?.[1], line: i + 1, body: [] };
      }
    } else if (/^```\s*$/.test(text)) {
      out.push({ ...cur, body: cur.body.join("\n"), unclosed: false });
      cur = null;
    } else {
      cur.body.push(text);
    }
  });
  if (cur) {
    out.push({ ...cur, body: cur.body.join("\n"), unclosed: true });
  }
  return out;
}

// Headings outside code fences, as [{ level, text, line }]. Bash output in fences starts with "# ", so fences must be skipped.
export function mdOutline(md) {
  const out = [];
  let inFence = false;
  md.split("\n").forEach((text, i) => {
    if (!inFence && /^```/.test(text)) {
      inFence = true;
    } else if (inFence && /^```\s*$/.test(text)) {
      inFence = false;
    } else if (!inFence) {
      const h = text.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
      if (h) out.push({ level: h[1].length, text: h[2], line: i + 1 });
    }
  });
  return out;
}

// The heading path above a 1-based line, joined with "/", e.g. "Method 1: Using KubeRay Operator/Setup Requirements/New installation".
// Each heading is an ancestor of the line when it is the nearest earlier heading of a lower level. Level-1 headings
// (the page title) are left out, and the path is "" above the first heading.
export function fenceSection(outline, line) {
  const stack = [];
  for (const h of outline) {
    if (h.line >= line) break;
    while (stack.length && stack[stack.length - 1].level >= h.level) stack.pop();
    stack.push(h);
  }
  return stack.filter((h) => h.level > 1).map((h) => h.text).join("/");
}
