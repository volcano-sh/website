// Static checks on the guide e2e plans (test/e2e/plans.mjs) against the three guides. The kind run itself is in CI
// (test/e2e/run-guide.mjs), so this runs in npm test and fails when a guide edit breaks a plan.
// Why: plans name sections by heading path and expect exact commands. A renamed heading, a new fence that no plan runs,
// or a yaml block without a file name would otherwise pass npm test and only fail, or quietly skip, in CI.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { ROOT, fenceSection, mdFences, mdOutline, read } from "../helpers.mjs";
import { OUT_OF_SCOPE, PLANS, SPLIT_GUIDES } from "../e2e/plans.mjs";
import { headingPaths, parseBash, placeholdersIn, planSteps } from "../e2e/run-guide.mjs";

const ECO = "docs/Ecosystem";
const GUIDES = ["GroveOnVolcano.md", "LeaderWorkerSetOnVolcano.md", "RayOnVolcano.md"];
const EXEC_LANGS = ["bash", "yaml", "yml"];
const plansFor = (guide) => Object.entries(PLANS).filter(([, p]) => p.guide === guide);

// Fences of a guide that some plan runs: the fence sits under one of that guide's planned sections.
function coveredFences(guide) {
  const md = read(`${ECO}/${guide}`);
  const outline = mdOutline(md);
  const planned = new Set(plansFor(guide).flatMap(([, p]) => p.sections));
  return mdFences(md).filter((f) => EXEC_LANGS.includes(f.lang) && planned.has(fenceSection(outline, f.line)));
}

// Lines of a bash block that are neither a "$ " command, its "\" continuation, nor a "#" line (blank lines are fine).
function bashLineProblems(body) {
  const problems = [];
  let continued = false;
  body.split("\n").forEach((line) => {
    if (continued) {
      continued = /\\\s*$/.test(line);
      return;
    }
    if (line.trim() === "" || line.startsWith("#")) return;
    if (line.startsWith("$ ")) {
      continued = /\\\s*$/.test(line);
      return;
    }
    problems.push(`not a $ command, a continuation or a # line: ${line.trim()}`);
  });
  return problems;
}

// Every value of an `image` key in a parsed YAML document, at any depth.
function imagesIn(node) {
  if (Array.isArray(node)) return node.flatMap(imagesIn);
  if (node === null || typeof node !== "object") return [];
  return Object.entries(node).flatMap(([key, value]) => (key === "image" && typeof value === "string" ? [value] : imagesIn(value)));
}

