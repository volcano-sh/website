// Runs one ecosystem guide on a kind cluster, the way a reader would follow it: the plan's setup, then each covered
// fence in document order, with prose-only hooks at their `before` command.
// Usage: node test/e2e/run-guide.mjs <plan> [--dry-run]
//   --dry-run  prints the plan's ordered steps and exits. Nothing runs and no cluster is touched.
// A real run refuses to start unless the kube-context is kind-guides (or E2E_ALLOW_CONTEXT=1 is set).

import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { fenceSection, mdFences, mdOutline, read } from "../helpers.mjs";
import { PLANS } from "./plans.mjs";

const EXEC_LANGS = ["bash", "yaml", "yml"];
// A "# " line that starts a sentence with a capital and a lowercase letter is a caption, not output.
const CAPTION = /^# [A-Z][a-z]/;
const POLL_SECONDS = 5;
const DEFAULT_TIMEOUT_SECONDS = 300;
const WEBHOOK_ERROR = /webhook|connection refused|no endpoints available/i;
// 12 retries 5 s apart give admission webhooks about 60 s to become ready after a helm --wait.
const APPLY_RETRIES = 12;
const TABLE_COLUMNS = ["READY", "STATUS", "MINMEMBER", "RUNNINGS"];
const RANDOM_SEGMENT = [/^[bcdfghjklmnpqrstvwxz2456789]{5}$/, /^[0-9a-f]{8,10}$/, /^\d{10,}$/];
const PLACEHOLDER = /<[a-z][a-z0-9-]*>/g;
const KIND_CLUSTER = "guides";
const KIND_WORKERS = ["guides-worker", "guides-worker2"];

// Parses a bash block into commands. A "$ " line and its "\" continuations form one command. Each "#" line after a
// command is that command's expected output, except captions, which are skipped. Other lines are ignored.
export function parseBash(body) {
  const commands = [];
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith("$ ")) {
      let text = line.slice(2);
      while (/\\\s*$/.test(text) && i + 1 < lines.length) {
        i += 1;
        text = `${text.replace(/\\\s*$/, "")} ${lines[i].trim()}`;
      }
      commands.push({ command: text.trim(), output: [] });
    } else if (line.startsWith("#") && commands.length > 0 && !CAPTION.test(line)) {
      commands.at(-1).output.push(line.replace(/^# ?/, ""));
    }
  }
  return commands;
}

// Expected output as { kind, text }. "table" starts with a NAME header, "yaml" starts with a top-level key.
// Anything else is "unknown", which only a plan rule with a regex can check.
function expectation(lines) {
  if (lines.length === 0) return null;
  const kind = /^NAME\s/.test(lines[0]) ? "table" : /^[a-z][\w-]*:/.test(lines[0]) ? "yaml" : "unknown";
  return { kind, text: lines.join("\n") };
}

// The plan's ordered steps, read from its guide. Nothing runs here.
export function planSteps(name) {
  const plan = PLANS[name];
  if (!plan) throw new Error(`unknown plan "${name}"`);
  const md = read(`docs/Ecosystem/${plan.guide}`);
  const outline = mdOutline(md);
  const fences = mdFences(md).filter((f) => EXEC_LANGS.includes(f.lang));
  const steps = plan.setup.map((command) => ({ type: "command", section: "setup", command, expect: null, rule: undefined }));
  for (const section of plan.sections) {
    for (const fence of fences.filter((f) => fenceSection(outline, f.line) === section)) {
      if (fence.lang === "bash") {
        for (const { command, output } of parseBash(fence.body)) {
          const rule = plan.rules.find((r) => command.startsWith(r.match));
          steps.push({ type: "command", section, command, expect: expectation(output), rule });
        }
      } else {
        steps.push({ type: "yaml", section, line: fence.line, file: fence.title, body: fence.body });
      }
    }
  }
  for (const hook of plan.hooks) {
    const at = steps.findIndex((s) => s.type === "command" && s.command === hook.before);
    if (at < 0) throw new Error(`${name}: hook ${hook.name} needs the command "${hook.before}" in its sections`);
    steps.splice(at, 0, { type: "hook", name: hook.name, before: hook.before, section: steps[at].section });
  }
  return steps;
}

