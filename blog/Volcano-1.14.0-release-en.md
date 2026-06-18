---
title: "Volcano v1.14 Released: Entering a New Era of Unified AI Scheduling"
description: "New Features: Agent Scheduler for AI Agent workloads, Dynamic Node Sharding, Network Topology-Aware Scheduling, NPU and vNPU support, CPU Burst and Cgroup V2 support, and more"
authors: ["volcano"]
date: 2025-11-30
tags:
  ["release", "volcano", "kubernetes", "scheduling", "agent", "sharding", "npu"]
---

# Volcano v1.14 Released: Entering a New Era of Unified AI Scheduling

[Volcano](https://volcano.sh/en/) community [v1.14]([volcano-sh/volcano v1.14.0](https://github.com/volcano-sh/volcano/releases/tag/v1.14.0)) is now officially released. As AI workloads evolve from single offline training to diverse scenarios including online inference and AI Agents, the scheduling system faces unprecedented challenges. v1.14 delivers architecture-level innovations that maintain Volcano's advantages in large-scale batch computing while closing the gap for latency-sensitive workloads, taking a solid step toward the goal of becoming a "unified scheduling platform for AI training, inference, RL, and Agent scenarios."

<!-- truncate -->

## Highlights

v1.14.0 brings the following major updates:

**Unified Scheduling Platform Architecture**

- Multi-scheduler architecture upgrade: Dynamic node sharding (Alpha)
- Ultra-fast scheduling for AI Agent workloads (Alpha)

**Network Topology-Aware Scheduling Enhancements**

- HyperNode-level Binpack strategy
- SubGroup-level fine-grained topology awareness
- PodGroup and SubGroup multi-level Gang Scheduling
- Volcano Job partition support

**Colocation Enhancements**

- Full support for general-purpose operating systems (Ubuntu, CentOS, etc.)
- Comprehensive Cgroup V2 adaptation
- CPU dynamic suppression
- Memory QoS based on Cgroup V2
- CPU Burst support
- Automatic systemd driver detection

**Heterogeneous Hardware Support**

- Ascend vNPU scheduling (MindCluster and HAMi modes)

**Volcano Global Enhancements**

- HyperJob multi-cluster job auto-splitting
- Data-aware multi-cluster scheduling

**Volcano Dashboard Enhancements**

- PodGroup panoramic visualization
- Job / Queue full lifecycle management

## Key Features

### Multi-Scheduler Architecture Upgrade: Dynamic Node Sharding (Alpha)

As the workload types and scale managed by Volcano continue to grow, the single-scheduler architecture gradually reveals its bottlenecks. Different workload types — batch training, AI Agents, microservices — have different requirements for scheduling latency and resource utilization patterns. A single scheduler cannot serve all of them well, while static resource partitioning leads to low utilization.

The newly introduced Sharding Controller builds an extensible multi-scheduler architecture that dynamically computes candidate node pools for each scheduler based on real-time cluster state. Unlike traditional static partitioning, the Sharding Controller uses dynamic computation rather than hard isolation. This flexible mechanism makes Volcano a true "one platform for all workloads" unified scheduling platform while maintaining high throughput and low latency.

Core capabilities:

- Dynamic sharding policies: Supports multiple strategies for computing dynamic candidate node pools. The current release first supports CPU-utilization-based sharding, with an extensible architecture for integrating more sharding algorithms in the future.
- Node pool management: Introduces the NodeShard CRD to manage dedicated dynamic candidate node pools for specific schedulers.
- Large-scale cluster support: Naturally fits large-scale clusters by flexibly distributing load across multiple schedulers.
- Multi-scheduler coordination: Supports seamless collaboration between various scheduler combinations — whether deploying multiple Batch Schedulers for load sharing, or mixing Agent Scheduler with Batch Scheduler for different workload requirements.

Configuration:

```bash
# Sharding Controller startup parameters
--scheduler-configs="volcano:volcano:0.0:0.6:false:2:100,agent-scheduler:agent:0.7:1.0:true:2:100"
--shard-sync-period=60s
--enable-node-event-trigger=true
# Parameter format: name:type:min_util:max_util:prefer_warmup:min_nodes:max_nodes
```

Related PR: volcano-sh#4777

Design Doc: [Sharding Controller Design](https://github.com/volcano-sh/volcano/blob/v1.14.0/docs/design/sharding_controller.md)

Contributors: [@ssfffss](https://github.com/ssfffss), [@Haoran](https://github.com/Haoran), [@qi-min](https://github.com/qi-min)

### Ultra-Fast AI Agent Workload Scheduling (Alpha)

AI Agent workloads are extremely latency-sensitive — tasks are created frequently with short lifecycles, imposing strict requirements on scheduler response speed and throughput. The native Volcano Batch Scheduler is designed for batch computing, processing Pods in fixed cycles, and cannot meet the millisecond-level response demands of Agent scenarios.

To build a unified scheduling platform that handles both batch computing and latency-sensitive workloads, v1.14 introduces a dedicated Agent Scheduler. It works in coordination with the Batch Scheduler through the Sharding Controller — each handling its own domain while collaborating seamlessly, truly achieving "one platform, multiple workloads."

Core capabilities:

- Ultra-fast scheduling channel: A dedicated scheduler built for latency-sensitive workloads (such as AI Agents), delivering extreme response speed.
- Multi-worker parallel processing: A multi-worker architecture that concurrently consumes the scheduling queue, significantly improving scheduling throughput.
- Optimistic concurrency control: Introduces the Conflict-Aware Binder mechanism that resolves conflicts before actual binding, reducing wasted operations.
- Enhanced scheduling queue: Optimized queue mechanism supporting urgent task retries, ensuring critical tasks are not blocked.
- Unified platform integration: Seamlessly collaborates with the Batch Scheduler through the Sharding Controller, sharing cluster resources.

Related PRs: volcano-sh#4804, volcano-sh#4801, volcano-sh#4805

Design Doc: [Agent Scheduler Design](https://github.com/volcano-sh/volcano/blob/v1.14.0/docs/design/agent-scheduler.md)

Contributors: [@qi-min](https://github.com/qi-min), [@JesseStutler](https://github.com/JesseStutler), [@handan-yxh](https://github.com/handan-yxh)

### Network Topology-Aware Scheduling Enhancements

Volcano v1.14.0 further enhances network topology-aware scheduling to meet the growing demands of distributed workloads including LLM training, inference, HPC, and other network-intensive applications.

Core enhancements:

- SubGroup-level fine-grained topology awareness: Supports setting network topology constraints at SubGroup/Partition granularity for finer scheduling control.
- Flexible network tier constraints: Adds `highestTierName` to specify the highest network tier allowed to be crossed by name.
- Multi-level Gang Scheduling: Supports Gang Scheduling at both PodGroup and SubGroup levels, ensuring the integrity of distributed tasks.
- Volcano Job partitioning: Supports splitting a Job into multiple partitions for managing TP/PP/DP parallel strategies and optimizing network affinity.
- HyperNode-level Binpacking: Performs resource bin-packing at the HyperNode level (e.g., switch, rack) to reduce network fragmentation and improve communication efficiency.

Configuration example - Volcano Job:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: llm-training-job
spec:
  networkTopology:
    mode: hard
    highestTierAllowed: 2 # Job can span at most Tier 2 HyperNode
  tasks:
    - name: trainer
      replicas: 8
      partitionPolicy:
        totalPartitions: 2 # Split into 2 partitions
        partitionSize: 4 # 4 Pods per partition
        minPartitions: 2 # At least 2 partitions required
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

Related PRs: volcano-sh#4721, volcano-sh#4810, volcano-sh#4795, volcano-sh#4785, volcano-sh#4889

Design Doc: [Network Topology Aware Scheduling](https://github.com/volcano-sh/volcano/blob/v1.14.0/docs/design/Network%20Topology%20Aware%20Scheduling.md)

Contributors: [@ouyangshengjia](https://github.com/ouyangshengjia), [@3sunny](https://github.com/3sunny), [@zhaoqi](https://github.com/zhaoqi), [@wangyang0616](https://github.com/wangyang0616), [@MondayCha](https://github.com/MondayCha), [@Tau721](https://github.com/Tau721)

### Colocation Upgrade: General-Purpose OS Support

This release comprehensively improves Volcano's colocation capabilities, with an important milestone: Volcano colocation now officially supports general-purpose operating systems (Ubuntu, CentOS, etc.), no longer limited to OpenEuler. This means more users can leverage Volcano Agent for online-offline colocation, improving overall cluster resource utilization.

#### CPU Dynamic Suppression

Online workload traffic typically exhibits tidal patterns. To maximize resource utilization while guaranteeing online service SLAs, offline Pod CPU quotas need to be dynamically adjusted based on online usage — suppressing offline quotas when online usage is high and gradually recovering when usage drops, achieving adaptive resource allocation.

Core design:

- Dynamically adjusts BestEffort root cgroup CPU quota based on node allocatable CPU and real-time usage.
- Uses a "monitor-event-process" architecture with conservative update strategies to effectively suppress jitter.

Configuration:

```yaml
cpuThrottlingConfig:
  enable: true
  cpuThrottlingThreshold: 80 # BE quota capped at 80% of allocatable CPU
  cpuJitterLimitPercent: 1 # Update triggered only when quota changes > 1%
  cpuRecoverLimitPercent: 10 # Single recovery capped at 10%
```

#### Memory QoS (Cgroup V2)

Implements memory isolation for colocation scenarios based on Cgroup V2. Introduces the `ColocationConfiguration` CRD for configuring memory QoS policies for specified workloads.

Core capabilities:

- New API: `ColocationConfiguration` CRD that defines memory isolation policies via label selectors
- Dynamic computation:
  - `memory.high` = `pod.limits.memory` \* `highRatio` %
  - `memory.low` = `pod.requests.memory` \* `lowRatio` %
  - `memory.min` = `pod.requests.memory` \* `minRatio` %
- Unified interface: Reliable Cgroup V2 environment detection and support

Configuration:

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
    highRatio: 100 # memory.high = memory.limits * 100%
    lowRatio: 50 # memory.low = memory.requests * 50%
    minRatio: 0 # memory.min = memory.requests * 0%
```

#### CPU Burst and Comprehensive Cgroup V2 Support

CPU Burst capability has been extended to general-purpose operating systems. Meanwhile, Volcano Agent now fully supports Cgroup V2 environments with automatic detection of Cgroup version and driver type (e.g., systemd driver), running seamlessly on modern Linux distributions without manual intervention.

Related PRs: volcano-sh#4632, volcano-sh#4945, volcano-sh#4913, volcano-sh#4984

Design Docs: [CPU Throttle Design](https://github.com/volcano-sh/volcano/blob/v1.14.0/docs/design/cpu-throttle-design.md), [Agent Cgroup V2 Adaptation](https://github.com/volcano-sh/volcano/blob/v1.14.0/docs/design/agent-cgroup-v2-adaptation.md)

Contributors: [@Haibara-Ai97](https://github.com/Haibara-Ai97), [@JesseStutler](https://github.com/JesseStutler), [@ouyangshengjia](https://github.com/ouyangshengjia)

### Ascend vNPU Scheduling

v1.14 natively integrates Ascend vNPU (virtual NPU) scheduling, enabling efficient compute multiplexing of Ascend AI processors across multiple workloads. Two modes are provided to flexibly adapt to different deployment scenarios.

Supported modes:

**1. MindCluster Mode**

- Integrated from the Ascend MindCluster scheduling plugin: [Ascend/mind-cluster](https://gitcode.com/Ascend/mind-cluster)
- Supports dynamic virtualization of Ascend 310P series

**2. HAMi Mode**

- Developed by the HAMi community
- Supports both Ascend 310 and 910 series
- Supports heterogeneous Ascend clusters (910A, 910B2, 910B3, 310P)

Scheduler configuration:

```yaml
# MindCluster mode
- name: deviceshare
  arguments:
    deviceshare.AscendMindClusterVNPUEnable: true

# HAMi mode
- name: deviceshare
  arguments:
    deviceshare.AscendHAMiVNPUEnable: true
    deviceshare.SchedulePolicy: binpack # or spread
```

Related PRs: volcano-sh#4656, volcano-sh#4717

User Guide: [How to Use vNPU](https://github.com/volcano-sh/volcano/blob/v1.14.0/docs/user-guide/how_to_use_vnpu.md)

Contributors: [@JackyTYang](https://github.com/JackyTYang), [@DSFans2014](https://github.com/DSFans2014)

### Volcano Global Enhancements

Volcano Global v0.3.0 introduces two important features that significantly expand Volcano Global's capabilities for AI/ML and big-data workloads through intelligent scheduling based on compute resources and data locality.

#### HyperJob: Multi-Cluster Job Auto-Splitting

As AI training workloads grow in scale and complexity, enterprises increasingly face the challenge of managing large-scale training jobs across multiple heterogeneous clusters. HyperJob is a higher-level abstraction built on top of Volcano Job. It composes multiple Volcano Job templates, extending training capabilities beyond single-cluster boundaries while preserving all existing Volcano Job capabilities within each cluster.

Core capabilities:

- Deep Karmada integration: Automatically generates PropagationPolicy with precise cluster affinity and replica scheduling.
- Unified status aggregation: Consolidates sub-task status from each cluster into a unified HyperJob status for global observability.
- Automatic resource generation: Automatically creates VCJob and PropagationPolicy based on ReplicatedJob definitions.

HyperJob example (splitting a large training job across 2 clusters, 256 GPUs total):

```yaml
apiVersion: training.volcano.sh/v1alpha1
kind: HyperJob
metadata:
  name: llm-training
spec:
  replicatedJobs:
    - name: trainer
      replicas: 2
      templateSpec:
        tasks:
          - name: worker
            replicas: 128
            template:
              spec:
                containers:
                  - name: trainer
                    image: training-image:v1
                    resources:
                      requests:
                        nvidia.com/gpu: 1
```

#### Data-Aware Scheduling

In high-performance computing scenarios such as AI training and big-data analytics, task execution depends not only on compute resources but also heavily on data resources. In multi-cluster environments, the scheduler may dispatch tasks to clusters physically distant from data sources, resulting in excessive cross-region bandwidth costs and I/O latency.

The data-aware scheduling framework introduces the DataDependencyController, bridging the gap between logical data requirements and physical cluster distribution. Through external plugins (such as Amoro), it obtains real-time data distribution information and automatically injects scheduling constraints into Karmada, achieving a fully automated "compute follows data" workflow.

Core capabilities:

- Plugin architecture: Extensibly supports Amoro, Hive, S3, and other data systems.
- Declarative API: DataSourceClaim / DataSource CRDs using a "declare-cache" pattern.
- Automatic affinity injection: Transforms data locality into ClusterAffinity constraints injected into ResourceBinding.

See: [Volcano Global v0.3.0 Release Notes]([volcano-sh/volcano-global v0.3.0](https://github.com/volcano-sh/volcano-global/releases/tag/v0.3.0))

Contributors: [@JesseStutler](https://github.com/JesseStutler), [@fx147](https://github.com/fx147), [@Monokaix](https://github.com/Monokaix), [@zhoujinyu](https://github.com/zhoujinyu), [@anryko](https://github.com/anryko), [@tanberBro](https://github.com/tanberBro)

### Volcano Dashboard v0.2.0

Volcano Dashboard v0.2.0 significantly enhances resource management capabilities, making it more convenient to manage Volcano resources through a web interface.

Core enhancements:

- PodGroup panoramic visualization: View, search, and filter PodGroups across namespaces with YAML syntax highlighting.
- Job lifecycle management: Create and delete Volcano Jobs directly from the UI.
- Queue management enhancements: Edit Queue quotas and weights online, with direct YAML modification support.
- Security hardening: Default configuration with SELinux, Seccomp, non-root execution, and privilege escalation prevention for production safety.

See: [Volcano Dashboard v0.2.0 Release Notes]([volcano-sh/dashboard v0.2.0](https://github.com/volcano-sh/dashboard/releases/tag/v0.2.0))

Contributors: [@vzhou-p](https://github.com/vzhou-p), [@Shrutim1505](https://github.com/Shrutim1505), [@JesseStutler](https://github.com/JesseStutler), [@karanBRAVO](https://github.com/karanBRAVO), [@Sayan4444](https://github.com/Sayan4444), [@jayesh9747](https://github.com/jayesh9747), [@Alivestars24](https://github.com/Alivestars24), [@kuldeep](https://github.com/kuldeep), [@Monokaix](https://github.com/Monokaix)

### Scheduler Stability and Performance Improvements

**Reclaim Refactoring and Enhancement**

Comprehensively refactored Reclaim Action and fixed critical logic issues in the Capacity Plugin, significantly improving the accuracy, stability, and performance of resource reclamation in multi-tenant clusters.

Key improvements:

- Reclaim Action refactoring: Restructured the reclaim workflow for improved code readability, maintainability, and test coverage.
- Enhanced Capacity Plugin logic: Fixed `reclaimableFn` and `preemptiveFn` to correctly handle scalar resources and prevent incorrect preemption decisions.
- Stability improvements: Resolved edge cases in resource computation, preventing scheduling deadlocks and erroneous evictions.

Related PRs: volcano-sh#4794, volcano-sh#4659, volcano-sh#4919

Contributors: [@guoqinwill](https://github.com/guoqinwill), [@hajnalmt](https://github.com/hajnalmt)

### Kubernetes 1.34 Support

Volcano keeps pace with the Kubernetes community. v1.14 fully supports the latest Kubernetes v1.34, with comprehensive unit tests and E2E tests ensuring functionality and stability.

Related PR: volcano-sh#4704

Contributors: [@suyiiyii](https://github.com/suyiiyii), [@tunedev](https://github.com/tunedev)

## Summary: Volcano v1.14.0 — A Unified Scheduling Platform for the AI Era

Volcano v1.14 is a milestone release. By introducing the multi-scheduler architecture and Agent Scheduler, Volcano officially enters a new phase as a unified scheduling platform — efficiently handling batch AI training while meeting the extreme latency requirements of AI Agents. Network topology-aware enhancements, general-purpose OS colocation support, and Ascend vNPU integration further solidify Volcano's leading position in AI infrastructure.

Meanwhile, Volcano Global v0.3.0 extends multi-cluster capabilities through HyperJob for large-scale distributed training and data-aware scheduling. Volcano Dashboard v0.2.0 significantly improves user experience with comprehensive resource management features.

## References

- v1.14.0 Release: [volcano-sh/volcano v1.14.0](https://github.com/volcano-sh/volcano/releases/tag/v1.14.0)
- Volcano Global v0.3.0 Release: [volcano-sh/volcano-global v0.3.0](https://github.com/volcano-sh/volcano-global/releases/tag/v0.3.0)
- Volcano Dashboard v0.2.0 Release: [volcano-sh/dashboard v0.2.0](https://github.com/volcano-sh/dashboard/releases/tag/v0.2.0)

## Acknowledgements

Volcano v1.14 ecosystem releases (including Volcano Global v0.3.0 and Dashboard v0.2.0) had 55 community contributors. Sincere thanks to every contributor!

|                |                   |                 |
| -------------- | ----------------- | --------------- |
| \@3sunny        | \@3th4novo         | \@acsoto         |
| \@Aman-Cool     | \@archlitchi       | \@dafu-wu        |
| \@DSFans2014    | \@FAUST-BENCHOU    | \@fengruotj      |
| \@Freshwlnd     | \@goyalpalak18     | \@guoqinwill     |
| \@Haibara-Ai97  | \@hajnalmt         | \@halcyon-r      |
| \@handan-yxh    | \@JackyTYang       | \@JesseStutler   |
| \@jiahuat       | \@kingeasternsun   | \@kiritoxkiriko  |
| \@kube-gopher   | \@LiZhenCheng9527  | \@medyagh        |
| \@MondayCha     | \@Monokaix         | \@mvinchoo       |
| \@neeraj542     | \@nitindhiman314e  | \@ouyangshengjia |
| \@PersistentJZH | \@qi-min           | \@rhh777         |
| \@ruanwenjun    | \@RushabhMehta2005 | \@sailorvii      |
| \@ssfffss       | \@suyiiyii         | \@Tau721         |
| \@tunedev       | \@wangyang0616     | \@weapons97      |
| \@Wonki4        | \@zhaoqi612        | \@zhengchenyu    |
| \@zjj2wry       |
