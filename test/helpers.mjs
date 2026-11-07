// Shared helpers for the test suites in test/source (repo files) and test/build (build/ output).
// This file holds helpers only. It has no test cases and no dependencies beyond js-yaml and gray-matter,
// which the site already uses.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const BUILD = path.join(ROOT, "build");
export const STATIC = path.join(ROOT, "static");

export function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

// Called from a before() hook in the build tests. A missing build fails those suites
// instead of skipping them.
export function requireBuild() {
  const index = path.join(BUILD, "index.html");
  if (!fs.existsSync(index)) {
    throw new Error("build/index.html is missing: run `npm run build` first");
  }
}

// Evaluates the `const frameworks = [...]` literal in the Frameworks component. The literal is
// data, so it runs in a fresh VM context with no access to the module system.
const FRAMEWORK_KEYS = ["description", "logo", "name", "url"];

export function loadFrameworks() {
  const file = "src/components/Frameworks/index.js";
  const match = read(file).match(/const frameworks = (\[[\s\S]*?\n\]);/);
  if (!match) {
    throw new Error(`${file}: could not find "const frameworks = [...];". Update loadFrameworks() in test/helpers.mjs if the component changed shape.`);
  }
  const list = JSON.parse(JSON.stringify(vm.runInNewContext(`(${match[1]})`, {}, { timeout: 1000 })));
  assert.ok(Array.isArray(list) && list.length > 0, `${file}: frameworks list is empty`);
  list.forEach((entry, i) => {
    assert.deepEqual(Object.keys(entry).sort(), FRAMEWORK_KEYS, `${file}: entry ${i} (${entry.name}) must have exactly the keys ${FRAMEWORK_KEYS.join(", ")}`);
    for (const key of FRAMEWORK_KEYS) {
      assert.ok(typeof entry[key] === "string" && entry[key].trim() !== "", `${file}: entry ${i} (${entry.name}) needs a non-empty string "${key}"`);
    }
  });
  return list;
}