// Heading paths of a page, one per heading, in the same form as the plans' sections.
export function headingPaths(md) {
  const outline = mdOutline(md);
  return outline.map((h) => fenceSection(outline, h.line + 1));
}

// Placeholder tokens such as <podgroup-name> in a text.
export function placeholdersIn(text) {
  return [...new Set(text.match(PLACEHOLDER) ?? [])];
}

// Names that Kubernetes generates (random suffixes, hashes, epochs) compare as "*".
export function normalizeName(name = "") {
  return name.split("-").map((seg) => (RANDOM_SEGMENT.some((re) => re.test(seg)) ? "*" : seg)).join("-");
}

// Pairs each expected item with a different actual item (bipartite matching, so order does not matter).
// Returns the actual index for each expected index, or null when some expected item has no partner.
export function pairAll(expected, actual, same) {
  const owner = new Array(actual.length).fill(-1); // actual index -> expected index
  const assign = (e, seen) => {
    for (let a = 0; a < actual.length; a += 1) {
      if (seen[a] || !same(expected[e], actual[a])) continue;
      seen[a] = true;
      if (owner[a] === -1 || assign(owner[a], seen)) {
        owner[a] = e;
        return true;
      }
    }
    return false;
  };
  for (let e = 0; e < expected.length; e += 1) {
    if (!assign(e, new Array(actual.length).fill(false))) return null;
  }
  const pairs = new Array(expected.length);
  owner.forEach((e, a) => {
    if (e !== -1) pairs[e] = a;
  });
  return pairs;
}

// True when every part of `expected` appears in `actual`. Lists match element by element (see pairAll).
// Primitives are compared as strings, so 2 and "2" are equal.
export function subset(expected, actual) {
  if (expected === null) return actual === null;
  if (Array.isArray(expected)) return Array.isArray(actual) && pairAll(expected, actual, subset) !== null;
  if (typeof expected === "object") {
    return actual !== null && typeof actual === "object" && Object.entries(expected).every(([k, v]) => k in actual && subset(v, actual[k]));
  }
  return actual !== null && typeof actual !== "object" && String(expected) === String(actual);
}

// Parses a kubectl table: the header splits on runs of two or more spaces, so one-space names stay whole.
function parseTable(text) {
  const split = (line) => line.trim().split(/\s{2,}/);
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  if (lines.length === 0) return null;
  const header = split(lines[0]);
  if (header[0] !== "NAME") return null;
  const rows = lines.slice(1).map((l) => {
    const cells = split(l);
    return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
  });
  return { header, rows };
}

// Every expected row must match its own actual row on the normalized NAME and on the READY, STATUS, MINMEMBER and
// RUNNINGS columns the expected table has. Extra actual rows are allowed. With sameNode, the matched rows share one NODE.
export function matchTable(expectedText, actualText, sameNode = false) {
  // An expected table with no rows would match anything, so it is an error in the plan, not a pass.
  const exp = parseTable(expectedText);
  if (!exp || exp.rows.length === 0) throw new Error(`expected output is not a table with data rows:\n${expectedText}`);
  const act = parseTable(actualText);
  if (!act) return false;
  const columns = TABLE_COLUMNS.filter((c) => exp.header.includes(c));
  const sameRow = (e, a) => normalizeName(e.NAME) === normalizeName(a.NAME) && columns.every((c) => e[c] === a[c]);
  const pairs = pairAll(exp.rows, act.rows, sameRow);
  if (!pairs) return false;
  if (!sameNode) return true;
  return act.header.includes("NODE") && new Set(pairs.map((i) => act.rows[i].NODE)).size === 1;
}

