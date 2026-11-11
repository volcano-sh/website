// Ecosystem guides for Grove, LeaderWorkerSet and Ray (docs/Ecosystem/*.md), plus the zh-Hans copy of the Ray guide.
// Why: these pages hold YAML, commands and version pins that readers copy and run. The checks parse the YAML,
// recompute the PodGroup numbers the pages quote (minMember, minResources) from the manifests, keep the
// Helm versions and upstream links in line with PINS, and keep test-run wording out of the pages.
// The version pins live in PINS below. A version bump is an edit here plus the page text.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import yaml from "js-yaml";
import { ROOT, cpu, fmtCpu, fmtMem, memMi, mdFences, mentionsExact, read } from "../helpers.mjs";

const ECO = "docs/Ecosystem";
const ZH_ECO = "i18n/zh-Hans/docusaurus-plugin-content-docs/current/Ecosystem";
const ZH_RAY = `${ZH_ECO}/RayOnVolcano.md`;
const PAGES = { Grove: "GroveOnVolcano.md", LWS: "LeaderWorkerSetOnVolcano.md", Ray: "RayOnVolcano.md" };

// Pins for the three pages. `helm` is the chart version flag on every helm install/upgrade command. `links.re` captures
// the ref from each upstream link and `links.ref` is the value it must equal.
const PINS = {
  [PAGES.Ray]: {
    helm: "--version 1.7.2",
    links: { re: "raw\\.githubusercontent\\.com/ray-project/kuberay/(v[^/\\s)]+)/", ref: "v1.7.2" },
  },
  [PAGES.Grove]: {
    helm: "--version v0.2.0-beta1",
    links: { re: "github\\.com/ai-dynamo/grove/(?:blob|tree)/([^/\\s)]+)", ref: "v0.2.0-beta1" },
  },
  [PAGES.LWS]: {
    helm: "--version=1.0.0",
    links: { re: "github\\.com/kubernetes-sigs/lws/(?:blob|tree)/([^/\\s)]+)", ref: "v1.0.0" },
  },
};

