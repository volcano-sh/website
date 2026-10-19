---
title: "Volcano v1.16 Released: NamespaceQueue, fairshare, and a Broader HyperNode Ecosystem"
description: "Namespace-local queue hierarchies, historical usage fairness, broader HyperNode integration with other schedulers, and scheduling performance improvements in Volcano v1.16.0."
authors: ["volcano"]
date: 2026-10-14
tags: ["release", "volcano", "kubernetes", "scheduling"]
---

# Volcano v1.16 Released: NamespaceQueue, fairshare, and a Broader HyperNode Ecosystem

Volcano v1.16.0 introduces NamespaceQueue and the fairshare plugin. Tenants can use hierarchical queues within their own namespaces to organize quotas and queue hierarchies within administrator-authorized resource pools. Fairshare brings historical resource consumption into scheduling decisions among namespaces sharing a queue, improving fairness across teams.

This release also expands the HyperNode ecosystem. Platforms using other schedulers can deploy the HyperNode controller on its own to discover topology and manage supernodes and their hierarchy, then integrate that information through the HyperNode API. For inference services using Volcano, new PodGroup topology anti-affinity rules can spread instances across supernodes to reduce exposure to a shared failure domain.

Scheduler performance improvements include an Unschedulable Job Cache that records why Jobs could not be scheduled and skips repeated checks until blocking conditions change. Node scoring, cache updates, and queue lookups also become more efficient. The release additionally brings Kubernetes 1.36 support, load estimation for bulk Pod dispatch, DRA scoring, and accelerator and stability improvements.

<!-- truncate -->

## Highlights

- **Scheduler Performance and Scalability**: An unschedulable Job cache reduces backlog retries, alongside improvements to node scoring, cache updates, and queue lookups.
- **Namespace-local Queue Hierarchies**: Tenants can manage hierarchical queues, quotas, and resource sharing within their namespaces and administrator-authorized resource pools.
- **Long-Term Fairness with fairshare**: Slurm-inspired usage decay improves fairness for tenants isolated by namespace and sharing a queue.
- **PodGroup Topology Anti-Affinity**: Required and preferred rules separate workload instances across HyperNode domains.
- **A Broader HyperNode Ecosystem**: Other schedulers can reuse topology discovery and supernode management without running the other Volcano components.

## Key Features

### 1. Scheduler Performance and Scalability

v1.16.0 introduces the Unschedulable Job Cache to improve scheduling under large pending backlogs, alongside improvements to node scoring, cache updates, and queue lookups.

**Unschedulable Job Cache**

A Job may remain Pending because its queue is full, the cluster lacks suitable resources, or no node satisfies its placement constraints. Repeating the same scheduling checks in every session adds work without changing that outcome. With a large backlog, these retries also compete with newly submitted Jobs that could run.

The new `UnschedulableJobCache` records why a Job could not be scheduled. Plugins provide event hints that identify changes which could make the Job schedulable. Subsequent sessions skip the checks covered by the cached result until a relevant change requests a retry. This reduces redundant work and improves scheduling performance in clusters with persistent unschedulable backlogs.

**Key capabilities**:

- **Selective skipping**: Uses rejection causes to skip enqueue checks, whole-Job evaluation, or checks for particular tasks while respecting gang requirements.
- **Event-driven wakeups**: A Node label update can wake a Job blocked by node affinity. Resource release or a Queue change can wake Jobs blocked by resources or quota. Storage and DRA events are also supported through plugin hints.
- **Safe fallback**: A Job is cached only when every rejecting plugin provides a safe hint. Other Jobs continue through normal per-session evaluation.
- **Preserved scheduling semantics**: Cached Jobs remain visible to pending demand, queue accounting, and gang requirements. Normal checks run again before placement after a wakeup.
- **Bounded retries**: A watchdog retries cached Jobs after a configurable maximum skip duration, defaulting to five minutes. The in-memory cache is cleared on scheduler restart.