// Whether actual output matches an expected output of a plan step.
export function matchOutput(expect, actual, sameNode = false) {
  if (expect.kind === "table") return matchTable(expect.text, actual, sameNode);
  if (expect.kind === "yaml") {
    try {
      return subset(yaml.load(expect.text), yaml.load(actual));
    } catch {
      return false;
    }
  }
  return false;
}

function sh(command, cwd) {
  return new Promise((resolve) => {
    execFile("bash", ["-o", "pipefail", "-c", command], { cwd, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({ code: error ? 1 : 0, stdout, stderr });
    });
  });
}

const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

async function mustRun(command, cwd) {
  const res = await sh(command, cwd);
  if (res.code !== 0) throw new Error(`command failed: ${command}\n${res.stderr}${res.stdout}`);
  return res;
}

// Runs a command that must exit 0. kubectl apply is retried while a webhook is not ready yet.
async function runOnce(command, cwd) {
  for (let attempt = 0; ; attempt += 1) {
    const res = await sh(command, cwd);
    const retry = res.code !== 0 && /^kubectl apply/.test(command) && WEBHOOK_ERROR.test(res.stderr) && attempt < APPLY_RETRIES;
    if (!retry) return res;
    await sleep(POLL_SECONDS);
  }
}

// Replaces each placeholder the plan defines. A value is a literal or { lookup } for a kubectl command run at this point.
async function resolve(text, placeholders, cwd) {
  let out = text;
  for (const key of placeholdersIn(text)) {
    if (!(key in placeholders)) continue;
    const value = typeof placeholders[key] === "string" ? placeholders[key] : (await mustRun(placeholders[key].lookup, cwd)).stdout.trim();
    if (!value) throw new Error(`placeholder ${key} resolved to an empty value`);
    out = out.split(key).join(value);
  }
  return out;
}

// Polls a command until its output matches (or its regex matches), up to the step's limit.
async function runPolled(step, command, ctx) {
  const limit = step.rule?.timeoutSeconds ?? step.rule?.retrySeconds ?? DEFAULT_TIMEOUT_SECONDS;
  const expected = step.expect ? { ...step.expect, text: await resolve(step.expect.text, ctx.placeholders, ctx.cwd) } : null;
  const matched = (res) => res.code === 0 && (step.rule?.regex ? step.rule.regex.test(res.stdout) : matchOutput(expected, res.stdout, step.rule?.sameNode));
  const deadline = Date.now() + limit * 1000;
  let res;
  for (;;) {
    res = await sh(command, ctx.cwd);
    if (matched(res)) {
      console.log(indent(res.stdout));
      return;
    }
    if (Date.now() >= deadline) break;
    await sleep(POLL_SECONDS);
  }
  const want = step.rule?.regex ? `output matching ${step.rule.regex}` : expected.text;
  throw new Error(`no match within ${limit}s: ${command}\nexpected:\n${indent(want)}\nlast exit ${res.code}, output:\n${indent(res.stdout + res.stderr)}`);
}

const indent = (text) => text.trimEnd().split("\n").map((l) => `  | ${l}`).join("\n");

// Prose-only instructions from the guides. Each runs in place of the reader's manual steps.
const HOOKS = {
  // The Volcano scheduler config must list network-topology-aware in the second tier. The default configmap does not.
  "enable-network-topology-aware": async ({ cwd }) => {
    const configmap = JSON.parse((await mustRun("kubectl -n volcano-system get configmap volcano-scheduler-configmap -o json", cwd)).stdout);
    const conf = yaml.load(configmap.data["volcano-scheduler.conf"]);
    const names = conf.tiers.flatMap((tier) => (tier.plugins ?? []).map((p) => p.name));
    if (names.includes("network-topology-aware")) throw new Error("network-topology-aware is already enabled");
    if (!conf.tiers[1]) throw new Error("volcano-scheduler.conf has no second tier");
    conf.tiers[1].plugins = [...(conf.tiers[1].plugins ?? []), { name: "network-topology-aware" }];
    fs.writeFileSync(path.join(cwd, "volcano-scheduler.conf"), yaml.dump(conf));
    await mustRun(
      "kubectl create configmap volcano-scheduler-configmap -n volcano-system --from-file=volcano-scheduler.conf --dry-run=client -o yaml | kubectl replace -f -",
      cwd,
    );
  },
};