describe("guide e2e plans", () => {
  test("E1 every plan's guide exists and every listed section is a heading path in it", () => {
    for (const [name, plan] of Object.entries(PLANS)) {
      const file = `${ECO}/${plan.guide}`;
      assert.ok(fs.existsSync(path.join(ROOT, file)), `${name}: guide ${file} does not exist`);
      const paths = headingPaths(read(file));
      for (const section of plan.sections) {
        assert.ok(paths.includes(section), `${name}: section "${section}" is not a heading path in ${file}`);
      }
    }
  });

  test("E1 every OUT_OF_SCOPE heading is a heading in its guide", () => {
    for (const [guide, headings] of Object.entries(OUT_OF_SCOPE)) {
      const paths = headingPaths(read(`${ECO}/${guide}`));
      for (const heading of Object.keys(headings)) {
        assert.ok(paths.includes(heading), `${guide}: OUT_OF_SCOPE heading "${heading}" is not a heading in the guide`);
      }
    }
  });

  test("E2 every bash and yaml fence in the three guides is under a planned section or an OUT_OF_SCOPE heading", () => {
    // Fences in other languages (plain output or text blocks) are not run, so they need no plan.
    const uncovered = [];
    for (const guide of GUIDES) {
      const md = read(`${ECO}/${guide}`);
      const outline = mdOutline(md);
      const planned = new Set(plansFor(guide).flatMap(([, p]) => p.sections));
      const outOfScope = Object.keys(OUT_OF_SCOPE[guide] ?? {});
      for (const fence of mdFences(md)) {
        if (!EXEC_LANGS.includes(fence.lang)) continue;
        const section = fenceSection(outline, fence.line);
        const excluded = outOfScope.some((h) => section === h || section.startsWith(`${h}/`));
        if (!planned.has(section) && !excluded) uncovered.push(`${guide}:${fence.line} (${fence.lang}) under "${section}"`);
      }
    }
    assert.deepEqual(uncovered, [], "fences that no plan runs");
  });

  test("E3 every yaml fence in a planned section has a title, and a later command in the plan applies that file", () => {
    for (const name of Object.keys(PLANS)) {
      const steps = planSteps(name);
      steps.forEach((step, i) => {
        if (step.type !== "yaml") return;
        assert.ok(step.file, `${name}: yaml fence at ${PLANS[name].guide}:${step.line} needs a title="<file>"`);
        const applied = steps.slice(i + 1).some((s) => s.type === "command" && s.command.includes(`-f ${step.file}`));
        assert.ok(applied, `${name}: no later command applies ${step.file} with -f`);
      });
    }
  });

  test("E4 every placeholder in a planned command or yaml block is defined by each plan that runs it", () => {
    for (const [name, plan] of Object.entries(PLANS)) {
      for (const step of planSteps(name)) {
        if (step.type !== "command" && step.type !== "yaml") continue;
        const text = step.type === "yaml" ? step.body : step.command;
        const missing = placeholdersIn(text).filter((p) => !(p in plan.placeholders));
        assert.deepEqual(missing, [], `${name}: ${missing.join(", ")} in "${step.command ?? step.file}" is not defined by the plan`);
      }
    }
  });

  test("E5 every command with expected output has a table or YAML expectation, or its plan defines a contains check", () => {
    const bad = [];
    for (const name of Object.keys(PLANS)) {
      for (const step of planSteps(name)) {
        if (step.type === "command" && step.expect?.kind === "unknown" && !step.rule?.regex) bad.push(`${name}: ${step.command}`);
      }
    }
    assert.deepEqual(bad, [], "expected output that is neither a table nor YAML, and has no contains check");
  });

  test("E5 every expected table has at least one data row, so an empty table cannot match vacuously", () => {
    const empty = [];
    for (const name of Object.keys(PLANS)) {
      for (const step of planSteps(name)) {
        if (step.type !== "command" || step.expect?.kind !== "table") continue;
        const rows = step.expect.text.split("\n").filter((l) => l.trim() !== "");
        if (rows.length < 2) empty.push(`${name}: ${step.command}`);
      }
    }
    assert.deepEqual(empty, [], "expected tables with a header and no data rows");
  });

  test("E6 every hook's covers sentence appears verbatim in its guide", () => {
    for (const [name, plan] of Object.entries(PLANS)) {
      const md = read(`${ECO}/${plan.guide}`);
      for (const hook of plan.hooks) {
        assert.ok(md.includes(hook.covers), `${name}: hook ${hook.name} covers a sentence that is not in ${plan.guide}`);
      }
    }
  });

  test("E7 each guide with a New and an Existing installation has a heading for each, and a plan that runs each one", () => {
    for (const { guide, parent } of SPLIT_GUIDES) {
      const headings = headingPaths(read(`${ECO}/${guide}`));
      const sections = new Set(plansFor(guide).flatMap(([, p]) => p.sections));
      for (const kind of ["New installation", "Existing installation"]) {
        const section = `${parent}/${kind}`;
        assert.ok(headings.includes(section), `${guide}: no heading "${section}"`);
        assert.ok(sections.has(section), `${guide}: no plan runs "${section}"`);
      }
    }
  });

  test("E8 every plan builds its ordered steps, with each hook placed before its command", () => {
    for (const name of Object.keys(PLANS)) {
      const steps = planSteps(name);
      assert.ok(steps.length > 0, `${name}: no steps`);
      steps.forEach((step, i) => {
        if (step.type === "hook") assert.equal(steps[i + 1]?.command, step.before, `${name}: hook ${step.name} must run right before "${step.before}"`);
      });
    }
  });

  test("E9 every line of a covered bash fence is a $ command, its continuation or a # line, and each fence has a command", () => {
    const problems = [];
    for (const guide of GUIDES) {
      for (const fence of coveredFences(guide).filter((f) => f.lang === "bash")) {
        const where = `${guide}:${fence.line}`;
        problems.push(...bashLineProblems(fence.body).map((p) => `${where}: ${p}`));
        if (parseBash(fence.body).length === 0) problems.push(`${where}: bash fence has no $ command`);
      }
    }
    assert.deepEqual(problems, [], "bash lines that no command accounts for");
  });

  test("E10 every image in an inline yaml block a plan runs is listed in that plan's images", () => {
    // Manifests that a plan downloads with curl are not in the guide, so they are not checked here.
    const missing = [];
    for (const [name, plan] of Object.entries(PLANS)) {
      for (const step of planSteps(name)) {
        if (step.type !== "yaml") continue;
        for (const image of yaml.loadAll(step.body).flatMap(imagesIn)) {
          if (!plan.images.includes(image)) missing.push(`${name}: ${image} (${PLANS[name].guide}:${step.line})`);
        }
      }
    }
    assert.deepEqual(missing, [], "images used in yaml but not listed in the plan's images");
  });
});
