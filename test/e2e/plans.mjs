// Plans for the ecosystem guide e2e runner (run-guide.mjs). A plan is one reader's path through a guide: the setup
// the reader already has, then the sections they follow, in order. Heading paths are built by fenceSection() in
// test/helpers.mjs: the headings above a fence, below the page title, joined with "/".

export const K = "Method 1: Using KubeRay Operator";
const SETUP = `${K}/Setup Requirements`;
const RAY_IMAGE = "rayproject/ray:2.52.0";

// Sections no plan runs, with the reason. A fence under one of these headings needs no plan (test E2).
export const OUT_OF_SCOPE = {
  "RayOnVolcano.md": {
    "Method 2: Using Volcano Job with Ray Plugin": "unchanged by #601; needs the ray CLI and a blocking port-forward",
  },
};

// Each parent's New installation and Existing installation sections must both be run by some plan (test E7).
export const SPLIT_GUIDES = [
  { guide: "GroveOnVolcano.md", parent: "Enable the Volcano backend" },
  { guide: "LeaderWorkerSetOnVolcano.md", parent: "Enable the Volcano provider" },
  { guide: "RayOnVolcano.md", parent: SETUP },
];

const GROVE_PODGROUP = {
  "<podgroup-name>": { lookup: "kubectl get podgroup -l app.kubernetes.io/part-of=volcano-demo -o jsonpath={.items[0].metadata.name}" },
};
const LWS_PODGROUP = {
  "<podgroup-name>": {
    lookup: "kubectl get podgroup -l leaderworkerset.sigs.k8s.io/name=lws-volcano,leaderworkerset.sigs.k8s.io/group-index=0 -o jsonpath={.items[0].metadata.name}",
  },
};

// Rules match a command by its start. `timeoutSeconds` overrides the poll limit (300 s by default). `sameNode` requires
// every matched pod row to share one NODE. `regex` replaces the expected output with a contains check, polled for `retrySeconds`.
const LWS_CONTROLLER_LOG = { match: "kubectl -n lws-system logs", regex: /"provider": ?"volcano"/, retrySeconds: 60 };
const RAYJOB_PODS = { match: "kubectl get pod", timeoutSeconds: 900 };
const TOPOLOGY_PODS = { match: "kubectl get pods -o wide -l ray.io/cluster=topology-demo", sameNode: true };

// Prose-only instructions that the runner carries out. `before` is the command the hook runs in front of, and `covers`
// is the exact guide sentence it implements (test E6 checks that the sentence is in the guide).
const TOPOLOGY_PLUGIN_HOOK = {
  name: "enable-network-topology-aware",
  before: "kubectl -n volcano-system rollout restart deploy volcano-scheduler",
  covers: "Add `- name: network-topology-aware` to the plugins of the second tier in `volcano-scheduler-configmap` in the `volcano-system` namespace, then restart `volcano-scheduler`:",
};

export const PLANS = {
  "grove-fresh": {
    guide: "GroveOnVolcano.md",
    setup: [],
    images: ["busybox:1.36"],
    sections: ["Enable the Volcano backend", "Enable the Volcano backend/New installation", "Two-role example"],
    placeholders: GROVE_PODGROUP,
    rules: [],
    hooks: [],
  },
  "grove-existing": {
    guide: "GroveOnVolcano.md",
    setup: ["helm upgrade -i grove oci://ghcr.io/ai-dynamo/grove/grove-charts --version v0.2.0-beta1 --wait --timeout 5m"],
    images: ["busybox:1.36"],
    sections: ["Enable the Volcano backend", "Enable the Volcano backend/Existing installation", "Two-role example"],
    placeholders: { ...GROVE_PODGROUP, "<release-name>": "grove", "<release-namespace>": "default" },
    rules: [],
    hooks: [],
  },
  "lws-fresh": {
    guide: "LeaderWorkerSetOnVolcano.md",
    setup: [],
    images: ["busybox:1.36"],
    sections: [
      "Enable the Volcano provider/New installation",
      "Enable the Volcano provider/Check the controller",
      "Example: two replicas of size 2",
    ],
    placeholders: LWS_PODGROUP,
    rules: [LWS_CONTROLLER_LOG],
    hooks: [],
  },
  "lws-existing": {
    guide: "LeaderWorkerSetOnVolcano.md",
    setup: ["helm install lws oci://registry.k8s.io/lws/charts/lws --version=1.0.0 --namespace lws-system --create-namespace --wait --timeout 300s"],
    images: ["busybox:1.36"],
    sections: [
      "Enable the Volcano provider/Existing installation",
      "Enable the Volcano provider/Check the controller",
      "Example: two replicas of size 2",
    ],
    placeholders: LWS_PODGROUP,
    rules: [LWS_CONTROLLER_LOG],
    hooks: [],
  },
  "kuberay-raycluster": {
    guide: "RayOnVolcano.md",
    setup: [],
    images: [RAY_IMAGE],
    sections: [SETUP, `${SETUP}/New installation`, `${K}/Example Deployments/RayCluster Example`],
    placeholders: {},
    rules: [],
    hooks: [],
  },
  "kuberay-rayjob": {
    guide: "RayOnVolcano.md",
    setup: [],
    images: [RAY_IMAGE],
    sections: [SETUP, `${SETUP}/New installation`, `${K}/Example Deployments/RayJob Example`],
    placeholders: {},
    rules: [RAYJOB_PODS],
    hooks: [],
  },
  "kuberay-topology": {
    guide: "RayOnVolcano.md",
    setup: [],
    images: [RAY_IMAGE],
    sections: [SETUP, `${SETUP}/New installation`, `${K}/Example Deployments/Topology-Aware Example`],
    placeholders: { "<node-1>": "guides-worker", "<node-2>": "guides-worker2" },
    rules: [TOPOLOGY_PODS],
    hooks: [TOPOLOGY_PLUGIN_HOOK],
  },
  "kuberay-existing": {
    guide: "RayOnVolcano.md",
    setup: [
      "helm repo add kuberay https://ray-project.github.io/kuberay-helm/",
      "helm repo update",
      "helm install kuberay-operator kuberay/kuberay-operator --version 1.7.2 --wait",
    ],
    images: [RAY_IMAGE],
    sections: [SETUP, `${SETUP}/Existing installation`, `${K}/Example Deployments/RayCluster Example`],
    placeholders: {},
    rules: [],
    hooks: [],
  },
};
