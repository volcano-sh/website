// Built Ecosystem pages (build/docs/Ecosystem/* and build/zh-Hans/docs/Ecosystem/*).
// Why: a Markdown link or heading anchor can build without a warning and still point nowhere. These checks read
// the HTML that Docusaurus produced: the page titles, the zh-Hans raw link to the English KubeRay section,
// in-page anchors on this PR's pages, internal links and their fragments on the zh-Hans Ecosystem pages, and the
// order of Grove and LeaderWorkerSet in the Ecosystem sidebar. Other pages (blog posts, unrelated docs) are not walked, so their content cannot fail these checks.
// Requires `npm run build` first. Without a build, the before() hook fails the suite.

import { describe, test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { BUILD, ROOT, attrValue, decodeHtml, read, requireBuild, resolveBuilt, safeDecodeURI } from "../helpers.mjs";

const PAGES = ["GroveOnVolcano", "LeaderWorkerSetOnVolcano", "RayOnVolcano"];
const ZH_BUILD = path.join(BUILD, "zh-Hans");
const ZH_ECO_BUILD = path.join(ZH_BUILD, "docs/Ecosystem");
const ZH_RAY_BUILT = path.join(ZH_BUILD, "docs/Ecosystem/RayOnVolcano/index.html");
const EN_RAY_BUILT = path.join(BUILD, "docs/Ecosystem/RayOnVolcano/index.html");
const TARGET_ID = "method-1-using-kuberay-operator";

// The attribute string of every <a> tag in a page.
function anchorAttrs(html) {
  return [...html.matchAll(/<a\b([^>]*)>/g)].map((m) => m[1]);
}

function htmlFiles(dir) {
  return fs
    .readdirSync(dir, { recursive: true })
    .filter((f) => f.endsWith(".html"))
    .map((f) => path.join(dir, f))
    .filter((f) => fs.statSync(f).isFile());
}

function hasId(html, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\s)id="${escaped}"`).test(html);
}

// The zh-Hans source when one exists, otherwise the English source (Docusaurus builds untranslated pages from English).
function sourceTitle(locale, page) {
  const zh = `i18n/zh-Hans/docusaurus-plugin-content-docs/current/Ecosystem/${page}.md`;
  const file = locale && fs.existsSync(path.join(ROOT, zh)) ? zh : `docs/Ecosystem/${page}.md`;
  return matter(read(file)).data.title;
}

describe("built Ecosystem pages", () => {
  before(() => requireBuild());

  for (const locale of ["", "zh-Hans/"]) {
    for (const page of PAGES) {
      test(`P1 ${locale}docs/Ecosystem/${page} is built and its <h1> equals the front-matter title`, () => {
        const file = path.join(BUILD, locale, "docs/Ecosystem", page, "index.html");
        assert.ok(fs.existsSync(file), `${path.relative(ROOT, file)} is missing`);
        const h1 = fs.readFileSync(file, "utf8").match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/);
        assert.ok(h1, `${path.relative(ROOT, file)} has no <h1>`);
        assert.equal(decodeHtml(h1[1]), sourceTitle(locale, page), `${path.relative(ROOT, file)}: <h1> must equal the front-matter title`);
      });
    }
  }

  test("P2 the zh-Hans Ray page has exactly one link to /docs/Ecosystem/RayOnVolcano#..., with no /zh-Hans/ prefix", () => {
    const hits = anchorAttrs(fs.readFileSync(ZH_RAY_BUILT, "utf8"))
      .map((a) => attrValue(a, "href"))
      .filter((h) => h !== undefined && /^\/docs\/Ecosystem\/RayOnVolcano#/.test(h));
    assert.equal(hits.length, 1, `zh-Hans Ray page: expected exactly one <a href="/docs/Ecosystem/RayOnVolcano#...">, found ${hits.length}: ${JSON.stringify(hits)}`);
  });

  test(`P2 the English Ray page has the id="${TARGET_ID}" that the zh-Hans link targets`, () => {
    assert.ok(hasId(fs.readFileSync(EN_RAY_BUILT, "utf8"), TARGET_ID), `English Ray page has no id="${TARGET_ID}"`);
  });

  test("P3 every internal link on a zh-Hans Ecosystem page resolves, and its #fragment matches an id on the target page", () => {
    const problems = [];
    let checked = 0;
    for (const file of htmlFiles(ZH_ECO_BUILD)) {
      const html = fs.readFileSync(file, "utf8");
      for (const attrs of anchorAttrs(html)) {
        // Language switcher entries carry class="dropdown__link" and a lang attribute. They are not content links.
        if (/\bclass="dropdown__link"/.test(attrs) && /\blang="/.test(attrs)) continue;
        const rawHref = attrValue(attrs, "href");
        const href = rawHref === undefined ? undefined : decodeHtml(rawHref);
        // Both unprefixed links (the raw KubeRay anchor) and /zh-Hans/ links are checked. A Markdown link to an
        // English-only heading builds as /zh-Hans/...#english-id, and only the fragment check catches it.
        if (href === undefined || !href.startsWith("/") || href.startsWith("//")) continue;
        checked += 1;
        const where = `${path.relative(BUILD, file)}: href="${href}"`;
        const target = resolveBuilt(href);
        if (!target) {
          problems.push(`${where} does not resolve to a built file`);
          continue;
        }
        const fragment = href.split("#")[1];
        if (fragment) {
          if (!hasId(fs.readFileSync(target, "utf8"), safeDecodeURI(fragment))) {
            problems.push(`${where} has no id="${fragment}" in ${path.relative(BUILD, target)}`);
          }
        }
      }
    }
    assert.ok(checked > 0, "found no internal links on zh-Hans Ecosystem pages, so the check ran on nothing");
    assert.deepEqual(problems, [], "broken internal links on zh-Hans Ecosystem pages");
  });

  test("P4 on the English Ecosystem pages and the zh-Hans Ray page, every href=\"#x\" has an element with id=\"x\"", () => {
    const files = [...PAGES.map((p) => path.join(BUILD, "docs/Ecosystem", p, "index.html")), ZH_RAY_BUILT];
    const problems = [];
    let checked = 0;
    for (const file of files) {
      const html = fs.readFileSync(file, "utf8");
      const ids = new Set([...html.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]));
      // A bare href="#" is the navbar dropdown toggle (role="button"), not a link to an anchor, so it is skipped.
      for (const [, hash] of html.matchAll(/\shref="#([^"]+)"/g)) {
        checked += 1;
        if (!ids.has(hash)) problems.push(`${path.relative(BUILD, file)}: href="#${hash}" has no matching id`);
      }
    }
    assert.ok(checked > 0, "found no href=\"#x\" links on the Ecosystem pages, so the check ran on nothing");
    assert.deepEqual(problems, [], "in-page links without a target");
  });

  test("P5 the sidebar on the Grove page lists GroveOnVolcano before LeaderWorkerSetOnVolcano", () => {
    const html = fs.readFileSync(path.join(BUILD, "docs/Ecosystem/GroveOnVolcano/index.html"), "utf8");
    const links = anchorAttrs(html)
      .filter((a) => /\bmenu__link\b/.test(attrValue(a, "class") ?? ""))
      .map((a) => attrValue(a, "href"))
      .filter((h) => h !== undefined && h.startsWith("/docs/Ecosystem/"));
    assert.ok(links.length > 0, "no sidebar links to /docs/Ecosystem/ found on the Grove page, so the order check ran on nothing");
    const order = ["GroveOnVolcano", "LeaderWorkerSetOnVolcano"];
    const positions = order.map((p) => links.indexOf(`/docs/Ecosystem/${p}`));
    positions.forEach((pos, i) => {
      assert.ok(pos >= 0, `sidebar has no link to /docs/Ecosystem/${order[i]}`);
      if (i > 0) assert.ok(pos > positions[i - 1], `sidebar order must be ${order.join(", ")}; got ${links.join(", ")}`);
    });
  });
});