// Line-based fence parser. Fences must start at column 0, which is how the Ecosystem pages are written.
// Returns [{ lang, line, body, unclosed }], where line is the 1-based line of the opening fence.
export function mdFences(md) {
  const out = [];
  let cur = null;
  md.split("\n").forEach((text, i) => {
    if (!cur) {
      const open = text.match(/^```(.*)$/);
      if (open) {
        cur = { lang: open[1].trim().split(/\s+/)[0] || "", line: i + 1, body: [] };
      }
    } else if (/^```\s*$/.test(text)) {
      out.push({ lang: cur.lang, line: cur.line, body: cur.body.join("\n"), unclosed: false });
      cur = null;
    } else {
      cur.body.push(text);
    }
  });
  if (cur) {
    out.push({ lang: cur.lang, line: cur.line, body: cur.body.join("\n"), unclosed: true });
  }
  return out;
}

// Heading texts outside code fences. Bash output in fences starts with "# ", so fences must be skipped.
export function mdHeadings(md) {
  const out = [];
  let inFence = false;
  for (const text of md.split("\n")) {
    if (!inFence && /^```/.test(text)) {
      inFence = true;
    } else if (inFence && /^```\s*$/.test(text)) {
      inFence = false;
    } else if (!inFence) {
      const h = text.match(/^#{1,6}\s+(.*?)\s*#*\s*$/);
      if (h) out.push(h[1]);
    }
  }
  return out;
}

// GitHub-style heading slug. Lowercases, drops anything that is not a letter, digit, space or hyphen,
// and turns spaces into hyphens. A trailing {#custom-id} wins, as Docusaurus allows.
export function slug(heading) {
  const custom = heading.match(/\{#([^\s}]+)\}\s*$/);
  if (custom) return custom[1];
  return heading
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, "")
    .replace(/ /g, "-");
}

const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

// Single pass, so "&amp;lt;" decodes to "&lt;" and not to "<".
export function decodeHtml(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (whole, e) => {
    if (e[0] === "#") {
      return String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    }
    return Object.hasOwn(NAMED_ENTITIES, e) ? NAMED_ENTITIES[e] : whole;
  });
}

// Kubernetes CPU quantity in millicores: "100m" -> 100, "1" -> 1000.
export function cpu(q) {
  const m = String(q).match(/^(\d+(?:\.\d+)?)(m?)$/);
  if (!m) throw new Error(`unsupported cpu quantity "${q}"`);
  return m[2] ? Number(m[1]) : Math.round(Number(m[1]) * 1000);
}

// Kubernetes memory quantity in Mi: "32Mi" -> 32, "2Gi" -> 2048.
export function memMi(q) {
  const m = String(q).match(/^(\d+(?:\.\d+)?)(Mi|Gi)$/);
  if (!m) throw new Error(`unsupported memory quantity "${q}"`);
  return m[2] === "Gi" ? Math.round(Number(m[1]) * 1024) : Number(m[1]);
}

// Formats a sum the way the pages write it: 7000m -> "7", 200m -> "200m", 4096Mi -> "4Gi", 64Mi -> "64Mi".
export function fmtCpu(milli) {
  return milli % 1000 === 0 ? String(milli / 1000) : `${milli}m`;
}

export function fmtMem(mi) {
  return mi % 1024 === 0 ? `${mi / 1024}Gi` : `${mi}Mi`;
}

// True when the text contains s and the next character is whitespace, the end of the text, a quote or a backslash.
// Anything else (including "-", ".", ",", ")" and "}") counts as a longer token, so "minMember: 4" does not match
// "minMember: 4-x" and "v0.2.0-beta1" does not match "v0.2.0-beta1-rc1". Used for every expected-value and pin check
// in the Ecosystem doc tests, except the Tested versions line, which uses mentionsToken.
export function mentionsExact(text, s) {
  const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${escaped}(?=\\s|$|["'\\\\])`).test(text);
}

// Like mentionsExact, but a following "," or backtick or a sentence-end "." is allowed; a word char, "-" or ".<digit>" is not.
export function mentionsToken(text, s) {
  const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${escaped}(?![\\w-]|\\.\\w)`).test(text);
}

// Checks an SVG file for well-formedness and for constructs the logos must not use.
// Returns { errors, root, tags }:
//   errors  strings describing each problem (empty when the file is clean)
//   root    the first element, which must be the <svg> root, as { name, attrs }
//   tags    every element as { name, attrs }, in document order (attrs is a name -> value map)
export function checkSvg(text) {
  const errors = [];
  const tags = [];
  const stack = [];
  let roots = 0;
  const s = text.replace(/^﻿/, "").replace(/^<\?xml[^?]*\?>\s*/, "");

  if (/<!DOCTYPE/i.test(s)) errors.push("DOCTYPE is not allowed");
  if (/<!\[CDATA\[/.test(s)) errors.push("CDATA is not allowed");
  if (/<!ENTITY/i.test(s)) errors.push("ENTITY declarations are not allowed");

  const badEntity = /&(?!(?:amp|lt|gt|quot|apos|#[0-9]+|#x[0-9a-fA-F]+);)/;
  const checkText = (t) => {
    if (stack.length === 0) {
      if (t.trim()) errors.push(`text outside the root element: ${JSON.stringify(t.trim().slice(0, 40))}`);
      return;
    }
    if (/[<>]/.test(t)) errors.push(`stray "<" or ">" in text: ${JSON.stringify(t.trim().slice(0, 40))}`);
    if (badEntity.test(t)) errors.push(`"&" that is not an entity reference in text: ${JSON.stringify(t.trim().slice(0, 40))}`);
  };

  const token = /<!--[\s\S]*?-->|<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[A-Za-z_][\w:.-]*\s*=\s*(?:"[^"<]*"|'[^'<]*'))*)\s*(\/?)>/g;
  let last = 0;
  let m;
  while ((m = token.exec(s))) {
    checkText(s.slice(last, m.index));
    last = token.lastIndex;
    const [markup, closing, name, attrText, selfClosing] = m;
    if (markup.startsWith("<!--")) continue;
    if (badEntity.test(markup)) errors.push(`"&" that is not an entity reference in <${name}> markup`);
    if (closing) {
      const open = stack.pop();
      if (open !== name) errors.push(`</${name}> does not match <${open ?? "(nothing open)"}>`);
      continue;
    }
    if (stack.length === 0) {
      roots += 1;
      if (roots > 1) errors.push(`more than one root element (<${name}>)`);
    }
    const attrs = {};
    for (const a of attrText.matchAll(/([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"<]*)"|'([^'<]*)')/g)) {
      if (Object.hasOwn(attrs, a[1])) errors.push(`duplicate attribute "${a[1]}" on <${name}>`);
      attrs[a[1]] = a[2] ?? a[3];
    }
    tags.push({ name, attrs });
    if (!selfClosing) stack.push(name);
  }
  checkText(s.slice(last));

  if (stack.length) errors.push(`unclosed element(s): ${stack.join(", ")}`);
  if (roots !== 1) errors.push(`expected exactly one root element, found ${roots}`);
  else if (tags[0].name !== "svg") errors.push(`root element is <${tags[0].name}>, expected <svg>`);
  return { errors, root: tags[0] ?? null, tags };
}

// Parses the homepage Frameworks cards from built HTML. Each card is an <a class="framework-card-link">
// with an <img>, <h3 class="framework-name"> and <p class="framework-description">.
export function parseCards(html) {
  const cards = [];
  for (const [, anchorAttrs, body] of html.matchAll(/<a\b([^>]*\bclass="framework-card-link"[^>]*)>([\s\S]*?)<\/a>/g)) {
    const index = cards.length + 1;
    const img = body.match(/<img\b([^>]*)>/);
    const name = body.match(/<h3 class="framework-name">([^<]*)<\/h3>/);
    const desc = body.match(/<p class="framework-description">([\s\S]*?)<\/p>/);
    const href = anchorAttrs.match(/\bhref="([^"]*)"/);
    if (!img || !name || !desc || !href) {
      throw new Error(`framework card ${index} does not match the expected markup`);
    }
    cards.push({
      name: decodeHtml(name[1]),
      href: decodeHtml(href[1]),
      src: decodeHtml(attrValue(img[1], "src") ?? ""),
      alt: decodeHtml(attrValue(img[1], "alt") ?? ""),
      description: decodeHtml(desc[1]),
    });
  }
  return cards;
}

// Value of a double-quoted attribute in an attribute string, or undefined.
export function attrValue(attrs, name) {
  const m = attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));
  return m ? m[1] : undefined;
}

// Decodes a URI component, and returns the input unchanged when it is malformed (for example a lone "%").
export function safeDecodeURI(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

// Maps a site URL path to the built file, the way a static host would: a/b/index.html, a/b.html, then a/b.
// Returns the path, or null when nothing matches.
export function resolveBuilt(urlPath) {
  const clean = safeDecodeURI(urlPath.split(/[?#]/)[0]).replace(/^\/+/, "");
  const candidates = [
    path.join(BUILD, clean, "index.html"),
    path.join(BUILD, `${clean}.html`),
    path.join(BUILD, clean),
  ];
  return candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile()) ?? null;
}
