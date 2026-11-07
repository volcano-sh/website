// The zh-Hans Ray page links to the English KubeRay section with a raw <a href>, not a Markdown link.
// Why: Docusaurus prefixes Markdown links with /zh-Hans/, so a Markdown link would point at a heading that
// only exists in English and does not exist on the zh-Hans page. The raw anchor keeps the English target.
// These checks keep that anchor pointing at a real English heading, and keep the zh-Hans wording in line
// with the English page (RayService creates no PodGroup, and the stale KubeRay 1.5.1 pins are gone).

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ROOT, mdHeadings, read, slug } from "../helpers.mjs";

const ZH_DOCS = "i18n/zh-Hans/docusaurus-plugin-content-docs/current";
const ZH_RAY = `${ZH_DOCS}/Ecosystem/RayOnVolcano.md`;
// The English heading the zh-Hans page points at. If the heading or page is renamed, update this and the zh comment.
const TARGET_HEADING = "Method 1: Using KubeRay Operator";
const TARGET_PAGE = "/docs/Ecosystem/RayOnVolcano";

const RAW_ANCHOR = /<a\b[^>]*\bhref="(\/docs\/[^"]*)"[^>]*>/g;

// Every .md and .mdx file under the zh-Hans current docs, relative to the repo root.
function zhDocFiles() {
  return fs
    .readdirSync(path.join(ROOT, ZH_DOCS), { recursive: true })
    .filter((f) => /\.mdx?$/.test(f))
    .map((f) => `${ZH_DOCS}/${f}`);
}

// Maps a /docs/... URL path to its English source file, or null when neither .md nor .mdx exists.
function docSource(urlPath) {
  const rel = urlPath.replace(/^\/docs\//, "").replace(/\/$/, "");
  for (const ext of [".md", ".mdx"]) {
    const file = path.join(ROOT, "docs", rel + ext);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}

describe("zh-Hans Ray page anchor", () => {
  test("Z1 exactly one raw anchor to the English KubeRay section, not prefixed with /zh-Hans/", () => {
    const hrefs = [...read(ZH_RAY).matchAll(/<a\b[^>]*\bhref="(\/docs\/Ecosystem\/RayOnVolcano#[^"]*)"[^>]*>/g)].map((m) => m[1]);
    assert.equal(hrefs.length, 1, `${ZH_RAY}: expected exactly one raw <a href="${TARGET_PAGE}#...">, found ${hrefs.length}`);
    assert.ok(!hrefs[0].startsWith("/zh-Hans/"), `${ZH_RAY}: raw anchor href "${hrefs[0]}" must not start with /zh-Hans/`);
    assert.equal(hrefs[0], `${TARGET_PAGE}#${slug(TARGET_HEADING)}`, `${ZH_RAY}: raw anchor must target "#${slug(TARGET_HEADING)}" (the slug of "${TARGET_HEADING}")`);
  });

  test("Z2 every raw /docs/ anchor in the zh-Hans docs points at an existing English file and heading", () => {
    const problems = [];
    for (const file of zhDocFiles()) {
      const text = read(file);
      for (const m of text.matchAll(RAW_ANCHOR)) {
        const [urlPath, fragment] = m[1].split("#");
        const source = docSource(urlPath);
        if (!source) {
          problems.push(`${file}: ${m[1]} -> no docs/${urlPath.replace(/^\/docs\//, "")}.md(x)`);
          continue;
        }
        if (fragment !== undefined) {
          const headings = mdHeadings(fs.readFileSync(source, "utf8"));
          if (!headings.some((h) => slug(h) === fragment)) {
            problems.push(`${file}: #${fragment} matches no heading in ${path.relative(ROOT, source)}`);
          }
        }
      }
    }
    assert.deepEqual(problems, [], "broken raw anchors in zh-Hans docs");
  });

  test("Z3 the nearest non-blank line above each raw anchor is the raw-anchor MDX comment", () => {
    const problems = [];
    let count = 0;
    for (const file of zhDocFiles()) {
      const lines = read(file).split("\n");
      lines.forEach((line, i) => {
        if (!/<a\b[^>]*\bhref="\/docs\//.test(line)) return;
        count += 1;
        let j = i - 1;
        while (j >= 0 && lines[j].trim() === "") j -= 1;
        const above = j >= 0 ? lines[j].trim() : "";
        if (!/^\{\/\*.*raw anchor.*\*\/\}$/.test(above)) {
          problems.push(`${file}:${i + 1}: the line above the raw anchor must be a {/* ... raw anchor ... */} comment, got ${JSON.stringify(above.slice(0, 60))}`);
        }
      });
    }
    assert.ok(count > 0, "no raw anchors found in zh-Hans docs");
    assert.deepEqual(problems, [], "raw anchors without the explanatory MDX comment");
  });

  test("Z4 zh-Hans text says RayService creates no PodGroup and does not group it with RayCluster and RayJob", () => {
    const md = read(ZH_RAY);
    assert.ok(md.includes("`RayService`本身不创建PodGroup"), `${ZH_RAY}: missing the sentence that RayService itself creates no PodGroup`);
    assert.ok(!md.includes("`RayCluster`, `RayService`和`RayJob`"), `${ZH_RAY}: still lists RayService with RayCluster and RayJob`);
  });

  test("Z5 zh-Hans page has no stale KubeRay 1.5.1 pins", () => {
    const md = read(ZH_RAY);
    assert.ok(!md.includes("--version 1.5.1"), `${ZH_RAY}: still has "--version 1.5.1"`);
    assert.ok(!md.includes("kuberay/v1.5.1/"), `${ZH_RAY}: still has "kuberay/v1.5.1/"`);
  });
});
