---
title: "Volcano v1.14 Released: Unified Scheduling Platform for AI Agents and Diverse Workloads at Scale"
description: "New Features: Scalable multi-scheduler architecture with dynamic node scheduling shard, Agent Scheduler for latency-sensitive workloads, Network topology aware enhancements, Colocation for Generic OS, Ascend vNPU scheduling integration, Volcano Global enhancements, Kubernetes v1.34 support, and more"
authors: ["volcano"]
date: 2026-01-31
tags: ["release", "volcano", "kubernetes", "ai", "scheduling"]
---

# Volcano v1.14 Released: Unified Scheduling Platform for AI Agents and Diverse Workloads at Scale

On January 31, 2026 (Beijing Time), [Volcano v1.14.0](https://github.com/volcano-sh/volcano/releases/tag/v1.14.0) was officially released. This update establishes Volcano as a unified scheduling platform for diverse workloads at scale, introducing a scalable multi-scheduler architecture, ultra-fast scheduling for AI agents, and comprehensive enhancements to network topology and colocation.

<!-- truncate -->

## Release Highlights

The v1.14.0 release includes the following major updates:

- [Scalable Multi-Scheduler with Dynamic Node Scheduling Shard (Alpha)](#scalable-multi-scheduler-with-dynamic-node-scheduling-shard-alpha)
- [Fast Scheduling for AI Agent Workloads (Alpha)](#fast-scheduling-for-ai-agent-workloads-alpha)
- [Network Topology Aware Scheduling Enhancement](#network-topology-aware-scheduling-enhancement)
- [Colocation for Generic OS (CPU Throttling, Memory QoS, CPU Burst)](#colocation-for-generic-os-cpu-throttling-memory-qos-cpu-burst)
- [Ascend vNPU Scheduling](#ascend-vnpu-scheduling)
- [Volcano Global Enhancements](#volcano-global-enhancements)

## Scalable Multi-Scheduler with Dynamic Node Scheduling Shard (Alpha)

As Volcano evolves to support diverse scheduling workloads at massive scale, the single scheduler architecture faces significant challenges. Different workload types (batch training, AI agents, microservices) have distinct scheduling requirements and resource utilization patterns. A single scheduler becomes a bottleneck, and static resource allocation leads to inefficient cluster utilization.

The Sharding Controller introduces a scalable multi-scheduler architecture that dynamically computes candidate node pools for each scheduler. Unlike strict partitioning, the Sharding Controller calculates dynamic candidate node pools rather than enforcing hard isolation between schedulers. This flexible approach enables Volcano to serve as a unified scheduling platform for diverse workloads while maintaining high throughput and low latency.

Alpha Feature Notice: This feature is currently in alpha stage. The NodeShard CRD (Node Scheduling Shard) API structure and the underlying scheduling shard concepts are actively evolving.

Key Capabilities:

- Dynamic Node Scheduling Shard Strategies: Compute dynamic candidate node pools based on various policies. Currently supports scheduling shard by CPU utilization, with an extensible design to support more policies in the future.
- NodeShard CRD: Manages dynamic candidate node pools for specific schedulers.
- Large-scale Cluster Support: Architecture designed to support large-scale clusters by distributing load across multiple schedulers
- Scheduler Coordination: Enable seamless coordination among various scheduler combinations (e.g., multiple Batch Schedulers, or a mix of Agent and Batch Schedulers), establishing Volcano as a unified scheduling platform

Configuration:

```yaml
# Sharding Controller startup flags
--scheduler-configs="volcano:volcano:0.0:0.6:false:2:100,agent-scheduler:agent:0.7:1.0:true:2:100"
--shard-sync-period=60s
--enable-node-event-trigger=true
# Config format: name:type:min_util:max_util:prefer_warmup:min_nodes:max_nodes
```

Related PR: https://github.com/volcano-sh/volcano/pull/4777

Design documentation: [Sharding Controller Design](https://github.com/volcano-sh/volcano/blob/v1.14.0/docs/design/sharding_controller.md)

Sincerely thanks to community developers: @[ssfffss](https://github.com/ssfffss), @[Haoran](https://github.com/Haoran), @[qi-min](https://github.com/qi-min)

## Fast Scheduling for AI Agent Workloads (Alpha)

AI Agent workloads are latency-sensitive with frequent task creation, requiring ultra-fast scheduling with high throughput. The Volcano batch scheduler is optimized for batch workloads and processes pods at fixed intervals, which cannot guarantee low latency for Agent workloads. To establish Volcano as a unified scheduling platform for both batch and latency-sensitive workloads, we introduce a dedicated Agent Scheduler.

The Agent Scheduler works in coordination with the Volcano batch scheduler through the Sharding Controller (which is introduced in "Scalable Multi-Scheduler with Dynamic Node Scheduling Shard" feature). This architecture positions Volcano as a unified scheduling platform capable of handling diverse workload types.

Alpha Feature Notice: This feature is currently in alpha stage and under active development. The Agent Scheduler related APIs, configuration options, and scheduling algorithms may be refined in future releases.

Key Capabilities:

- Fast-Path Scheduling: Independent scheduler optimized for latency-sensitive workloads such as AI Agent workloads
- Multi-Worker Parallel Scheduling: Multiple workers process pods concurrently from the scheduling queue, increasing throughput
- Optimistic Concurrency Control: Conflict-Aware Binder resolves scheduling conflicts before executing real binding
- Optimized Scheduling Queue: Enhanced queue mechanism with urgent retry support
- Unified Platform Integration: Seamless coordination with Volcano batch scheduler via Sharding Controller.

Related Issue: https://github.com/volcano-sh/volcano/issues/4722

Related PRs: https://github.com/volcano-sh/volcano/pull/4804, https://github.com/volcano-sh/volcano/pull/4801, https://github.com/volcano-sh/volcano/pull/4805

Design documentation: [Agent Scheduler Design](https://github.com/volcano-sh/volcano/blob/v1.14.0/docs/design/agent-scheduler.md)

Sincerely thanks to community developers: @[qi-min](https://github.com/qi-min), @[JesseStutler](https://github.com/JesseStutler), @[handan-yxh](https://github.com/handan-yxh)

## Network Topology Aware Scheduling Enhancement

Volcano v1.14.0 brings significant enhancements to network topology aware scheduling, addressing the growing demands of distributed workloads including LLM training, HPC, and other network-intensive applications.

Key Enhancements:

- SubGroup Level Topology Awareness: Support fine-grained network topology constraints at the SubGroup/Partition level.
- Flexible Network Tier Configuration: Support `highestTierName` for specifying maximum network tier constraints by name.
- Multi-Level Gang Scheduling: Improved gang scheduling to support both Job-level and SubGroup-level consistency.
- Volcano Job Partitioning: Enable partitioning of Volcano Jobs for better resource management and fault isolation.
- HyperNode-Level Binpacking: Optimization for resource utilization across network topology boundaries.

Configuration Example - Volcano Job:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: llm-training-job
spec:
  # ...other fields
  networkTopology:
    mode: hard
    highestTierAllowed: 2 # Job can cross up to Tier 2 HyperNodes
  tasks:
    - name: trainer
      replicas: 8
      partitionPolicy:
        totalPartitions: 2 # Split into 2 partitions
        partitionSize: 4 # 4 pods per partition
        minPartitions: 2 # Minimum 2 partitions required
        networkTopology:
          mode: hard
          highestTierAllowed: 1 # Each partition must stay within Tier 1
      template:
        spec:
          containers:
            - name: trainer
              image: training-image:v1
              resources:
                requests:
                  nvidia.com/gpu: 8
```

Configuration Example - PodGroup SubGroupPolicy:

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: PodGroup
metadata:
  name: llm-training-pg
spec:
  minMember: 4
  networkTopology:
    mode: hard
    highestTierAllowed: 2
  subGroupPolicy:
    - name: "trainer"
      subGroupSize: 4
      labelSelector:
        matchLabels:
          volcano.sh/task-spec: trainer
      matchLabelKeys:
        - volcano.sh/partition-id
      networkTopology:
        mode: hard
        highestTierAllowed: 1
```

Related Issues: https://github.com/volcano-sh/volcano/issues/4188, https://github.com/volcano-sh/volcano/issues/4368, https://github.com/volcano-sh/volcano/issues/4869

Related PRs: https://github.com/volcano-sh/volcano/pull/4721, https://github.com/volcano-sh/volcano/pull/4810, https://github.com/volcano-sh/volcano/pull/4795, https://github.com/volcano-sh/volcano/pull/4785, https://github.com/volcano-sh/volcano/pull/4889

Design documentation: [Network Topology Aware Scheduling](https://github.com/volcano-sh/volcano/blob/v1.14.0/docs/design/Network%20Topology%20Aware%20Scheduling.md)

Sincerely thanks to community developers: @[ouyangshengjia](https://github.com/ouyangshengjia), @[3sunny](https://github.com/3sunny), @[zhaoqi](https://github.com/zhaoqi), @[wangyang0616](https://github.com/wangyang0616), @[MondayCha](https://github.com/MondayCha), @[Tau721](https://github.com/Tau721)

## Colocation for Generic OS (CPU Throttling, Memory QoS, CPU Burst)

This release brings comprehensive improvements to Volcano's colocation capabilities, with a major milestone: support for generic operating systems (Ubuntu, CentOS, etc.) in addition to OpenEuler. This enables broader adoption of Volcano Agent for resource sharing between online and offline workloads.

New Features in v1.14.0:

1. CPU Throttling (CPU Suppression)

The CPU usage of online pods dynamically changes. To better isolate online and offline workloads, the CPU quota allocated to offline pods needs to change dynamically according to the actual usage of online pods. When offline pods consume more CPU than their quota, CPU suppression is triggered; if not exceeded, their quota can gradually recover, enabling adaptive resource allocation.

Key design:

- Dynamically adjusts BestEffort root cgroup CPU quota based on node allocatable CPU and real-time usage
- Follows a "monitor-event-handler" architecture with conservative updates to avoid jitter

```yaml
cpuThrottlingConfig:
  enable: true
  cpuThrottlingThreshold: 80 # Allow BE quota up to 80% of allocatable CPU
  cpuJitterLimitPercent: 1 # Emit updates when quota changes by >=1%
  cpuRecoverLimitPercent: 10 # Cap quota increases to 10% per update
```

2. Memory QoS (Cgroup V2)

Cgroup V2 based memory isolation for colocation environments. This feature introduces the `ColocationConfiguration` CRD, which allows users to define memory QoS policies for specific workloads. The system automatically applies these policies to matching pods, calculating Cgroup V2 settings (`memory.high`, `memory.low`, `memory.min`) based on the configured percentages and the pod's memory requests/limits.

Key capabilities:

- New API: `ColocationConfiguration` CRD for defining memory isolation policies via label selectors
- Dynamic Calculation:
  - `memory.high` = `pod.limits.memory` \* `highRatio` %
  - `memory.low` = `pod.requests.memory` \* `lowRatio` %
  - `memory.min` = `pod.requests.memory` \* `minRatio` %
- Unified Interface: Robust detection and support for Cgroup V2 environment

Usage Example:

```yaml
apiVersion: config.volcano.sh/v1alpha1
kind: ColocationConfiguration
metadata:
  name: colo-config1
spec:
  selector:
    matchLabels:
      app: offline-test
  memoryQos:
    # memory.high = memory.limits * 100% (No throttling if 100)
    highRatio: 100
    # memory.low = memory.requests * 50% (Protect 50% of request)
    lowRatio: 50
    # memory.min = memory.requests * 0% (No absolute guarantee)
    minRatio: 0
```

3. CPU Burst for Generic OS

Extended CPU Burst support to generic operating systems (Ubuntu, CentOS, etc.), allowing latency-sensitive workloads to burst beyond their CPU limits when resources are available.

```yaml
cpuBurstConfig:
  enable: true
```

4. Cgroup V2 Full Support

Volcano Agent now fully supports Cgroup V2 environments, ensuring seamless operation on modern Linux distributions.

- Automatic Detection: Automatically detects cgroup version (v1/v2) and driver type (systemd/cgroupfs) without manual configuration.
- Unified Interface: Adapts internal resource managers (CPU, Memory) to work with both v1 and v2 interfaces.

Related Issues: https://github.com/volcano-sh/volcano/issues/4631, https://github.com/volcano-sh/volcano/issues/4466, https://github.com/volcano-sh/volcano/issues/4468, https://github.com/volcano-sh/volcano/issues/4912

Related PRs: https://github.com/volcano-sh/volcano/pull/4632, https://github.com/volcano-sh/volcano/pull/4945, https://github.com/volcano-sh/volcano/pull/4913, https://github.com/volcano-sh/volcano/pull/4984

Design documentation: [CPU Throttle Design](https://github.com/volcano-sh/volcano/blob/v1.14.0/docs/design/cpu-throttle-design.md), [Agent Cgroup V2 Adaptation](https://github.com/volcano-sh/volcano/blob/v1.14.0/docs/design/agent-cgroup-v2-adaptation.md)

Sincerely thanks to community developers: @[Haibara-Ai97](https://github.com/Haibara-Ai97), @[JesseStutler](https://github.com/JesseStutler), @[ouyangshengjia](https://github.com/ouyangshengjia)

## Ascend vNPU Scheduling

Volcano v1.14.0 introduces integrated support for Ascend vNPU (virtual NPU) scheduling, enabling efficient sharing of Ascend AI processors across multiple workloads. This feature supports two modes to accommodate different deployment scenarios.

Supported Modes:

1. MindCluster Mode
   - Integrated from the official Ascend cluster scheduling add-on
   - Supports Ascend 310P series with dynamic virtualization
   - Uses `huawei.com/npu-core` resource name
   - Supports vnpu-level (low/high) and vnpu-dvpp configurations

2. HAMi Mode
   - Developed by the HAMi community
   - Supports both Ascend 310 and 910 series
   - Supports heterogeneous Ascend clusters (910A, 910B2, 910B3, 310P)
   - Memory-based virtualization with automatic alignment

Scheduler Configuration:

```yaml
# MindCluster Mode
- name: deviceshare
  arguments:
    deviceshare.AscendMindClusterVNPUEnable: true

# HAMi Mode
- name: deviceshare
  arguments:
    deviceshare.AscendHAMiVNPUEnable: true
    deviceshare.SchedulePolicy: binpack # or spread
```

Usage Example (HAMi Mode):

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ascend-pod
spec:
  schedulerName: volcano
  containers:
    - name: inference
      image: ascend-image:v1
      resources:
        limits:
          huawei.com/Ascend310P: "1"
          huawei.com/Ascend310P-memory: "4096"
```

Related Issue: https://github.com/volcano-sh/volcano/issues/4718

Related PRs: https://github.com/volcano-sh/volcano/pull/4656, https://github.com/volcano-sh/volcano/pull/4717

User Guide: [How to Use vNPU](https://github.com/volcano-sh/volcano/blob/v1.14.0/docs/user-guide/how_to_use_vnpu.md)

Sincerely thanks to community developers: @[JackyTYang](https://github.com/JackyTYang), @[DSFans2014](https://github.com/DSFans2014)

## Volcano Global Enhancements

The new version of Volcano-global further enhances the ability of multi-cluster scheduling.

Key Enhancements:

- Introduce HyperJob for large-scale cross-cluster training: Enables large-scale cross-cluster training by orchestrating jobs across multiple clusters.
- Data-Aware Scheduling: Optimizes workload placement based on data locality.

For detailed information, please refer to the Volcano Global v0.3.0 Release Notes.

Design documentation: [HyperJob Design](https://github.com/volcano-sh/volcano/blob/v1.14.0/docs/design/hyperjob-multi-cluster-job-splitting.md)

Sincerely thanks to community developers: @[JesseStutler](https://github.com/JesseStutler), @[fx147](https://github.com/fx147)

## Scheduler Stability and Performance

### Reclaim Refactoring and Enhancements

The Reclaim mechanism has been significantly improved through a comprehensive refactor of the Reclaim Action and critical logic fixes in the Capacity Plugin. These changes collectively enhance the accuracy, stability, and performance of resource reclamation in multi-tenant clusters.

Key improvements:

- Reclaim Action Refactoring: The reclaim workflow has been restructured to improve code readability, maintainability, and test coverage.
- Enhanced Capacity Plugin Logic:
  - Precise Victim Selection: Fixed `reclaimableFn` to correctly handle scalar resources and ensure victims are selected based on all relevant resource dimensions, taking the reclaimer's requirements into account.
  - Accurate Resource Comparison: Corrected `preemptiveFn` resource comparison logic to prevent incorrect preemption decisions when specific resource dimensions are zero.
- Improved Stability: Addressed edge cases in resource calculation to prevent scheduling loops and incorrect evictions

Related Issues: https://github.com/volcano-sh/volcano/issues/3738, https://github.com/volcano-sh/volcano/issues/4658, https://github.com/volcano-sh/volcano/issues/4918

Related PRs: https://github.com/volcano-sh/volcano/pull/4794, https://github.com/volcano-sh/volcano/pull/4659, https://github.com/volcano-sh/volcano/pull/4919

Sincerely thanks to community developers: @[guoqinwill](https://github.com/guoqinwill), @[hajnalmt](https://github.com/hajnalmt)

## Add Kubernetes 1.34 Support

The Volcano version keeps pace with the Kubernetes community releases. v1.14 supports the latest Kubernetes v1.34 release, ensuring functionality and reliability through comprehensive UT and E2E test cases.

Related PR: https://github.com/volcano-sh/volcano/pull/4704

Sincerely thanks to community developers: @[suyiiyii](https://github.com/suyiiyii), @[tunedev](https://github.com/tunedev)

## Upgrade Instructions

To upgrade to Volcano v1.14.0:

```bash
# Using Helm
helm repo update
helm upgrade volcano volcano-sh/volcano --version 1.14.0

# Using kubectl
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/v1.14.0/installer/volcano-development.yaml
```

Note: Review the new CRDs (NodeShard, HyperJob) if you plan to use the Agent Scheduler, Sharding Controller, or cross-cluster training features.

## **Conclusion: Volcano v1.14.0 Continues to Lead Cloud-Native Batch Computing**

Volcano v1.14.0 is not just a technological advancement but a continuation of innovation in cloud-native batch computing. Whether for AI large model training, ultra-fast Agent scheduling, or enterprise-grade generic OS colocation, Volcano v1.14.0 delivers powerful features and flexible solutions. We believe Volcano v1.14.0 will help users achieve greater heights, ushering in a new era of AI and Big Data scheduling!

**Experience Volcano v1.14.0 now and step into a new era of efficient computing!**

**v1.14.0 release:** https://github.com/volcano-sh/volcano/releases/tag/v1.14.0

## **Acknowledgments**

Volcano v1.14.0 includes contributions from over 50 community members. Sincerely thanks to all contributors:

| Contributors                                       | Contributors                                             | Contributors                                         |
| :------------------------------------------------- | :------------------------------------------------------- | :--------------------------------------------------- |
| @[3sunny](https://github.com/3sunny)               | @[3th4novo](https://github.com/3th4novo)                 | @[acsoto](https://github.com/acsoto)                 |
| @[Aman-Cool](https://github.com/Aman-Cool)         | @[aman-kumar](https://github.com/aman-kumar)             | @[archlitchi](https://github.com/archlitchi)         |
| @[dafu-wu](https://github.com/dafu-wu)             | @[DSFans2014](https://github.com/DSFans2014)             | @[FAUST-BENCHOU](https://github.com/FAUST-BENCHOU)   |
| @[fengruotj](https://github.com/fengruotj)         | @[Freshwlnd](https://github.com/Freshwlnd)               | @[fx147](https://github.com/fx147)                   |
| @[goyalpalak18](https://github.com/goyalpalak18)   | @[guoqinwill](https://github.com/guoqinwill)             | @[Haibara-Ai97](https://github.com/Haibara-Ai97)     |
| @[hajnalmt](https://github.com/hajnalmt)           | @[halcyon-r](https://github.com/halcyon-r)               | @[handan-yxh](https://github.com/handan-yxh)         |
| @[Haoran](https://github.com/Haoran)               | @[JackyTYang](https://github.com/JackyTYang)             | @[JesseStutler](https://github.com/JesseStutler)     |
| @[jiahuat](https://github.com/jiahuat)             | @[kingeasternsun](https://github.com/kingeasternsun)     | @[kiritoxkiriko](https://github.com/kiritoxkiriko)   |
| @[kube-gopher](https://github.com/kube-gopher)     | @[LiZhenCheng9527](https://github.com/LiZhenCheng9527)   | @[medyagh](https://github.com/medyagh)               |
| @[MondayCha](https://github.com/MondayCha)         | @[Monokaix](https://github.com/Monokaix)                 | @[mvinchoo](https://github.com/mvinchoo)             |
| @[neeraj542](https://github.com/neeraj542)         | @[nitindhiman314e](https://github.com/nitindhiman314e)   | @[ouyangshengjia](https://github.com/ouyangshengjia) |
| @[PersistentJZH](https://github.com/PersistentJZH) | @[qi-min](https://github.com/qi-min)                     | @[rhh777](https://github.com/rhh777)                 |
| @[ruanwenjun](https://github.com/ruanwenjun)       | @[RushabhMehta2005](https://github.com/RushabhMehta2005) | @[sailorvii](https://github.com/sailorvii)           |
| @[ssfffss](https://github.com/ssfffss)             | @[suyiiyii](https://github.com/suyiiyii)                 | @[Tau721](https://github.com/Tau721)                 |
| @[tunedev](https://github.com/tunedev)             | @[wangyang0616](https://github.com/wangyang0616)         | @[weapons97](https://github.com/weapons97)           |
| @[Wonki4](https://github.com/Wonki4)               | @[zhaoqi](https://github.com/zhaoqi)                     | @[zhaoqi612](https://github.com/zhaoqi612)           |
| @[zhengchenyu](https://github.com/zhengchenyu)     | @[zjj2wry](https://github.com/zjj2wry)                   |                                                      |