The feature is disabled by default. Enable it with the scheduler feature gate:

```bash
helm upgrade --install volcano volcano-sh/volcano \
  --namespace volcano-system --create-namespace --version 1.16.0 \
  --set custom.scheduler_feature_gates="UnschedulableJobCache=true"
```

Initial coverage includes the upstream predicates integrated by Volcano, native Resource Fit, proportion, and non-hierarchical capacity. Hierarchical capacity rejections and rejections from plugins without hint providers continue to be evaluated each session. Optional per-Job debug metrics report skips, wakeups, and watchdog expirations.

Related:

- PRs: [#5848](https://github.com/volcano-sh/volcano/pull/5848), [#5644](https://github.com/volcano-sh/volcano/pull/5644)
- Design and performance results: [Unschedulable Job Cache](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/design/unschedulable-job-cache.md)
- User guide: [Enable the Unschedulable Job Cache](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/user-guide/how_to_enable_unschedulable_job_cache.md)
- Contributor: \@[JesseStutler](https://github.com/JesseStutler)

Multiple scoring plugins can now score nodes in a shared traversal, reducing scoring overhead when several plugins are active. Node updates and queue lookups also avoid unnecessary object copying and traversal. ([#5928](https://github.com/volcano-sh/volcano/pull/5928), [#5556](https://github.com/volcano-sh/volcano/pull/5556), [#5506](https://github.com/volcano-sh/volcano/pull/5506))

Volcano will continue to improve performance and scalability. Future work will explore scheduling efficiency, cache and event processing, and status updates, guided by workload benchmarks and production feedback.

---

### 2. NamespaceQueue Brings Queue Hierarchies to Namespaces

Platforms use different tenancy models. Some assign resource pools to tenants through cluster-scoped Queues. Others use namespaces as the management boundary for teams or projects and want tenants to configure queue quotas and hierarchies within that boundary. NamespaceQueue supports this namespace-based model, aligning queue management with tenant ownership.

`NamespaceQueue` introduces a namespaced resource with the same resource-governance concepts as Queue, including `capability`, `deserved`, `guarantee`, and `reclaimable`. Administrators authorize a namespace to attach its queue hierarchy to a cluster Queue through `spec.allowedNamespaces`. Tenants can then manage their own hierarchy within that boundary.

This separates resource-pool authorization from day-to-day tenant queue management. Different namespaces can use the same queue names without sharing queue identity.

The feature is disabled by default. The Helm switch enables the participating controller, scheduler, and admission components and selects hierarchical capacity when using the chart's default scheduler configuration:

```bash
helm upgrade --install volcano volcano-sh/volcano \
  --namespace volcano-system --create-namespace --version 1.16.0 \
  --set custom.namespace_queue_enable=true
```

Create the namespace and authorized parent Queue, then the tenant queue:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-a
---
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: research
spec:
  capability:
    cpu: "100"
    memory: "200Gi"
  deserved:
    cpu: "100"
    memory: "200Gi"
  allowedNamespaces:
  - team-a
---
apiVersion: scheduling.volcano.sh/v1beta1
kind: NamespaceQueue
metadata:
  name: training
  namespace: team-a
spec:
  parent: cluster/research
  capability:
    cpu: "40"
    memory: "80Gi"
  deserved:
    cpu: "40"
    memory: "80Gi"
  reclaimable: true
```

Grant tenant RBAC permissions for `namespacequeues` in the tenant's namespace. After the NamespaceQueue reports `Ready=True` and `Authorized=True`, Jobs and PodGroups in `team-a` can reference it with:

```yaml
spec:
  queue: namespace/training
```

Bare names still reference cluster Queues. `cluster/<name>` identifies a cluster Queue parent, while an unprefixed parent name identifies a NamespaceQueue in the same namespace. Initial scheduling support uses hierarchical capacity. Do not enable proportion alongside it.

Related:

- PRs: [#5590](https://github.com/volcano-sh/volcano/pull/5590), [#5629](https://github.com/volcano-sh/volcano/pull/5629)
- User guide: [NamespaceQueue](https://volcano.sh/docs/UserGuide/user_guide_how_to_use_namespace_queue)
- Design: [Namespace-scoped Queues](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/design/namespace-queue.md)
- Contributor: \@[gitGurugu](https://github.com/gitGurugu)

---

### 3. fairshare Improves Long-Term Tenant Fairness

Volcano traditionally organizes resource sharing and quota governance around cluster-scoped Queues, which fits deployments that assign a dedicated queue to each tenant. Other platforms use namespaces as the isolation boundary for teams or projects, with multiple tenants submitting into one Queue. These deployments need fairness within that shared queue as well as fairness across queues.

Current-allocation snapshots alone do not capture resource consumption over time. If a namespace keeps submitting GPU jobs, each completed job may be replaced by another from the same namespace. A tenant arriving later can wait even though the earlier tenant has already consumed substantial compute time.

Inspired by Slurm fair-share scheduling, the new `fairshare` plugin identifies tenants by namespace and tracks cumulative resource-seconds for each namespace within a queue. Consumption decays exponentially, with a configurable half-life that defaults to four hours. Namespaces with lower historical consumption receive earlier consideration, while old usage gradually loses influence.

Fairshare complements DRF's current-resource fairness. It influences pending-job ordering and can optionally gate enqueue admission. It does not preempt jobs that are already running. Operators can choose target queues and resource types and optionally persist usage state to a ConfigMap across scheduler restarts.

Example scheduler configuration:

```yaml
actions: "enqueue, allocate, backfill"
tiers:
- plugins:
  - name: priority
  - name: gang
  - name: conformance
  - name: fairshare
    arguments:
      fairshare.targetQueues: "gpu-queue"
      fairshare.resourceKey: "nvidia.com/gpu"
      fairshare.halfLifeMinutes: "240"
      fairshare.enableEnqueueGate: "false"
      fairshare.persistState: "false"
- plugins:
  - name: drf
  - name: capacity
  - name: predicates
  - name: nodeorder
```

Put `fairshare` before `drf` so historical usage can influence comparisons before DRF decides them. Keep `priority` first when PriorityClass should take precedence. State persistence and enqueue gating are disabled by default.

Related:

- Feature PR: [#5161](https://github.com/volcano-sh/volcano/pull/5161)
- Design: [Fair Share Scheduling](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/design/fairshare.md)
- User guide: [Fairshare Plugin](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/user-guide/how_to_use_fairshare_plugin.md)
- Feature contributor: \@[dmildh-absci](https://github.com/dmildh-absci)

---

### 4. PodGroup Topology Anti-Affinity

Keeping each workload instance within one topology domain does not ensure that different instances use separate domains. For example, multiple inference replicas can each satisfy their own network locality constraints but still land in the same supernode. A failure in that domain could affect all instances.

The `group-topology-affinity` plugin adds required and preferred PodGroup anti-affinity across HyperNode domains. Rules select peer PodGroups by their labels and can optionally select namespaces. They compose with `networkTopology`, allowing each group to stay together while different groups use separate domains.

Add these entries to the existing scheduler plugin list, retaining its other actions and plugins:

```yaml
- name: group-topology-affinity
  arguments:
    weight: 10
- name: network-topology-aware
  arguments:
    weight: 10
```

With a HyperNode tree containing the `supernode` tier, configure each participating PodGroup as follows, changing the name for each instance:

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: PodGroup
metadata:
  name: inference-a
  namespace: default
  labels:
    app: model-a
spec:
  minMember: 2
  queue: default
  networkTopology:
    mode: hard
    highestTierName: supernode
  topologyAffinity:
    podGroupAntiAffinity:
      required:
      - podGroupSelector:
          matchLabels:
            app: model-a
        topologyTierName: supernode
```

Member Pods must use `schedulerName: volcano` and the `scheduling.k8s.io/group-name` annotation. Rules match PodGroup labels, not Pod labels. A term specifies either `topologyTierName` or `topologyTier`. Preferred rules additionally use a weight from 1 to 100.

Enforcement applies to `allocate`. BestEffort Pods placed through backfill do not receive this isolation guarantee. SubGroup affinity and anti-affinity, cross-PodGroup affinity, and automatic relocation of running Pods are outside the implemented scope.

Related:

- PR: [#5349](https://github.com/volcano-sh/volcano/pull/5349)
- Design: [PodGroup Topology Affinity](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/design/group-topology-affinity.md)
- User guide: [PodGroup Anti-Affinity](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/user-guide/how_to_use_podgroup_anti_affinity.md)
- Contributor: \@[wangyang0616](https://github.com/wangyang0616)

---

### 5. Expanding the HyperNode Ecosystem to More Schedulers

Platforms using other schedulers also need to discover cluster topology and manage supernodes and their hierarchy. Previously, reusing HyperNode required running Volcano's aggregate controller manager. v1.16.0 makes the HyperNode controller independently deployable, opening its topology discovery and management capabilities to more scheduling systems.

Platforms can deploy just this controller and reuse existing discovery methods, including UFM and node labels. The controller creates and updates HyperNode resources and maintains the supernode hierarchy. Other schedulers can read this information through the HyperNode API and implement topology-aware placement for their workloads, without running the Volcano scheduler or its other controllers.

Standalone and integrated deployments share the discovery and reconciliation implementation, allowing future discovery methods to serve both modes. Scheduling systems can share these capabilities and contribute improvements to a common implementation.

The release provides a dedicated `vc-hypernode-controller-manager` binary, image, and Helm Deployment. The chart supports `controller-manager`, `standalone`, and `disabled` modes, with integrated controller-manager mode retained as the default. To install only the HyperNode controller:

```bash
helm upgrade --install volcano volcano-sh/volcano \
  --namespace volcano-system --create-namespace --version 1.16.0 \
  --set custom.hypernode_controller_mode=standalone \
  --set custom.controller_enable=false \
  --set custom.scheduler_enable=false \
  --set custom.admission_enable=false
```

Discovery continues to use `custom.controller_config_override`. To retain the other Volcano components, change only the HyperNode mode. When migrating an existing deployment, first select `disabled` and wait for the controller-manager rollout before enabling `standalone`, ensuring a single reconciliation owner.

Related:

- PRs: [#5137](https://github.com/volcano-sh/volcano/pull/5137), [#5136](https://github.com/volcano-sh/volcano/pull/5136)
- Design: [Standalone HyperNode Controller](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/design/hypernode-controller-standalone.md)
- User guide: [Install the Standalone HyperNode Controller](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/user-guide/how_to_install_standalone_hypernode_controller.md)
- Discovery configuration: [HyperNode Auto Discovery](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/user-guide/how_to_use_hypernode_auto_discovery.md)
- Contributor: \@[wangyang0616](https://github.com/wangyang0616)

---

## Other Notable Enhancements

### Load-Aware Scheduling for Bulk Pod Dispatch

Monitoring data can lag behind placement. During a large scheduling burst, recently assigned Pods may not appear in the metrics yet, so a node can look less loaded than it really is.

The `usage` plugin now maintains a session-level shadow load cache for assigned Pods whose usage is not yet visible. Scoring combines measured usage with CPU and memory estimates. Each estimate is recorded so rollback removes the same amount, avoiding accounting drift.

Add or update this entry in the existing scheduler configuration and retain the metrics source configuration:

```yaml
- name: usage
  enablePredicate: false
  arguments:
    usage.weight: 5
    cpu.weight: 1
    memory.weight: 1
    estimator:
      request_ratio: 0.7
      burst_ratio: 0
      risk_threshold: 0.6
      risk_factor: 1.2
      be_cpu: 250m
      be_mem: 200Mi
```

The estimator uses request and burst ratios, a risk multiplier, and fixed BestEffort estimates. `metrics.interval` defines the monitoring delay window and defaults to 30 seconds.

Related: [PR #5314](https://github.com/volcano-sh/volcano/pull/5314), [Usage-Based Scheduling](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/design/usage-based-scheduling.md), \@[3th4novo](https://github.com/3th4novo).

### Queue Resource Limits per Nodegroup

The NodeGroup plugin adds a Queue annotation to cap resource consumption within each nodegroup. A queue can use its preferred fixed-capacity pool up to the configured limit, then place work in another permitted pool.

```yaml
metadata:
  annotations:
    volcano.sh/nodegroup-resource-limits: |
      {"fixed": {"cpu": "100", "memory": "200Gi"}, "overflow": {"cpu": "50"}}
```

Only listed resource dimensions are limited. These limits are not inherited by child queues, so each queue that needs them must configure its own annotation.

Related: [PR #5461](https://github.com/volcano-sh/volcano/pull/5461), [NodeGroup User Guide](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/user-guide/how_to_use_nodegroup_plugin.md), \@[ruanwenjun](https://github.com/ruanwenjun).

### More Accurate NUMA Resource Accounting

Node-level NUMA totals cannot always distinguish released resources from new placements awaiting allocation. When a Pod releases CPUs while other Pods have been scheduled but are still awaiting kubelet allocation, changes in aggregate availability can distort the scheduler's resource view and cause false NUMA policy failures.

Numatopology adds `spec.podAllocations` with Pod UID, name, namespace, and per-container resource allocations, using cpuset strings for CPUs. The scheduler combines actual Pod-level allocations with tracking of placements still awaiting allocation to update its NUMA resource view more accurately. These details also help operators inspect container CPU placement and resource usage. A resource-exporter supporting the new field is required. ([#5467](https://github.com/volcano-sh/volcano/pull/5467), [#5504](https://github.com/volcano-sh/volcano/pull/5504))

### DRA and Accelerator Enhancements

- **DRA scoring**: Applies upstream DynamicResources scoring and plugin-owned normalization to prioritized device requests. ([#5728](https://github.com/volcano-sh/volcano/pull/5728))
- **HAMi Ascend soft partitioning**: Integrates `hami-vnpu-core` for memory virtualization and compute time slicing, with matching device-plugin and runtime requirements. See the [vNPU guide](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/user-guide/how_to_use_vnpu.md) for setup. ([#5462](https://github.com/volcano-sh/volcano/pull/5462), [#5722](https://github.com/volcano-sh/volcano/pull/5722))
- **Ascend health checks**: Uses allocatable device information to check vNPU health. ([#5418](https://github.com/volcano-sh/volcano/pull/5418))
- **vGPU selection and correctness**: Adds GPU UUID allowlist/denylist annotations and fixes allocation metadata consistency across binding and rollback. ([#5726](https://github.com/volcano-sh/volcano/pull/5726), [#5588](https://github.com/volcano-sh/volcano/pull/5588))

### HyperNode Discovery and Placement Consistency

- **Topology updates and discovery**: Corrects HyperNode topology rebuilds, avoids duplicate HyperNodes when informer data is stale, and returns errors rather than panicking when a UFM endpoint is missing or has the wrong type. ([#5076](https://github.com/volcano-sh/volcano/pull/5076), [#5894](https://github.com/volcano-sh/volcano/pull/5894), [#6057](https://github.com/volcano-sh/volcano/pull/6057))
- **Placement after preemption and reclaim**: Persists and prioritizes SubJob HyperNode nominations across scheduling cycles and honors them even without hard topology constraints. This helps subsequent placement use the capacity freed by Gang preemption or reclaim as intended. ([#5440](https://github.com/volcano-sh/volcano/pull/5440), [#5476](https://github.com/volcano-sh/volcano/pull/5476))

### Grove and KubeRay Adopt Multi-Level Gang Scheduling

Grove and KubeRay have integrated Volcano's multi-level gang scheduling to support finer-grained scheduling requirements for workload roles and replicas.

- **Grove**: Its merged Volcano scheduler backend maps workload roles to SubGroups within a PodGroup, supporting role-level gang constraints. ([PR #516](https://github.com/ai-dynamo/grove/pull/516))
- **KubeRay**: Merged support translates Ray worker group replica settings into `SubGroupPolicy`, allowing gang constraints to require complete replicas, including multi-host replicas. ([PR #5249](https://github.com/ray-project/kuberay/pull/5249))

Both integrations currently cover subgroup-level gang constraints. SubGroup-level network topology-aware scheduling is not yet integrated in either project.

Note: Multi-level gang scheduling has been supported since Volcano v1.14 and is not exclusive to v1.16.

### Kubernetes Compatibility and Operations

v1.16.0 supports Kubernetes 1.36 and builds against Kubernetes 1.36.1 with Go 1.26. It adopts upstream VolumeBinding, refreshes generated clients and RBAC, and updates installation and CI integration. ([#5287](https://github.com/volcano-sh/volcano/pull/5287))

Operators can configure job and task updater worker counts and observe queue workload states and committed eviction transactions. The Volcano agent also supports pod-level resource settings and effective requests that include native sidecars and Pod overhead. ([#5873](https://github.com/volcano-sh/volcano/pull/5873), [#5826](https://github.com/volcano-sh/volcano/pull/5826), [#5754](https://github.com/volcano-sh/volcano/pull/5754), [#5656](https://github.com/volcano-sh/volcano/pull/5656), [#5822](https://github.com/volcano-sh/volcano/pull/5822))

New inqueue resource metrics expose CPU, memory, and scalar resources reserved by admitted workloads that are not running yet, helping operators diagnose queue quota pressure. ([#5243](https://github.com/volcano-sh/volcano/pull/5243))

### Stability and Correctness

- Fixes phantom inqueue reservations and ancestor accounting for scheduling-gate reservations. ([#5339](https://github.com/volcano-sh/volcano/pull/5339), [#6047](https://github.com/volcano-sh/volcano/pull/6047))
- Preserves Completed PodGroup state after Pods are removed and avoids returning terminating workloads to Inqueue. ([#5996](https://github.com/volcano-sh/volcano/pull/5996), [#5796](https://github.com/volcano-sh/volcano/pull/5796))
- Recovers from PVC informer races and prevents stale PodGroup annotations from being applied to recreated Pods. ([#5596](https://github.com/volcano-sh/volcano/pull/5596), [#5344](https://github.com/volcano-sh/volcano/pull/5344))
- Fixes Agent Scheduler early-exit queue handling and placeholder-node snapshot panics. ([#5560](https://github.com/volcano-sh/volcano/pull/5560), [#5927](https://github.com/volcano-sh/volcano/pull/5927))
- Rechecks device feasibility before committing reclaim decisions, avoiding decisions that cannot satisfy device requirements. ([#5855](https://github.com/volcano-sh/volcano/pull/5855))
- Corrects node-scoring and PreFilter plugin integration so batch precomputation and filter-skip results take effect as intended. ([#5497](https://github.com/volcano-sh/volcano/pull/5497), [#5505](https://github.com/volcano-sh/volcano/pull/5505), [#5542](https://github.com/volcano-sh/volcano/pull/5542))

### Security Fix

v1.16.0 includes the fix for [GHSA-j38h-7pfq-cxmw](https://github.com/volcano-sh/volcano/security/advisories/GHSA-j38h-7pfq-cxmw), a denial-of-scheduling-service vulnerability in DRA capacity accounting. Tenant-controlled counts could cause excessive iteration while the scheduler cache lock was held, exhausting CPU time and blocking scheduling across namespaces.

The ResourceClaim-triggered path requires DRA support, explicit enablement of `DRAConsumableCapacity`, a capacity-bearing `ExactCount` request, and permission to create the associated ResourceClaim and Pod. The fix replaces count-proportional aggregation with constant-time quantity multiplication and hardens count validation and arithmetic.

The advisory identifies v1.15.0 and v1.15.1 as affected. The fix was first released in v1.15.2 and is included in v1.16.0. Severity is **Medium, CVSS 6.5**. Users on affected versions should upgrade. Reported and fixed by \@[thc1006](https://github.com/thc1006), with advisory coordination by \@[JesseStutler](https://github.com/JesseStutler).

---

## Upgrade Notes

Upgrade to v1.16.0 through Helm or the release manifest:

```bash
helm repo add volcano-sh https://volcano-sh.github.io/helm-charts
helm repo update
helm upgrade volcano volcano-sh/volcano \
  --namespace volcano-system --version 1.16.0
```

```bash
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/v1.16.0/installer/volcano-development.yaml
```

- Update CRDs and RBAC with the components before using NamespaceQueue or the new PodGroup and Numatopology fields.
- NamespaceQueue and UnschedulableJobCache are disabled by default. NamespaceQueue requires hierarchical capacity, whose rejections are not cached by this cache version.
- Review fairshare plugin order and topology anti-affinity enforcement scope before enabling them.
- Rebuild custom topology plugins for `HyperNodeGradientResult` and review the Kubernetes 1.36 integration changes. Source builds require Go 1.26.
- When moving HyperNode reconciliation to the standalone controller, roll out `disabled` mode before `standalone`.
- The existing Volcano CRDs receive retention annotations for Helm uninstall. The new NamespaceQueue CRD does not carry that annotation in this version. Review retention and ownership before reinstalling.

## References

This post introduces the main capabilities in v1.16.0. The release note contains the complete API changes, bug fixes, dependency updates, and maintenance items.

- [Release Note](https://github.com/volcano-sh/volcano/releases/tag/v1.16.0)
- [Full Changelog](https://github.com/volcano-sh/volcano/compare/v1.15.0...v1.16.0)

## Acknowledgements

Volcano v1.16 had 65 contributors. Sincere thanks to everyone who contributed features, fixes, testing, documentation, and reviews. Your efforts continue to improve Volcano's scheduling capabilities and stability! Authors of merged PRs in this release include:

| | | | | |
| --- | --- | --- | --- | --- |
| \@106umao | \@3th4novo | \@A69SHUBHAM | \@aeron-gh | \@agrawalcodes |
| \@Aliexe-code | \@Aman-Cool | \@anxkhn | \@archlitchi | \@autsu |
| \@avinxshKD | \@bhuvan-somisetty | \@CapThunder19 | \@choosen23 | \@copilot-swe-agent |
| \@DarkestSky | \@dependabot | \@devzizu | \@dmildh-absci | \@DSFans2014 |
| \@FAUST-BENCHOU | \@gitGurugu | \@goyalankit | \@gucardona | \@hajnalmt |
| \@halcyon-r | \@harshrajdebug | \@hzxuzhonghu | \@iamtanishqjain | \@JesseStutler |
| \@kitianFresh | \@kryz73 | \@kube-gopher | \@kubeboiii | \@linuxfhy |
| \@magic-peach | \@miantalha45 | \@moezdil | \@netliomax25-code | \@omlahore |
| \@OneSizeFitsQuorum | \@PrasannaMishra001 | \@Psykii22 | \@r0hansaxena | \@ranxi2001 |
| \@ruanwenjun | \@safiya2610 | \@shettythrishal328-dev | \@shivansh-gohem | \@songmingming0827 |
| \@SquareCatFirst | \@t2wang | \@Tau721 | \@thc1006 | \@togettoyou |
| \@vanshika2720 | \@vivek41-glitch | \@vzhou-p | \@wangyang0616 | \@WHOIM1205 |
| \@xiezhayang | \@xuezhaojun | \@yash-pokhriyal | \@YiD11 | \@yuanhuaiwang |