// Test-run notes (versions, cluster, observed runs) belong in the PR description, not in the guides.
const RUN_WORDING = /Tested versions|\bour run\b|\bwe did not\b|\bin our\b|\(tested with|未经过验证/i;

// Documents without apiVersion/kind/metadata.name. A document is exempt only when its top-level keys match exactly.
// `label` is how the document appears in the expected kind list.
const NON_K8S_DOCS = [{ file: PAGES.Grove, topLevelKeys: ["config"], label: "values" }];

// Every YAML document on each page, in order.
const EXPECTED_KINDS = {
  [PAGES.Grove]: ["values", "PodCliqueSet"],
  [PAGES.LWS]: ["Queue", "LeaderWorkerSet"],
  [PAGES.Ray]: ["HyperNode", "HyperNode", "HyperNode", "RayCluster", "Job"],
};

const cache = new Map();

// Parses a page once: its fences, and every yaml/yml block with its documents. A YAML error names the file and line.
function page(file) {
  if (!cache.has(file)) {
    const fences = mdFences(read(`${ECO}/${file}`));
    const yamlBlocks = [];
    fences.forEach((f, index) => {
      if (f.lang !== "yaml" && f.lang !== "yml") return;
      let docs;
      try {
        docs = yaml.loadAll(f.body);
      } catch (err) {
        throw new Error(`${file}:${f.line}: YAML does not parse: ${err.reason ?? err.message}`);
      }
      yamlBlocks.push({ index, line: f.line, docs });
    });
    cache.set(file, { file, fences, yamlBlocks });
  }
  return cache.get(file);
}

function allDocs(file) {
  return page(file).yamlBlocks.flatMap((block) => block.docs.map((doc) => ({ block, doc })));
}

function exemption(file, doc) {
  return NON_K8S_DOCS.find((e) => e.file === file && isMapping(doc) && sameKeys(Object.keys(doc), e.topLevelKeys));
}

function findOne(file, kind) {
  const hits = allDocs(file).filter(({ doc }) => isMapping(doc) && doc.kind === kind);
  assert.equal(hits.length, 1, `${file}: expected exactly one ${kind} document, found ${hits.length}`);
  return hits[0];
}

// The first bash block after a YAML block. The pages show the output that matches each manifest there.
function nextBash(file, block) {
  const bash = page(file).fences.slice(block.index + 1).find((f) => f.lang === "bash");
  assert.ok(bash, `${file}:${block.line}: no bash block follows this YAML block`);
  return bash.body;
}

function isMapping(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function sameKeys(a, b) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

// Summed requests of a pod spec: CPU in millicores, memory in Mi.
function podRequests(podSpec) {
  let milli = 0;
  let mi = 0;
  for (const c of podSpec?.containers ?? []) {
    const r = c.resources?.requests ?? {};
    if (r.cpu !== undefined) milli += cpu(r.cpu);
    if (r.memory !== undefined) mi += memMi(r.memory);
  }
  return { cpu: milli, mem: mi };
}

function ecoFiles(dir) {
  return fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(".md")).map((f) => `${dir}/${f}`);
}

// Joins backslash-continued lines, so a command split over several lines is one logical line.
// Trailing whitespace (spaces, tabs or a CR) after the backslash does not stop the join.
function logicalLines(md) {
  const out = [];
  let cur = "";
  for (const line of md.split("\n")) {
    const trimmed = line.replace(/\s+$/, "");
    if (trimmed.endsWith("\\")) {
      cur += `${trimmed.slice(0, -1)} `;
    } else {
      out.push(cur + line);
      cur = "";
    }
  }
  if (cur) out.push(cur);
  return out;
}

// D1 front matter. Only this PR's three pages are required to set title and sidebar_position. Other Ecosystem
// pages may omit a position or share one, and the PR pages' positions must not collide with any other page's.
describe("front matter", () => {
  const prFiles = Object.values(PAGES).map((p) => `${ECO}/${p}`);

  test("D1 each PR page has a non-empty title and an integer sidebar_position", () => {
    for (const f of prFiles) {
      const { data } = matter(read(f));
      assert.ok(typeof data.title === "string" && data.title.trim() !== "", `${f}: front matter needs a non-empty string "title"`);
      assert.ok(Number.isInteger(data.sidebar_position), `${f}: front matter needs an integer "sidebar_position", got ${JSON.stringify(data.sidebar_position)}`);
    }
  });

  test("D1 no PR page shares a sidebar_position with another Ecosystem page that sets one", () => {
    const byPosition = new Map();
    for (const f of ecoFiles(ECO)) {
      const { data } = matter(read(f));
      if (!Number.isInteger(data.sidebar_position)) continue;
      byPosition.set(data.sidebar_position, [...(byPosition.get(data.sidebar_position) ?? []), f]);
    }
    for (const f of prFiles) {
      const pos = matter(read(f)).data.sidebar_position;
      const sharing = (byPosition.get(pos) ?? []).filter((g) => g !== f);
      assert.deepEqual(sharing, [], `renumber sidebar_position: ${f} collides with ${sharing.join(", ")} at ${pos}`);
    }
  });

  test("D1 GroveOnVolcano front matter sets title \"Grove on Volcano\" and sidebar_position 10", () => {
    const { data } = matter(read(`${ECO}/${PAGES.Grove}`));
    assert.equal(data.title, "Grove on Volcano", `${PAGES.Grove}: front matter title`);
    assert.equal(data.sidebar_position, 10, `${PAGES.Grove}: front matter sidebar_position`);
  });

  test("D1 LeaderWorkerSetOnVolcano front matter sets title \"LeaderWorkerSet on Volcano\" and sidebar_position 11", () => {
    const { data } = matter(read(`${ECO}/${PAGES.LWS}`));
    assert.equal(data.title, "LeaderWorkerSet on Volcano", `${PAGES.LWS}: front matter title`);
    assert.equal(data.sidebar_position, 11, `${PAGES.LWS}: front matter sidebar_position`);
  });
});

for (const file of Object.values(PAGES)) {
  describe(file, () => {
    test("D2 no unclosed code fences", () => {
      const open = page(file).fences.filter((f) => f.unclosed).map((f) => `line ${f.line}`);
      assert.deepEqual(open, [], `${file}: unclosed code fence at ${open.join(", ")}`);
    });

    test("D3 every yaml block parses and every document is a mapping", () => {
      for (const block of page(file).yamlBlocks) {
        block.docs.forEach((doc, i) => {
          assert.ok(isMapping(doc), `${file}:${block.line}: YAML document ${i + 1} must be a mapping, got ${doc === null ? "null" : Array.isArray(doc) ? "a list" : typeof doc}`);
        });
      }
    });

    test("D4 every Kubernetes document has string apiVersion, kind and metadata.name, and the expected kinds", () => {
      const labels = [];
      for (const { block, doc } of allDocs(file)) {
        if (exemption(file, doc)) {
          labels.push(exemption(file, doc).label);
          continue;
        }
        assert.ok(isMapping(doc), `${file}:${block.line}: YAML document must be a mapping (see D3)`);
        for (const key of ["apiVersion", "kind"]) {
          assert.equal(typeof doc[key], "string", `${file}:${block.line}: document has no string "${key}"`);
        }
        assert.equal(typeof doc.metadata?.name, "string", `${file}:${block.line}: ${doc.kind} has no string metadata.name`);
        labels.push(doc.kind);
      }
      assert.deepEqual(labels, EXPECTED_KINDS[file], `${file}: expected document kinds ${EXPECTED_KINDS[file].join(", ")}, got ${labels.join(", ")}`);
    });

    test("D5 every metadata label and annotation value is a string", () => {
      for (const { block, doc } of allDocs(file)) {
        for (const section of ["labels", "annotations"]) {
          for (const [key, value] of Object.entries(doc.metadata?.[section] ?? {})) {
            assert.equal(typeof value, "string", `${file}:${block.line}: ${section} "${key}" must be a quoted string, got ${typeof value} ${JSON.stringify(value)}`);
          }
        }
      }
    });
  });
}

describe("Grove on Volcano (D6)", () => {
  const file = PAGES.Grove;

  test("D6 the values file enables the volcano scheduler profile", () => {
    const hit = allDocs(file).find(({ doc }) => exemption(file, doc));
    assert.ok(hit, `${file}: no values document with top-level key config`);
    const profiles = hit.doc.config?.scheduler?.profiles ?? [];
    assert.ok(profiles.some((p) => p?.name === "volcano"), `${file}:${hit.block.line}: config.scheduler.profiles has no "volcano" profile`);
  });

  test("D6 every clique uses the volcano scheduler and minAvailable <= replicas", () => {
    const { doc, block } = findOne(file, "PodCliqueSet");
    const cliques = doc.spec?.template?.cliques ?? [];
    assert.ok(cliques.length > 0, `${file}:${block.line}: PodCliqueSet has no cliques`);
    for (const c of cliques) {
      assert.equal(c.spec?.podSpec?.schedulerName, "volcano", `${file}:${block.line}: clique ${c.name} must set spec.podSpec.schedulerName to volcano`);
      const min = c.spec.minAvailable ?? 1;
      assert.ok(min <= c.spec.replicas, `${file}:${block.line}: clique ${c.name} has minAvailable ${min} > replicas ${c.spec.replicas}`);
    }
  });

  test("D6 the PodCliqueSet sets the scheduling.grove.io/volcano-queue annotation", () => {
    const { doc, block } = findOne(file, "PodCliqueSet");
    const queue = doc.metadata?.annotations?.["scheduling.grove.io/volcano-queue"];
    assert.ok(typeof queue === "string" && queue !== "", `${file}:${block.line}: PodCliqueSet is missing the scheduling.grove.io/volcano-queue annotation`);
  });

  test("D6 the bash block after the PodCliqueSet quotes minMember (sum of minAvailable) and each subGroupSize", () => {
    const { doc, block } = findOne(file, "PodCliqueSet");
    const cliques = doc.spec.template.cliques;
    const sum = cliques.reduce((total, c) => total + (c.spec.minAvailable ?? 1), 0);
    const bash = nextBash(file, block);
    assert.ok(mentionsExact(bash, `minMember: ${sum}`), `${file}: the bash block after line ${block.line} must show "minMember: ${sum}"`);
    for (const c of cliques) {
      const min = c.spec.minAvailable ?? 1;
      assert.ok(mentionsExact(bash, `subGroupSize: ${min}`), `${file}: the bash block after line ${block.line} must show "subGroupSize: ${min}" for clique ${c.name}`);
    }
  });
});

describe("LeaderWorkerSet on Volcano (D7)", () => {
  const file = PAGES.LWS;

  test("D7 leaderTemplate and workerTemplate both set schedulerName to volcano", () => {
    const { doc, block } = findOne(file, "LeaderWorkerSet");
    const t = doc.spec?.leaderWorkerTemplate;
    assert.equal(t?.leaderTemplate?.spec?.schedulerName, "volcano", `${file}:${block.line}: leaderTemplate.spec.schedulerName must be volcano`);
    assert.equal(t?.workerTemplate?.spec?.schedulerName, "volcano", `${file}:${block.line}: workerTemplate.spec.schedulerName must be volcano`);
  });

  test("D7 the scheduling.volcano.sh/queue-name annotation equals the Queue name in the same block", () => {
    const { doc: lws, block } = findOne(file, "LeaderWorkerSet");
    const { doc: queue, block: queueBlock } = findOne(file, "Queue");
    assert.equal(queueBlock.line, block.line, `${file}: the Queue and LeaderWorkerSet must be in the same YAML block`);
    const annotated = lws.metadata?.annotations?.["scheduling.volcano.sh/queue-name"];
    assert.equal(annotated, queue.metadata.name, `${file}:${block.line}: queue-name annotation "${annotated}" must equal the Queue name "${queue.metadata.name}"`);
  });

  test("D7 the bash block after the LeaderWorkerSet shows minMember (size), summed minResources and the queue", () => {
    const { doc: lws, block } = findOne(file, "LeaderWorkerSet");
    const { doc: queue } = findOne(file, "Queue");
    const t = lws.spec.leaderWorkerTemplate;
    const size = t.size;
    // One replica is one leader plus (size - 1) workers.
    const leader = podRequests(t.leaderTemplate.spec);
    const worker = podRequests(t.workerTemplate.spec);
    const group = { cpu: leader.cpu + (size - 1) * worker.cpu, mem: leader.mem + (size - 1) * worker.mem };
    const bash = nextBash(file, block);
    for (const s of [`minMember: ${size}`, `cpu: ${fmtCpu(group.cpu)}`, `memory: ${fmtMem(group.mem)}`, `queue: ${queue.metadata.name}`]) {
      assert.ok(mentionsExact(bash, s), `${file}: the bash block after line ${block.line} must show "${s}" (computed from the YAML)`);
    }
  });
});

describe("Ray on Volcano (D8)", () => {
  const file = PAGES.Ray;

  test("D8 HyperNode members of type HyperNode name a HyperNode in the same block with a lower tier", () => {
    let checked = 0;
    for (const block of page(file).yamlBlocks) {
      const hypernodes = block.docs.filter((d) => isMapping(d) && d.kind === "HyperNode");
      if (hypernodes.length === 0) continue;
      const byName = new Map(hypernodes.map((h) => [h.metadata.name, h]));
      for (const parent of hypernodes) {
        for (const member of parent.spec?.members ?? []) {
          if (member.type !== "HyperNode") continue;
          const childName = member.selector?.exactMatch?.name;
          const child = byName.get(childName);
          assert.ok(child, `${file}:${block.line}: HyperNode ${parent.metadata.name} lists HyperNode "${childName}", which is not defined in the same block`);
          assert.ok(child.spec.tier < parent.spec.tier, `${file}:${block.line}: HyperNode ${childName} (tier ${child.spec.tier}) must have a lower tier than its parent ${parent.metadata.name} (tier ${parent.spec.tier})`);
          checked += 1;
        }
      }
    }
    assert.ok(checked > 0, `${file}: no HyperNode-of-HyperNode members found, so the tier check ran on nothing`);
  });

  test("D8 the RayCluster topology mode is hard or soft, and highest-tier-allowed names an existing tier", () => {
    const { doc, block } = findOne(file, "RayCluster");
    const labels = doc.metadata?.labels ?? {};
    assert.ok(["hard", "soft"].includes(labels["volcano.sh/network-topology-mode"]), `${file}:${block.line}: volcano.sh/network-topology-mode must be "hard" or "soft", got ${JSON.stringify(labels["volcano.sh/network-topology-mode"])}`);
    const tier = labels["volcano.sh/network-topology-highest-tier-allowed"];
    assert.equal(typeof tier, "string", `${file}:${block.line}: volcano.sh/network-topology-highest-tier-allowed must be a quoted string, got ${JSON.stringify(tier)}`);
    const tiers = allDocs(file).filter(({ doc: d }) => isMapping(d) && d.kind === "HyperNode").map(({ doc: d }) => String(d.spec.tier));
    assert.ok(tiers.includes(tier), `${file}:${block.line}: highest-tier-allowed "${tier}" does not name an existing tier (tiers: ${[...new Set(tiers)].join(", ")})`);
  });

  test("D8 rayVersion matches the image tag of every container", () => {
    const { doc, block } = findOne(file, "RayCluster");
    const version = doc.spec.rayVersion;
    const groups = [doc.spec.headGroupSpec, ...(doc.spec.workerGroupSpecs ?? [])];
    for (const g of groups) {
      for (const c of g.template.spec.containers) {
        const tag = c.image.slice(c.image.lastIndexOf(":") + 1);
        assert.equal(tag, version, `${file}:${block.line}: container ${c.name} image ${c.image} must use the tag of rayVersion "${version}"`);
      }
    }
  });

  test("D8 the bash block after the RayCluster shows minMember, summed cpu and memory", () => {
    const { doc, block } = findOne(file, "RayCluster");
    // minMember = 1 (head) + sum of replicas x numOfHosts (default 1) over the worker groups.
    // minResources = head requests + the same pods' requests.
    const head = podRequests(doc.spec.headGroupSpec.template.spec);
    let minMember = 1;
    let milli = head.cpu;
    let mi = head.mem;
    for (const w of doc.spec.workerGroupSpecs ?? []) {
      const pods = w.replicas * (w.numOfHosts ?? 1);
      const r = podRequests(w.template.spec);
      minMember += pods;
      milli += pods * r.cpu;
      mi += pods * r.mem;
    }
    const bash = nextBash(file, block);
    for (const s of [`minMember: ${minMember}`, `cpu: "${fmtCpu(milli)}"`, `memory: ${fmtMem(mi)}`]) {
      assert.ok(mentionsExact(bash, s), `${file}: the bash block after line ${block.line} must show "${s}" (computed from the RayCluster)`);
    }
  });
});

describe("no leftover test names", () => {
  test("D9 no volcano-597 or kind-cluster node names in the three PR pages or the zh-Hans Ray page", () => {
    const pattern = /volcano-597|kind-(control-plane|worker\d*)/;
    const hits = [];
    for (const f of [...Object.values(PAGES).map((p) => `${ECO}/${p}`), ZH_RAY]) {
      read(f).split("\n").forEach((line, i) => {
        if (pattern.test(line)) hits.push(`${f}:${i + 1}: ${line.trim()}`);
      });
    }
    assert.deepEqual(hits, [], "test-cluster names found in Ecosystem pages");
  });
});

describe("version pins", () => {
  for (const file of Object.values(PAGES)) {
    const pin = PINS[file];
    const text = () => read(`${ECO}/${file}`);

    test(`D10 ${file}: every helm install or upgrade command uses the pinned chart version`, () => {
      // Only command lines in bash blocks. Prose such as "because `helm upgrade` does not update the CRDs" is not a command.
      const helm = page(file).fences
        .filter((f) => f.lang === "bash")
        .flatMap((f) => logicalLines(f.body))
        .filter((l) => /\bhelm (install|upgrade)\b/.test(l));
      assert.ok(helm.length > 0, `${file}: no helm install or upgrade command found`);
      const wrong = helm.filter((l) => !mentionsExact(l, pin.helm));
      assert.deepEqual(wrong, [], `${file}: every helm install or upgrade command must use "${pin.helm}"`);
    });

    test(`D10 ${file}: every upstream link uses the pinned ref ${pin.links.ref}`, () => {
      const refs = [...text().matchAll(new RegExp(pin.links.re, "g"))].map((m) => m[1]);
      assert.ok(refs.length > 0, `${file}: no upstream links matched /${pin.links.re}/`);
      const wrong = refs.filter((r) => r !== pin.links.ref);
      assert.deepEqual(wrong, [], `${file}: upstream links must use ${pin.links.ref}, found ${[...new Set(wrong)].join(", ")}`);
    });
  }
});

describe("no test-run wording (D10)", () => {
  for (const file of [...Object.values(PAGES).map((p) => `${ECO}/${p}`), ZH_RAY]) {
    test(`D10 ${file}: no "Tested versions" callout and no test-run wording`, () => {
      const hits = read(file).split("\n").flatMap((line, i) => (RUN_WORDING.test(line) ? [`line ${i + 1}: ${line.trim()}`] : []));
      assert.deepEqual(hits, [], `${file}: remove test-run wording`);
    });
  }
});

describe("Running Ray on Volcano (D11)", () => {
  const file = PAGES.Ray;

  test("D11 list item 1 under Running Ray on Volcano names RayCluster and RayJob, not RayService", () => {
    const lines = read(`${ECO}/${file}`).split("\n");
    const start = lines.findIndex((l) => /^### Running Ray on Volcano\s*$/.test(l));
    assert.ok(start >= 0, `${file}: heading "### Running Ray on Volcano" not found`);
    const item = lines.slice(start + 1).find((l) => /^1\.\s/.test(l));
    assert.ok(item, `${file}: no list item 1 under "Running Ray on Volcano"`);
    assert.ok(item.includes("RayCluster") && item.includes("RayJob"), `${file}: item 1 must name RayCluster and RayJob, got: ${item}`);
    assert.ok(!item.includes("RayService"), `${file}: item 1 must not name RayService, got: ${item}`);
  });

  test("D11 the page says a RayService does not get a PodGroup of its own", () => {
    assert.ok(read(`${ECO}/${file}`).includes("A RayService does not get a PodGroup of its own."), `${file}: missing the sentence "A RayService does not get a PodGroup of its own."`);
  });
});
