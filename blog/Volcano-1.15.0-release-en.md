---
title: "Volcano v1.15 Released: Gang-Granularity Preemption, DRA Queue Quota, and More Scheduling Enhancements"
description: "New Features: Gang-Aware Preemption and Resource Reclamation, DRA Queue Quota in Capacity Plugin, Pluggable Multi-Sharding Policies, Volcano Benchmark and Performance Observability, Scheduling Gates for Queue Admission, Kubernetes 1.35 support, and more"
authors: ["volcano"]
date: 2026-05-30
tags:
  [
    "release",
    "volcano",
    "kubernetes",
    "scheduling",
    "preemption",
    "dra",
    "benchmark",
  ]
---

# Volcano v1.15 Released: Gang-Granularity Preemption, DRA Queue Quota, and More Scheduling Enhancements

As batch training, inference, AI Agent, HPC, big-data and other diverse workloads are increasingly co-located in the same Kubernetes cluster, the scheduler must make higher-quality decisions under intensifying resource contention while preserving job-level semantics, queue fairness, topology affinity, and operational stability. v1.15.0 delivers enhancements across the scheduling core, heterogeneous resource management, multi-scheduler coordination, and performance observability.

The most notable new capability is **Gang-Aware Preemption and Resource Reclamation**: preemption decisions are evaluated at gang granularity on both the preemptor and victim sides — the preemptor is placed as a whole gang, and victim candidates are organized and evaluated at job/gang granularity, preferring surplus replicas to avoid per-Pod random eviction that disrupts multiple training jobs while the preemptor itself still cannot start. In addition, v1.15.0 introduces DRA queue quota in the capacity plugin, a pluggable multi-sharding policy framework, a Benchmark and performance observability tool, Kubernetes 1.35 support, NodeGroup preferred ordering, Agent Scheduler stability fixes, GPU/vGPU incremental enhancements, and Scheduling Gates for queue admission control.

<!-- truncate -->

## Highlights

This release focuses on the following directions:

- **Gang-Aware Preemption and Resource Reclamation**: Organizes victim candidates at job/gang granularity, distinguishes surplus replicas from critical replicas, preferentially evicts surplus replicas to reduce task disruption, and simulates whole-gang placement before committing evictions to confirm the preemptor can actually start — avoiding the situation where per-Pod preemption disrupts multiple training jobs while the preemptor itself still cannot run.
- **DRA Queue Quota**: The capacity plugin brings DRA `ResourceClaim` into Volcano's existing queue capacity model, enabling DRA device resources to be managed through queue quota.
- **Pluggable Multi-Sharding Policy**: Sharding Controller supports composing multiple sharding policies via ConfigMap, with runtime hot-reload.
- **Volcano Benchmark Framework**: Provides one-click performance test environment setup and report output, supporting Kind/KWOK and existing clusters.
- **Scheduling Gates for Queue Admission**: Distinguishes "queue quota insufficient" from "cluster resources insufficient", preventing autoscalers from triggering unnecessary scale-ups due to queue limits.

In addition, v1.15.0 includes Kubernetes 1.35 support, NodeGroup preferred ordering, Agent Scheduler stability enhancements, GPU/vGPU incremental enhancements, and security fixes. These are briefly covered later in this post and are equally important for production readiness and ecosystem compatibility.

## Release Highlights

The v1.15.0 release includes the following major updates:

**Scheduling and Preemption Enhancements**