async function runStep(step, ctx) {
  if (step.type === "hook") {
    console.log(`hook ${step.name}`);
    await HOOKS[step.name](ctx);
    return;
  }
  if (step.type === "yaml") {
    if (!step.file) throw new Error(`yaml fence at line ${step.line} has no title="..."`);
    fs.writeFileSync(path.join(ctx.cwd, step.file), await resolve(step.body, ctx.placeholders, ctx.cwd));
    console.log(`wrote ${step.file}`);
    return;
  }
  const command = await resolve(step.command, ctx.placeholders, ctx.cwd);
  console.log(`$ ${command}`);
  if (step.expect || step.rule?.regex) {
    await runPolled(step, command, ctx);
    return;
  }
  const res = await runOnce(command, ctx.cwd);
  if (res.code !== 0) throw new Error(`command failed: ${command}\n${res.stderr}${res.stdout}`);
  if (res.stdout.trim()) console.log(indent(res.stdout));
}

function describeStep(step) {
  if (step.type === "hook") return `hook   ${step.name} (before "${step.before}")`;
  if (step.type === "yaml") return `yaml   ${step.file}`;
  const how = step.expect ? `expect ${step.expect.kind}, ${step.expect.text.split("\n").length} lines` : step.rule?.regex ? `contains ${step.rule.regex}` : "exit 0";
  const limit = step.rule?.timeoutSeconds ?? step.rule?.retrySeconds ?? (step.expect ? DEFAULT_TIMEOUT_SECONDS : undefined);
  return `$      ${step.command}   [${how}${limit ? `, poll ${limit}s` : ""}${step.rule?.sameNode ? ", sameNode" : ""}]`;
}

async function checkContext() {
  const res = await sh("kubectl config current-context", process.cwd());
  const context = res.code === 0 ? res.stdout.trim() : "";
  if (context !== "kind-guides" && process.env.E2E_ALLOW_CONTEXT !== "1") {
    throw new Error(`refusing to run: kube-context is "${context || "unset"}", not kind-guides (set E2E_ALLOW_CONTEXT=1 to override)`);
  }
}

async function main([name, ...rest]) {
  const dryRun = rest.length === 1 && rest[0] === "--dry-run";
  if (!PLANS[name] || (rest.length > 0 && !dryRun)) {
    const reason = !PLANS[name] ? `unknown plan "${name ?? ""}"` : `unexpected argument "${rest.join(" ")}"`;
    console.error(`${reason}\nusage: node test/e2e/run-guide.mjs <plan> [--dry-run]\nplans: ${Object.keys(PLANS).join(", ")}`);
    process.exitCode = 2;
    return;
  }
  const plan = PLANS[name];
  const steps = planSteps(name);
  if (dryRun) {
    console.log(`${name} (${plan.guide}), images: ${plan.images.join(", ") || "none"}`);
    for (const step of steps) console.log(`  ${describeStep(step)}`);
    return;
  }
  await checkContext();
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), `guide-${name}-`));
  for (const image of plan.images) {
    await mustRun(`docker pull ${image}`, cwd);
    await mustRun(`kind load docker-image ${image} --name ${KIND_CLUSTER} --nodes ${KIND_WORKERS.join(",")}`, cwd);
  }
  const ctx = { cwd, placeholders: plan.placeholders };
  for (const step of steps) {
    await runStep(step, ctx);
  }
  console.log(`PASS ${name}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(`FAIL ${err.message}`);
    process.exitCode = 1;
  });
}
