// SVG logos referenced by the Frameworks cards: well-formed, explicitly sized, safe to embed, and labelled as images.
// Why: .framework-logo is a flex container and its <img> has max-width: 100%. An SVG with only a viewBox
// has no intrinsic size and collapses to nothing, so width and height must be explicit (L3).
// The other checks keep the logos safe even if one is later inlined or opened directly (L4).

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { STATIC, checkSvg, loadFrameworks } from "../helpers.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";
const FORBIDDEN_ELEMENTS = ["script", "foreignobject", "image"];

const svgLogos = [...new Set(loadFrameworks().map((c) => c.logo).filter((l) => l.endsWith(".svg")))];

test("L0 at least one SVG logo is referenced", () => {
  assert.ok(svgLogos.length > 0, "no .svg logo is referenced by the Frameworks component, so the logo checks ran on nothing");
});

for (const logo of svgLogos) {
  describe(logo, () => {
    const text = () => fs.readFileSync(path.join(STATIC, logo), "utf8");
    const root = () => checkSvg(text()).root?.attrs ?? {};

    test("L1 is well-formed, with one <svg> root", () => {
      const { errors } = checkSvg(text());
      assert.deepEqual(errors, [], `${logo}: ${errors.join("; ")}`);
    });

    test("L2 declares the SVG namespace on the root", () => {
      assert.equal(root().xmlns, SVG_NS, `${logo}: root <svg> must have xmlns="${SVG_NS}"`);
    });

    test("L3 has explicit positive width and height (unitless or px) and a 4-number viewBox", () => {
      const attrs = root();
      for (const key of ["width", "height"]) {
        assert.match(attrs[key] ?? "", /^\d+(\.\d+)?(px)?$/, `${logo}: root ${key} must be a unitless or px number, got ${JSON.stringify(attrs[key])}`);
        assert.ok(parseFloat(attrs[key]) > 0, `${logo}: root ${key} must be positive, got ${attrs[key]}`);
      }
      const vb = (attrs.viewBox ?? "").trim().split(/[\s,]+/).map(Number);
      assert.equal(vb.length, 4, `${logo}: viewBox must have 4 numbers, got ${JSON.stringify(attrs.viewBox)}`);
      assert.ok(vb.every(Number.isFinite), `${logo}: viewBox must be all numbers, got ${JSON.stringify(attrs.viewBox)}`);
      assert.ok(vb[2] > 0 && vb[3] > 0, `${logo}: viewBox width and height must be positive, got ${attrs.viewBox}`);
    });

    test("L4 is safe to embed: no script, foreignObject, image, event handlers, external refs or @import", () => {
      const src = text();
      const problems = [];
      for (const tag of checkSvg(src).tags) {
        if (FORBIDDEN_ELEMENTS.includes(tag.name.toLowerCase())) problems.push(`<${tag.name}> element`);
        for (const [key, value] of Object.entries(tag.attrs)) {
          if (/^on/i.test(key)) problems.push(`event handler ${key} on <${tag.name}>`);
          if ((key === "href" || key === "xlink:href") && !value.startsWith("#")) {
            problems.push(`${key}="${value}" on <${tag.name}> (only #fragment references are allowed)`);
          }
        }
      }
      if (/url\(\s*['"]?\s*(https?:|\/\/)/i.test(src)) problems.push("url(http...) or url(//...) reference");
      if (/@import/i.test(src)) problems.push("@import");
      assert.deepEqual(problems, [], `${logo}: unsafe content: ${problems.join("; ")}`);
    });

    test("L5 root has role=\"img\"", () => {
      assert.equal(root().role, "img", `${logo}: root <svg> must have role="img" (aria-label is not required)`);
    });
  });
}
