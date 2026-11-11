// Homepage Frameworks cards in the built site (build/index.html and build/zh-Hans/index.html).
// Why: the source list is only as good as what Docusaurus renders. These checks compare the built cards
// with the source list, confirm each logo is in the output for its locale, and confirm the descriptions
// are translated in zh-Hans and in English.
// Requires `npm run build` first. Without a build, the before() hook fails the suite.

import { describe, test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { BUILD, loadFrameworks, parseCards, read, requireBuild, resolveBuilt } from "../helpers.mjs";

const LOCALES = [
  { name: "en", html: "index.html", prefix: "" },
  { name: "zh-Hans", html: "zh-Hans/index.html", prefix: "/zh-Hans" },
];

const builtCards = (locale) => parseCards(fs.readFileSync(path.join(BUILD, locale.html), "utf8"));

describe("built homepage Frameworks cards", () => {
  before(() => requireBuild());

  for (const locale of LOCALES) {
    test(`B1 ${locale.name}: built cards match the source list in count, order, name, href, src and alt`, () => {
      const built = builtCards(locale);
      const source = loadFrameworks();
      assert.equal(built.length, source.length, `${locale.name}: built ${built.length} cards, source has ${source.length}`);
      source.forEach((card, i) => {
        const b = built[i];
        assert.equal(b.name, card.name, `${locale.name} card ${i + 1}: name`);
        assert.equal(b.href, card.url, `${card.name} (${locale.name}): href`);
        assert.equal(b.src, card.logo, `${card.name} (${locale.name}): src`);
        assert.equal(b.alt, `${card.name} Logo`, `${card.name} (${locale.name}): alt`);
      });
    });

    test(`B2 ${locale.name}: each card logo exists in the ${locale.name} build`, () => {
      const missing = builtCards(locale)
        .filter((c) => !resolveBuilt(`${locale.prefix}/${c.src}`))
        .map((c) => `${c.name}: ${locale.prefix}/${c.src}`);
      assert.deepEqual(missing, [], `logo files missing from build/${locale.html.replace("index.html", "")}`);
    });
  }

  test("B3 en: each built card description equals the source description", () => {
    const built = builtCards(LOCALES[0]);
    const source = loadFrameworks();
    source.forEach((card, i) => {
      assert.equal(built[i].description, card.description, `${card.name} (en): description`);
    });
  });

  test("B3 zh-Hans: each built card description equals the code.json message for the source description", () => {
    const code = JSON.parse(read("i18n/zh-Hans/code.json"));
    const built = builtCards(LOCALES[1]);
    const source = loadFrameworks();
    source.forEach((card, i) => {
      const want = code[card.description]?.message;
      assert.ok(want, `${card.name}: no code.json message for its description`);
      assert.equal(built[i].description, want, `${card.name} (zh-Hans): description`);
    });
  });
});