- [Gang-Aware Preemption and Resource Reclamation (Alpha)](#1-gang-aware-preemption-and-resource-reclamation-alpha)
- [NodeGroup Preferred Ordering for Queues](#nodegroup-preferred-ordering)
- [Capacity Ancestor Reclaim Level](#capacity-ancestor-reclaim-level)

**Resource Management and Scheduling Enhancements**

- [DRA Queue Quota in Capacity Plugin](#2-dra-queue-quota)
- [Pluggable Multi-Sharding Policy Support (Alpha)](#3-pluggable-multi-sharding-policy-alpha)
- [GPU and vGPU Incremental Improvements](#gpuvgpu-incremental-enhancements)
- [Pod-Level Resource Request and Limit Settings](#pod-level-resource-request-and-limit-settings)

**Performance and Observability Enhancements**

- [Volcano Benchmark and Performance Observability](#4-volcano-benchmark-framework)
- [Scheduling Gates for Queue Admission (Alpha)](#5-scheduling-gates-for-queue-admission-alpha)

**Security and Stability**

- [Webhook Request Body Size Mitigation for CVE-2026-44247](#security-fix)
- [Core Scheduler Stability and Correctness Improvements](#core-scheduler-stability-and-correctness)

---

## Key Features

### 1. Gang-Aware Preemption and Resource Reclamation (Alpha)

In distributed workloads such as large model training and HPC, a Job typically requires multiple Pods running simultaneously to be meaningful. If preemption decisions are made at the individual Pod level, the scheduler may evict one Pod from each of several running training jobs — on the surface this frees resources, but in reality it breaks multiple jobs, and the preemptor gang may still not be able to gather enough `minAvailable` Pods to start successfully.

v1.15.0 introduces Gang-Aware Preemption and Resource Reclamation, making both the preemptor and victim sides evaluate at gang granularity, avoiding the scenario where "a bunch of Pods are freed but nobody can run."

**On the victim side**, Volcano organizes preemption candidates at job/gang granularity rather than treating all Pods as interchangeable victims. Each candidate job's Pods are classified into surplus replicas (those above `minAvailable`) and critical replicas. The scheduler preferentially selects surplus replicas — evicting them does not break the victim job — and avoids touching critical replicas as much as possible. This is fundamentally different from the legacy per-Pod selection approach that does not account for disruption cost.

**On the preemptor side**, the scheduler incrementally accumulates reclaimable resources. Once the accumulated amount is sufficient to cover the preemptor gang's total requirement, it first performs a placement simulation — verifying on the projected resource view that the preemptor gang can be scheduled as a whole — and only commits evictions after the simulation passes. This prevents the situation where "Pods are preempted but the preemptor still cannot start."

Regardless of whether HyperNode topology is enabled, this mechanism reduces task disruption from random preemption. When HyperNode topology is enabled, Volcano additionally constrains victim search to the selected topology scope, preventing cross-topology-domain preemption.

This feature is currently Alpha and requires explicitly configuring the two new actions `gangPreempt` and `gangReclaim`. Future versions will continue evaluating whether to merge the Gang-Aware eviction mechanism with the legacy `preempt` and `reclaim` actions.

Configuration:

```yaml
actions: "enqueue, allocate, backfill, gangPreempt, gangReclaim"
tiers:
  - plugins:
      - name: priority
      - name: gang
      - name: drf
      - name: predicates
      - name: nodeorder
      - name: binpack
```

Related PRs: [volcano-sh#5250](https://github.com/volcano-sh/volcano/pull/5250), [volcano-sh#4780](https://github.com/volcano-sh/volcano/pull/4780), [volcano-sh#5170](https://github.com/volcano-sh/volcano/pull/5170)

Sincerely thanks to community developer: \@[vzhou-p](https://github.com/vzhou-p)

---

### 2. DRA Queue Quota

Kubernetes Dynamic Resource Allocation (DRA) provides a more flexible model for device resource requests. Previous Volcano versions already supported scheduling Pods that use DRA resources, but queue quota did not yet cover DRA `ResourceClaim`.

v1.15.0 closes this gap in the capacity plugin, bringing DRA resources into Volcano's existing queue quota system. Users can still use the `capability`, `deserved`, and `guarantee` capacity model to manage queue resources, with no need to maintain a separate quota API for DRA.

Two types of resource controls are currently supported:

- Whole-card/whole-device count quota based on `DeviceClass`
- Consumable-dimension quota such as virtual GPU cores or memory

When multiple Pods reference the same shared `ResourceClaim`, Volcano automatically deduplicates, preventing the same resource from being double-counted in queue usage.

This way, cluster administrators can use the same queue capacity model to uniformly manage CPU, memory, extended resources, and DRA device resources.

Configuration:

```yaml
tiers:
  - plugins:
      - name: capacity
        arguments:
          capacity.DynamicResourceAllocationEnable: true
          capacity.DRAConsumableCapacityEnable: true
```

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: ml-team
spec:
  capability:
    cpu: "100"
    memory: "200Gi"
    "deviceclass/gpu.nvidia.com": "8"
    "cores.deviceclass/hami-core-gpu.project-hami.io": "800"
    "memory.deviceclass/hami-core-gpu.project-hami.io": "320Gi"
```

Related PR: [volcano-sh#5058](https://github.com/volcano-sh/volcano/pull/5058)

Sincerely thanks to community developer: \@[xu-wentao](https://github.com/xu-wentao)

---

### 3. Pluggable Multi-Sharding Policy (Alpha)

In multi-scheduler architectures, different schedulers typically serve different workload types and have different requirements for candidate node scope. v1.15.0 enhances the Sharding Controller to support composing multiple sharding strategies through a pluggable policy pipeline.

Each scheduler shard can be configured with an ordered set of policies covering filter, score, and select phases. Built-in policies include:

- `allocation-rate`: Filters and scores nodes by resource utilization
- `warmup`: Prioritizes warmup nodes
- `node-limit`: Constrains the node count range per shard

Policies are configured via ConfigMap and support runtime hot-reload. If a new configuration fails validation, the system retains the previous valid configuration to avoid introducing risk from online changes.

This makes multi-scheduler node sharding more adaptable to different cluster sizes and workload profiles, and provides a clear interface for future sharding policy extensions.

Configuration:

```yaml
custom:
  sharding_configmap_enable: true
  sharding_configmap_data: |
    schedulerConfigs:
      - name: volcano
        type: volcano
        policies:
          - name: allocation-rate
            weight: 1
            arguments:
              minCPUUtil: 0.0
              maxCPUUtil: 0.6
          - name: node-limit
            arguments:
              minNodes: 1
              maxNodes: 100
      - name: agent-scheduler
        type: agent
        policies:
          - name: allocation-rate
            weight: 1
            arguments:
              minCPUUtil: 0.7
              maxCPUUtil: 1.0
          - name: warmup
            weight: 2
```

Related PRs: [volcano-sh#5098](https://github.com/volcano-sh/volcano/pull/5098), [volcano-sh#5132](https://github.com/volcano-sh/volcano/pull/5132), [volcano-sh#4990](https://github.com/volcano-sh/volcano/pull/4990)

Sincerely thanks to community developers: \@[lixmgl](https://github.com/lixmgl), \@[agrawalcodes](https://github.com/agrawalcodes)

---

### 4. Volcano Benchmark Framework

Scheduler performance optimization requires stable, reproducible baselines. v1.15.0 introduces a Benchmark framework that supports one-click environment deployment, standard scenario execution, and performance report output.

The framework supports two types of environments:

- Local Kind + KWOK environments for developers to quickly reproduce and analyze scheduling performance issues
- Existing Kubernetes clusters for users to evaluate Volcano's scheduling throughput and latency in real environments

Test scenarios cover VolcanoJob gang scheduling, bare Pod scheduling, KWOK topology labels, and HyperNode generation. Combined with scheduler/controller metrics, audit-exporter reports, and Grafana dashboards, this helps quickly pinpoint scheduling performance bottlenecks.

For users new to Volcano, the framework also makes it easy to run a round of tests on their own cluster and quickly understand actual scheduling throughput and latency characteristics.

Quick start:

```bash
cd benchmark
make setup VOLCANO_VERSION=v1.15.0
make test-gang-env JOBS=10 REPLICAS=100 MIN_AVAILABLE=100
make cleanup-all
```

Related PRs: [volcano-sh#5305](https://github.com/volcano-sh/volcano/pull/5305), [volcano-sh#5215](https://github.com/volcano-sh/volcano/pull/5215), [volcano-sh#5163](https://github.com/volcano-sh/volcano/pull/5163), [volcano-sh#5221](https://github.com/volcano-sh/volcano/pull/5221)

User Guide: [Benchmark README](https://github.com/volcano-sh/volcano/blob/master/benchmark/README.md)

Sincerely thanks to community developers: \@[JesseStutler](https://github.com/JesseStutler), \@[3th4novo](https://github.com/3th4novo)

---

### 5. Scheduling Gates for Queue Admission (Alpha)

When Pods cannot be scheduled due to insufficient queue capacity, Cluster Autoscaler or Karpenter may misidentify them as blocked by insufficient cluster resources, triggering unnecessary scale-ups.

v1.15.0 introduces Scheduling Gates for Queue Admission. Once enabled via annotation, when queue capacity is insufficient, Volcano uses Kubernetes native `schedulingGates` to hold the Pod out of scheduling, making it invisible to autoscalers and preventing scale-up. After the queue frees up capacity, Volcano removes the gate and the Pod resumes normal scheduling.

This effectively distinguishes "queue quota insufficient" from "cluster resources insufficient", preventing unnecessary scale-ups caused by queue quota limits.

This feature is currently Alpha and requires enabling `SchedulingGatesQueueAdmission` on both the scheduler and webhook-manager.

Configuration:

```bash
helm install volcano volcano/volcano --namespace volcano-system --create-namespace   --set custom.scheduler_feature_gates="SchedulingGatesQueueAdmission=true"   --set custom.admission_feature_gates="SchedulingGatesQueueAdmission=true"
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: queue-gated-pod
  annotations:
    scheduling.volcano.sh/queue-allocation-gate: "true"
spec:
  schedulerName: volcano
  containers:
    - name: worker
      image: nginx
```

Related Issue: [volcano-sh#4710](https://github.com/volcano-sh/volcano/issues/4710)

Related PRs: [volcano-sh#5033](https://github.com/volcano-sh/volcano/pull/5033), [volcano-sh#4727](https://github.com/volcano-sh/volcano/pull/4727)

Sincerely thanks to community developer: \@[devzizu](https://github.com/devzizu)

---

## Other Notable Enhancements

### Kubernetes 1.35 Support

v1.15.0 updates Kubernetes dependencies, generated code, fake clients, informers, volumebinding integration, CI/lint tooling, and compatibility documentation to support Kubernetes 1.35.

Related PRs: [volcano-sh#5000](https://github.com/volcano-sh/volcano/pull/5000), [volcano-sh#5039](https://github.com/volcano-sh/volcano/pull/5039), [volcano-sh#5062](https://github.com/volcano-sh/volcano/pull/5062)

Sincerely thanks to community developers: \@[guoqinwill](https://github.com/guoqinwill), \@[hajnalmt](https://github.com/hajnalmt)

---

### NodeGroup Preferred Ordering

The NodeGroup plugin adds `enablePreferredOrder`, making the order of `preferredDuringSchedulingIgnoredDuringExecution` in queue affinity affect scheduling scores. Earlier NodeGroups receive higher scores — suitable for scenarios like "prefer fixed resource pools, falling back to elastic pools when capacity runs out."

Configuration:

```yaml
tiers:
  - plugins:
      - name: nodegroup
        arguments:
          enablePreferredOrder: true
```

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: bigdata
spec:
  affinity:
    nodeGroupAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - spark-fixed
        - spark-serverless
```

Related PR: [volcano-sh#5110](https://github.com/volcano-sh/volcano/pull/5110)

Sincerely thanks to community developer: \@[ruanwenjun](https://github.com/ruanwenjun)

---

### Capacity Ancestor Reclaim Level

Adds `ancestorReclaimLevel` configuration and documents hierarchical queue reclaim behavior. This allows operators to control how many ancestor levels are considered when hierarchical queues reclaim resources.

Related PR: [volcano-sh#5115](https://github.com/volcano-sh/volcano/pull/5115)

Sincerely thanks to community developer: \@[hajnalmt](https://github.com/hajnalmt)

---

### Agent Scheduler Stability Enhancements

v1.15.0 fixes Agent Scheduler multi-worker optimistic concurrency conflicts, shared action instance reuse of framework/cycle state, missing CSI manager registration, binder node priority handling, and E2E duration metric issues, with additional E2E coverage.

These fixes primarily improve scheduling stability for latency-sensitive AI Agent workloads.

Related PRs: [volcano-sh#5154](https://github.com/volcano-sh/volcano/pull/5154), [volcano-sh#5153](https://github.com/volcano-sh/volcano/pull/5153), [volcano-sh#5221](https://github.com/volcano-sh/volcano/pull/5221), [volcano-sh#5163](https://github.com/volcano-sh/volcano/pull/5163), [volcano-sh#4991](https://github.com/volcano-sh/volcano/pull/4991)

Sincerely thanks to community developers: \@[JesseStutler](https://github.com/JesseStutler), \@[qi-min](https://github.com/qi-min), \@[agrawalcodes](https://github.com/agrawalcodes)

---

### GPU/vGPU Incremental Enhancements

v1.15.0 makes several enhancements to the deviceshare plugin, including GPU exclusive support, vGPU preemption support, and preventing Pods in the same PodGroup from using the same physical vGPU device when sharing is disallowed.

Related PRs: [volcano-sh#5213](https://github.com/volcano-sh/volcano/pull/5213), [volcano-sh#5235](https://github.com/volcano-sh/volcano/pull/5235), [volcano-sh#5049](https://github.com/volcano-sh/volcano/pull/5049)

Sincerely thanks to community developers: \@[ckyuto](https://github.com/ckyuto), \@[archlitchi](https://github.com/archlitchi), \@[goyalankit](https://github.com/goyalankit)

---

### Pod-Level Resource Request and Limit Settings

v1.15.0 now supports pod-level resource request and limit configuration in Volcano Job pod templates, giving users more granular control over resource allocation at the pod level within a VolcanoJob.

Related PR: [volcano-sh#5020](https://github.com/volcano-sh/volcano/pull/5020)

Sincerely thanks to community developer: \@[Tau721](https://github.com/Tau721)

---

### MPI Validation and Argo MPI Examples

v1.15.0 relaxes MPI validation for single-master MPI jobs and adds Argo MPI workflow examples, making it easier to run MPI workloads with Volcano in Argo Workflows environments.

Related PRs: [volcano-sh#4956](https://github.com/volcano-sh/volcano/pull/4956), [volcano-sh#5117](https://github.com/volcano-sh/volcano/pull/5117)

Sincerely thanks to community developers: \@[kingeasternsun](https://github.com/kingeasternsun), \@[jrbe228](https://github.com/jrbe228)

---

### Security Fix

v1.15.0 includes webhook request body size mitigation for **CVE-2026-44247**. This limits admission webhook request body size to prevent oversized requests from exhausting webhook server memory.

---

### Core Scheduler Stability and Correctness

Improves transaction rollback, preemption/reclaim correctness, queue and inqueue accounting, victim ordering, event-handler synchronization, and scheduler cache safety. Together, they improve scheduler stability under high contention and concurrent event processing.

Related PRs: [volcano-sh#5073](https://github.com/volcano-sh/volcano/pull/5073), [volcano-sh#5180](https://github.com/volcano-sh/volcano/pull/5180), [volcano-sh#5010](https://github.com/volcano-sh/volcano/pull/5010), [volcano-sh#5011](https://github.com/volcano-sh/volcano/pull/5011), [volcano-sh#5067](https://github.com/volcano-sh/volcano/pull/5067), [volcano-sh#5141](https://github.com/volcano-sh/volcano/pull/5141), [volcano-sh#5142](https://github.com/volcano-sh/volcano/pull/5142), [volcano-sh#5113](https://github.com/volcano-sh/volcano/pull/5113), [volcano-sh#5100](https://github.com/volcano-sh/volcano/pull/5100), [volcano-sh#5130](https://github.com/volcano-sh/volcano/pull/5130), [volcano-sh#5176](https://github.com/volcano-sh/volcano/pull/5176), [volcano-sh#5091](https://github.com/volcano-sh/volcano/pull/5091), [volcano-sh#4973](https://github.com/volcano-sh/volcano/pull/4973), [volcano-sh#5172](https://github.com/volcano-sh/volcano/pull/5172), [volcano-sh#5178](https://github.com/volcano-sh/volcano/pull/5178), [volcano-sh#5086](https://github.com/volcano-sh/volcano/pull/5086)

Sincerely thanks to community developers: \@[hzxuzhonghu](https://github.com/hzxuzhonghu), \@[Sanchit2662](https://github.com/Sanchit2662), \@[Aman-Cool](https://github.com/Aman-Cool), \@[hajnalmt](https://github.com/hajnalmt), \@[goyalpalak18](https://github.com/goyalpalak18), \@[guoqinwill](https://github.com/guoqinwill), \@[qi-min](https://github.com/qi-min), \@[zhifei92](https://github.com/zhifei92)

---

## Summary

The core change in v1.15.0 is Gang-Aware Preemption and Resource Reclamation, which elevates preemption decisions from per-Pod granularity to gang granularity, performing holistic evaluation on both the preemptor and victim sides, reducing cascading task failures from random eviction in distributed training scenarios. DRA Queue Quota brings DRA device resources into the existing queue capacity model, keeping heterogeneous resources consistent with CPU and memory in quota management. Pluggable Multi-Sharding Policy, the Benchmark framework, and Agent Scheduler stability fixes respectively improve multi-scheduler coordination, performance baseline establishment, and latency-sensitive workload scheduling capabilities.

Volcano will continue to evolve its unified scheduling platform capabilities and engineering quality for AI training, inference, Agent, HPC, and big-data colocation scenarios.

---

## Upgrade Notes

Upgrade to v1.15.0 via Helm or YAML:

```bash
helm repo update
helm upgrade volcano volcano-sh/volcano --version 1.15.0
```

```bash
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/v1.15.0/installer/volcano-development.yaml
```

- Gang-Aware Preemption and Resource Reclamation is currently Alpha — explicitly configure the two new actions `gangPreempt` and `gangReclaim`. It is not recommended to configure the new `gangPreempt`/`gangReclaim` and legacy `preempt`/`reclaim` actions in the same scheduler action list.
- Scheduling Gates for Queue Admission is Alpha and must be enabled on both the scheduler and webhook-manager.
- DRA scheduling integration is enabled by default to align with Kubernetes 1.34+ DRA defaults. To disable, set `predicate.DynamicResourceAllocationEnable: false`.
- DRA Queue Quota requires Kubernetes DRA support and an available DRA driver.

---

## References

This post focuses on the main capabilities in v1.15.0. For the full API Changes, Bug Fixes, dependency updates, testing and maintenance items, and contributor list, please refer to the official Release Note and related documentation.

- Release Note: [Release Note](https://github.com/volcano-sh/volcano/releases/tag/v1.15.0)
- Full Changelog: [Full Changelog](https://github.com/volcano-sh/volcano/compare/v1.14.0...v1.15.0)

---

## Acknowledgements

Volcano v1.15 had 43 community contributors. Sincere thanks to every contributor — your efforts drive Volcano forward, making it an ever stronger and more stable unified scheduling platform!

|                 |                     |                   |
| --------------- | ------------------- | ----------------- |
| \@0YHR0         | \@3th4novo          | \@aadhil2k4       |
| \@Aman-Cool     | \@agrawalcodes      | \@aniketchawardol |
| \@archlitchi    | \@ckyuto            | \@dafu-wu         |
| \@dengaosong    | \@devzizu           | \@DSFans2014      |
| \@FAUST-BENCHOU | \@goyalankit        | \@goyalpalak18    |
| \@guoqinwill    | \@hajnalmt          | \@hwdef           |
| \@hzxuzhonghu   | \@JesseStutler      | \@jiahuat         |
| \@jrbe228       | \@katara-Jayprakash | \@kingeasternsun  |
| \@kitianFresh   | \@kube-gopher       | \@lixmgl          |
| \@madmecodes    | \@ouyangshengjia    | \@pierluigilenoci |
| \@pmady         | \@praveen0raj       | \@qi-min          |
| \@ruanwenjun    | \@Sanchit2662       | \@SquareCatFirst  |
| \@t2wang        | \@Tau721            | \@vzhou-p         |
| \@wangyang0616  | \@xu-wentao         | \@Yashika0724     |
| \@zhifei92      |                     |                   |
