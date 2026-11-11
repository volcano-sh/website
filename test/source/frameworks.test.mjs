// Homepage Frameworks cards (src/components/Frameworks/index.js) and their zh-Hans strings.
// Why: the cards are data inside a React component. A bad URL, a missing logo, or a missing zh-Hans
// translation only shows up in the built site. A duplicate key in code.json is also silently accepted
// by JSON.parse, so the duplicate check scans the raw text.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { STATIC, loadFrameworks, read } from "../helpers.mjs";

// Expected values for the three cards added in this change. Edit here only when a card changes on purpose.
const NEW_CARDS = {
  KubeRay: { logo: "img/landing/ray_logo.png", url: "https://github.com/ray-project/kuberay" },
  Grove: { logo: "img/landing/grove_logo.svg", url: "https://github.com/ai-dynamo/grove" },
  LeaderWorkerSet: { logo: "img/landing/lws_logo.svg", url: "https://lws.sigs.k8s.io/" },
};
const ZH_CODE = "i18n/zh-Hans/code.json";
const LOGO_EXT = /\.(png|jpe?g|svg|webp)$/;

describe("Frameworks cards", () => {
  test("F1 the frameworks list loads and card names are unique", () => {
    const names = loadFrameworks().map((c) => c.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    assert.deepEqual(dupes, [], `duplicate card names: ${dupes.join(", ")}`);
  });

  test("F2 the KubeRay, Grove and LeaderWorkerSet cards have the expected logo and URL", () => {
    const cards = loadFrameworks();
    for (const [name, want] of Object.entries(NEW_CARDS)) {
      const found = cards.filter((c) => c.name === name);
      assert.equal(found.length, 1, `expected exactly one "${name}" card, found ${found.length}`);
      assert.equal(found[0].logo, want.logo, `${name} card: logo`);
      assert.equal(found[0].url, want.url, `${name} card: url`);
    }
  });

  test("F3 the new cards follow PaddlePaddle in KubeRay, Grove, LeaderWorkerSet order", () => {
    const names = loadFrameworks().map((c) => c.name);
    const order = ["PaddlePaddle", "KubeRay", "Grove", "LeaderWorkerSet"];
    const index = order.map((n) => names.indexOf(n));
    index.forEach((pos, i) => {
      assert.ok(pos >= 0, `card "${order[i]}" is missing`);
      if (i > 0) {
        assert.ok(pos > index[i - 1], `card "${order[i]}" (position ${pos}) must come after "${order[i - 1]}" (position ${index[i - 1]})`);
      }
    });
  });

  test("F4 every card URL parses and uses https", () => {
    for (const c of loadFrameworks()) {
      let url;
      try {
        url = new URL(c.url);
      } catch {
        assert.fail(`${c.name}: url "${c.url}" does not parse`);
      }
      assert.equal(url.protocol, "https:", `${c.name}: url "${c.url}" must use https`);
    }
  });

  test("F5 every logo is a relative static path with an image extension, and the file exists", () => {
    for (const c of loadFrameworks()) {
      assert.ok(!c.logo.startsWith("/"), `${c.name}: logo "${c.logo}" must be relative, not start with "/"`);
      assert.ok(!c.logo.split("/").includes(".."), `${c.name}: logo "${c.logo}" must not contain ".."`);
      assert.ok(!/^[a-z][a-z0-9+.-]*:/i.test(c.logo), `${c.name}: logo "${c.logo}" must not be a URL`);
      assert.match(c.logo, LOGO_EXT, `${c.name}: logo "${c.logo}" must end in .png, .jpg, .jpeg, .svg or .webp`);
      const file = path.join(STATIC, c.logo);
      assert.ok(fs.existsSync(file) && fs.statSync(file).isFile(), `${c.name}: logo file static/${c.logo} does not exist`);
    }
  });
});

describe("zh-Hans translations for the cards", () => {
  test("I1 code.json parses and every entry has a non-empty string message", () => {
    const code = JSON.parse(read(ZH_CODE));
    for (const [key, entry] of Object.entries(code)) {
      assert.ok(entry && typeof entry === "object" && !Array.isArray(entry), `code.json key ${JSON.stringify(key)} must map to an object`);
      assert.equal(typeof entry.message, "string", `code.json key ${JSON.stringify(key)} needs a string "message"`);
      assert.notEqual(entry.message.trim(), "", `code.json key ${JSON.stringify(key)} has an empty message`);
    }
  });

  test("I2 code.json has no duplicate top-level keys", () => {
    const text = read(ZH_CODE);
    const keys = [...text.matchAll(/^  ("(?:[^"\\]|\\.)*"):\s*\{/gm)].map((m) => JSON.parse(m[1]));
    const seen = new Set();
    const dupes = [];
    for (const k of keys) {
      if (seen.has(k)) dupes.push(k);
      seen.add(k);
    }
    assert.deepEqual(dupes, [], `duplicate top-level keys in code.json: ${dupes.join(" | ")}`);
    // Guard against the raw scan missing entries, which would make the check above pass vacuously.
    assert.equal(keys.length, Object.keys(JSON.parse(text)).length, "raw scan found a different number of top-level keys than JSON.parse");
  });

  test("I3 every card description has a byte-identical code.json key whose message is translated", () => {
    const code = JSON.parse(read(ZH_CODE));
    for (const c of loadFrameworks()) {
      assert.ok(Object.hasOwn(code, c.description), `${c.name}: code.json has no key identical to the card description "${c.description}"`);
      assert.notEqual(code[c.description].message, c.description, `${c.name}: zh-Hans message is still the English text`);
    }
  });

  test("I4 the zh-Hans messages of the three new cards contain the card name", () => {
    const code = JSON.parse(read(ZH_CODE));
    const cards = loadFrameworks();
    for (const name of Object.keys(NEW_CARDS)) {
      const card = cards.find((c) => c.name === name);
      assert.ok(card, `${name} card is missing`);
      const message = code[card.description]?.message ?? "";
      assert.ok(message.includes(name), `${name}: zh-Hans message "${message}" does not contain "${name}"`);
    }
  });
});
