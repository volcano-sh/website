---
title: "Volcano v1.15发布：Gang粒度抢占、DRA队列配额等多项调度能力增强"
description: "新特性：Gang-Aware Preemption and Resource Reclamation、DRA Queue Quota in Capacity Plugin、Pluggable Multi-Sharding Policies、Volcano Benchmark and Performance Observability、Scheduling Gates for Queue Admission、Kubernetes 1.35支持等"
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

# Volcano v1.15 发布：Gang 粒度抢占、DRA 队列配额等多项调度能力增强

随着批量训练、推理、AI Agent、HPC、大数据等多种负载在同一 Kubernetes 集群中混合部署，调度器需要在资源竞争更加激烈的环境下做出更高质量的决策，同时保持作业级语义、队列公平性、拓扑亲和性与运行稳定性。Volcano v1.15.0 现已正式发布，围绕这些方向，在调度核心、异构资源管理、多调度器协同与性能可观测等方面进行了增强。

本次最值得关注的新增能力是 **Gang-Aware Preemption and Resource Reclamation**：抢占决策在抢占方与被抢占方两侧均以 Gang 为整体进行评估——抢占方按 Gang 整体进行放置，被抢占候选者同样按 Gang 粒度进行排序和评估，优先驱逐冗余副本，避免逐 Pod 随机驱逐打断多个训练任务而抢占方自身仍无法启动的情况。此外，v1.15.0 在 capacity 插件中引入了 DRA 队列配额，新增了可插拔的多分片策略框架以及 Benchmark 与性能可观测工具，支持 Kubernetes 1.35，并在 NodeGroup 调度优先级、Agent Scheduler 稳定性、GPU/vGPU 及队列准入控制等方面做了补充增强。

<!-- truncate -->

## 版本亮点

本次发布主要围绕以下方向展开：

- **Gang-Aware Preemption and Resource Reclamation**：以 Job/Gang 为粒度组织被抢占候选，区分冗余副本与关键副本，优先驱逐冗余副本减少任务扰动，并在驱逐前模拟整体放置确认抢占方能成功启动，避免逐 Pod 抢占打断多个训练任务而抢占方自己也无法运行的情况。
- **DRA Queue Quota**：capacity 插件将 DRA `ResourceClaim` 纳入 Volcano 现有的队列容量模型，让 DRA 设备资源也能通过队列配额管理。
- **Pluggable Multi-Sharding Policy**：Sharding Controller 支持通过 ConfigMap 组合多种分片策略，并支持运行时热加载。
- **Volcano Benchmark 框架**：提供一键化性能测试环境搭建和报告输出，支持 Kind/KWOK 及已有集群。
- **Scheduling Gates for Queue Admission**：区分"队列配额不足"和"集群资源不足"，避免 autoscaler 因队列限额触发不必要的扩容。

此外，v1.15.0 还包含 Kubernetes 1.35 支持、NodeGroup preferred ordering、Agent Scheduler 稳定性增强、GPU/vGPU 增量增强以及安全修复。它们会在后文简要介绍，对生产可用性和生态兼容性同样重要。

## Release Highlights

**调度与抢占增强**

- [Gang-Aware Preemption and Resource Reclamation（Alpha）](#1-gang-aware-preemption-and-resource-reclamationalpha)
- [NodeGroup Preferred Ordering](#nodegroup-preferred-ordering)
- [Capacity Ancestor Reclaim Level](#capacity-ancestor-reclaim-level)

**资源管理与调度增强**

- [DRA Queue Quota](#2-dra-queue-quota)
- [Pluggable Multi-Sharding Policy（Alpha）](#3-pluggable-multi-sharding-policyalpha)
- [GPU/vGPU 增量增强](#gpuvgpu-增量增强)
- [Pod-Level Resource Request and Limit Settings](#pod-level-resource-request-and-limit-settings)

**性能与可观测增强**

- [Volcano Benchmark 框架](#4-volcano-benchmark-框架)
- [Scheduling Gates for Queue Admission（Alpha）](#5-scheduling-gates-for-queue-admissionalpha)

**安全与稳定性**

- [Webhook Request Body Size Mitigation for CVE-2026-44247](#安全修复)
- [Core Scheduler 稳定性与正确性修复](#core-scheduler-稳定性与正确性修复)

---

## 重点特性

### 1. Gang-Aware Preemption and Resource Reclamation（Alpha）

在大模型训练、HPC 等分布式任务中，一个 Job 往往需要多个 Pod 同时运行才有意义。如果抢占只按单个 Pod 进行决策，就可能从多个正在运行的训练任务里各抢一个 Pod——表面上释放了资源，实际上既把多个任务都打断了，发起抢占的 Gang 也未必能凑齐 `minAvailable` 成功启动。

v1.15.0 引入 Gang-Aware Preemption and Resource Reclamation，让抢占方和被抢占方在决策时都以 Gang 为整体来考量，避免出现"释放了一堆 Pod，但谁都没跑起来"的情况。

**在被抢占方一侧**，Volcano 以 Job/Gang 为粒度组织被抢占候选，而不是把所有 Pod 看成可互换的抢占对象。每个候选 Job 的 Pod 被区分为冗余副本（超出 `minAvailable` 的部分）和关键副本，调度器优先选择冗余副本——驱逐它们不会打断任务——尽量避免触碰关键副本。这与原有 action 逐 Pod 选择、不区分破坏代价的方式有本质区别。

**在抢占方一侧**，调度器逐步累计可释放的资源，当累计量足以覆盖抢占方 Gang 的整体需求时，先做放置模拟——在释放后的资源视图上验证抢占方 Gang 能否整体调度成功——只有模拟通过才真正执行驱逐。这样不会出现"抢了一堆 Pod 结果抢占方还是起不来"的情况。

不论是否启用 HyperNode 拓扑，这套机制都能减少随机抢占带来的任务扰动。启用 HyperNode 拓扑后，Volcano 还会将 victim 搜索限定在选定的拓扑范围内，避免跨拓扑域抢占。

该特性目前为 Alpha，需要显式配置 `gangPreempt` 和 `gangReclaim` 两个新的 action。后续版本会继续评估是否将 Gang-Aware 驱逐机制与原有 `preempt`、 `reclaim` action 合并。

配置示例：

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

相关资料：

- 相关 PR：[volcano-sh#5250](https://github.com/volcano-sh/volcano/pull/5250), [volcano-sh#4780](https://github.com/volcano-sh/volcano/pull/4780), [volcano-sh#5170](https://github.com/volcano-sh/volcano/pull/5170)
- 感谢社区开发者：\@[vzhou-p](https://github.com/vzhou-p)

---

### 2. DRA Queue Quota

Kubernetes Dynamic Resource Allocation（DRA）为设备资源申请提供了更灵活的模型。此前版本的 Volcano 已经支持调度使用 DRA 资源的 Pod，但队列 quota 尚未覆盖 DRA `ResourceClaim`。

v1.15.0 在 capacity 插件中补齐了这一能力，将 DRA 资源纳入 Volcano 已有的队列配额体系。用户仍然可以使用 `capability`、 `deserved`、 `guarantee` 容量模型管理队列资源，无需为 DRA 单独维护一套 quota API。

目前支持两类资源管控：

- 基于 `DeviceClass` 的整卡/整设备数量配额
- 基于可消费设备维度的配额，如虚拟 GPU core、显存等

当多个 Pod 引用同一个共享 `ResourceClaim` 时，Volcano 会自动去重，避免同一份资源被重复计入队列用量。

这样，集群管理员可以用同一套队列容量模型统一管理 CPU、内存、扩展资源以及 DRA 设备资源。

配置示例：

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

相关资料：

- 相关 PR：[volcano-sh#5058](https://github.com/volcano-sh/volcano/pull/5058)
- 感谢社区开发者：\@[xu-wentao](https://github.com/xu-wentao)

---

### 3. Pluggable Multi-Sharding Policy（Alpha）

在多调度器架构下，不同调度器通常面向不同类型的工作负载，对候选节点的范围也有不同要求。v1.15.0 对 Sharding Controller 进行了增强，支持以可插拔的策略流水线组合多种分片逻辑。

每个 scheduler shard 可以配置一组有序的策略，覆盖 filter、score、select 等阶段。内置策略包括：

- `allocation-rate`：根据节点资源利用率进行过滤和打分
- `warmup`：优先处理 warmup 节点
- `node-limit`：限制每个 shard 的节点数量范围

策略通过 ConfigMap 配置，支持运行时热加载。如果新配置校验失败，系统会沿用上一份有效配置，避免线上变更引入风险。

这让多调度器的节点分片能够更灵活地适配不同集群规模和业务类型，也为后续扩展更多 sharding policy 提供了清晰的接口。

配置示例：

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

相关资料：

- 相关 PR：[volcano-sh#5098](https://github.com/volcano-sh/volcano/pull/5098), [volcano-sh#5132](https://github.com/volcano-sh/volcano/pull/5132), [volcano-sh#4990](https://github.com/volcano-sh/volcano/pull/4990)
- 感谢社区开发者：\@[lixmgl](https://github.com/lixmgl), \@[agrawalcodes](https://github.com/agrawalcodes)

---

### 4. Volcano Benchmark 框架

调度器的性能优化离不开稳定、可复现的测试基线。v1.15.0 新增了 Benchmark 框架，支持一键部署测试环境、运行标准场景并输出性能报告。

该框架支持两类环境：

- 本地 Kind + KWOK 环境，用于开发者快速复现和分析调度性能问题
- 已有 Kubernetes 集群，用于用户在真实环境中评估 Volcano 的调度吞吐和延迟

测试场景覆盖 VolcanoJob Gang 调度、普通 Pod 调度、KWOK 拓扑标签、HyperNode 生成等，配合 scheduler/controller metrics、audit-exporter 报告和 Grafana dashboard，可以帮助快速定位调度性能瓶颈。

对于新接触 Volcano 的用户，也可以借助该框架在自己的集群中运行一轮测试，快速了解实际的调度吞吐和延迟表现。

使用示例：

```bash
cd benchmark
make setup VOLCANO_VERSION=v1.15.0
make test-gang-env JOBS=10 REPLICAS=100 MIN_AVAILABLE=100
make cleanup-all
```

相关资料：

- 相关 PR：[volcano-sh#5305](https://github.com/volcano-sh/volcano/pull/5305), [volcano-sh#5215](https://github.com/volcano-sh/volcano/pull/5215), [volcano-sh#5163](https://github.com/volcano-sh/volcano/pull/5163), [volcano-sh#5221](https://github.com/volcano-sh/volcano/pull/5221)
- 使用文档：[Benchmark README](https://github.com/volcano-sh/volcano/blob/release-1.15/benchmark/README.md)
- 感谢社区开发者：\@[JesseStutler](https://github.com/JesseStutler), \@[3th4novo](https://github.com/3th4novo)

---

### 5. Scheduling Gates for Queue Admission（Alpha）

当 Pod 因为队列容量不足而无法调度时，Cluster Autoscaler 或 Karpenter 可能将这些 Pod 误判为集群资源不足，从而触发不必要的扩容。

v1.15.0 引入 Scheduling Gates for Queue Admission。用户通过 annotation 为 Pod 开启后，当队列容量不足时，Volcano 会通过 Kubernetes 原生的 `schedulingGates` 机制阻止 Pod 进入调度，使其对 autoscaler 不可见，从而不会触发扩容。等队列释放出容量后，Volcano 再移除 gate，Pod 恢复正常调度流程。

这样可以有效区分"队列配额不足"和"集群资源不足"两种情况，避免因队列 quota 限制导致的无效扩容。

该特性目前为 Alpha，需要同时在 scheduler 和 webhook-manager 中开启 `SchedulingGatesQueueAdmission`。

配置示例：

```bash
helm install volcano volcano/volcano --namespace volcano-system --create-namespace \
  --set custom.scheduler_feature_gates="SchedulingGatesQueueAdmission=true" \
  --set custom.admission_feature_gates="SchedulingGatesQueueAdmission=true"
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

相关资料：

- 相关 Issue：[volcano-sh#4710](https://github.com/volcano-sh/volcano/issues/4710)
- 相关 PR：[volcano-sh#5033](https://github.com/volcano-sh/volcano/pull/5033), [volcano-sh#4727](https://github.com/volcano-sh/volcano/pull/4727)
- 感谢社区开发者：\@[devzizu](https://github.com/devzizu)

---

## 其他值得关注的增强

### Kubernetes 1.35 支持

v1.15.0 更新了 Kubernetes 依赖、生成代码、fake client、informer、volumebinding 集成、CI/lint 工具链以及兼容性文档，支持 Kubernetes 1.35。

相关 PR：[volcano-sh#5000](https://github.com/volcano-sh/volcano/pull/5000), [volcano-sh#5039](https://github.com/volcano-sh/volcano/pull/5039), [volcano-sh#5062](https://github.com/volcano-sh/volcano/pull/5062)

感谢社区开发者：\@[guoqinwill](https://github.com/guoqinwill), \@[hajnalmt](https://github.com/hajnalmt)

---

### NodeGroup Preferred Ordering

NodeGroup plugin 新增 `enablePreferredOrder`，Queue 中 `preferredDuringSchedulingIgnoredDuringExecution` 的顺序会影响调度打分。靠前的 NodeGroup 会获得更高分数，适合"优先使用固定资源池，资源不足时再 fallback 到弹性资源池"的场景。

配置示例：

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

相关 PR：[volcano-sh#5110](https://github.com/volcano-sh/volcano/pull/5110)

感谢社区开发者：\@[ruanwenjun](https://github.com/ruanwenjun)

---

### Capacity Ancestor Reclaim Level

新增 `ancestorReclaimLevel` 配置并完善分层队列 reclaim 行为文档，允许管理员控制分层队列回收资源时考虑的祖先层级数量。

相关 PR：[volcano-sh#5115](https://github.com/volcano-sh/volcano/pull/5115)

感谢社区开发者：\@[hajnalmt](https://github.com/hajnalmt)

---

### Agent Scheduler 稳定性增强

v1.15.0 修复了 Agent Scheduler 多 worker 乐观并发冲突、共享 action 实例复用 framework/cycle state、CSI manager 注册缺失、binder 节点优先级处理以及 E2E duration metric 等问题，并补充了相关 E2E 覆盖。

这些修复主要提升了延迟敏感型 AI Agent 工作负载的调度稳定性。

相关 PR：[volcano-sh#5154](https://github.com/volcano-sh/volcano/pull/5154), [volcano-sh#5153](https://github.com/volcano-sh/volcano/pull/5153), [volcano-sh#5221](https://github.com/volcano-sh/volcano/pull/5221), [volcano-sh#5163](https://github.com/volcano-sh/volcano/pull/5163), [volcano-sh#4991](https://github.com/volcano-sh/volcano/pull/4991)

感谢社区开发者：\@[JesseStutler](https://github.com/JesseStutler), \@[qi-min](https://github.com/qi-min), \@[agrawalcodes](https://github.com/agrawalcodes)

---

### GPU/vGPU 增量增强

v1.15.0 对 deviceshare plugin 做了多项增强，包括 GPU exclusive 支持、vGPU preemption 支持，以及在不允许共享时避免同一 PodGroup 内的 Pod 使用同一张物理 vGPU 设备。

相关 PR：[volcano-sh#5213](https://github.com/volcano-sh/volcano/pull/5213), [volcano-sh#5235](https://github.com/volcano-sh/volcano/pull/5235), [volcano-sh#5049](https://github.com/volcano-sh/volcano/pull/5049)

感谢社区开发者：\@[ckyuto](https://github.com/ckyuto), \@[archlitchi](https://github.com/archlitchi), \@[goyalankit](https://github.com/goyalankit)

---

### Pod-Level Resource Request and Limit Settings

v1.15.0 现支持在 Volcano Job pod 模板中配置 pod-level 资源 request 和 limit，让用户在 VolcanoJob 内对 pod 级别的资源分配有更细粒度的控制。

相关 PR：[volcano-sh#5020](https://github.com/volcano-sh/volcano/pull/5020)

感谢社区开发者：\@[Tau721](https://github.com/Tau721)

---

### MPI Validation and Argo MPI Examples

v1.15.0 放宽了单 master MPI 作业的验证条件，并新增了 Argo MPI workflow 示例，让用户在 Argo Workflows 环境中运行 MPI 负载更加便捷。

相关 PR：[volcano-sh#4956](https://github.com/volcano-sh/volcano/pull/4956), [volcano-sh#5117](https://github.com/volcano-sh/volcano/pull/5117)

感谢社区开发者：\@[kingeasternsun](https://github.com/kingeasternsun), \@[jrbe228](https://github.com/jrbe228)

---

### 安全修复

v1.15.0 包含 webhook request body size mitigation，用于修复**CVE-2026-44247**相关的拒绝服务风险。该修复限制 admission webhook 请求体大小，避免超大请求导致 webhook server 内存耗尽。

---

### Core Scheduler 稳定性与正确性修复

改进了事务回滚、抢占/回收正确性、队列及 inqueue 资源统计、victim 排序、事件处理器同步以及调度器缓存安全性。综合起来，这些修复提升了高并发和并发事件处理下的调度器稳定性。

相关 PR：[volcano-sh#5073](https://github.com/volcano-sh/volcano/pull/5073), [volcano-sh#5180](https://github.com/volcano-sh/volcano/pull/5180), [volcano-sh#5010](https://github.com/volcano-sh/volcano/pull/5010), [volcano-sh#5011](https://github.com/volcano-sh/volcano/pull/5011), [volcano-sh#5067](https://github.com/volcano-sh/volcano/pull/5067), [volcano-sh#5141](https://github.com/volcano-sh/volcano/pull/5141), [volcano-sh#5142](https://github.com/volcano-sh/volcano/pull/5142), [volcano-sh#5113](https://github.com/volcano-sh/volcano/pull/5113), [volcano-sh#5100](https://github.com/volcano-sh/volcano/pull/5100), [volcano-sh#5130](https://github.com/volcano-sh/volcano/pull/5130), [volcano-sh#5176](https://github.com/volcano-sh/volcano/pull/5176), [volcano-sh#5091](https://github.com/volcano-sh/volcano/pull/5091), [volcano-sh#4973](https://github.com/volcano-sh/volcano/pull/4973), [volcano-sh#5172](https://github.com/volcano-sh/volcano/pull/5172), [volcano-sh#5178](https://github.com/volcano-sh/volcano/pull/5178), [volcano-sh#5086](https://github.com/volcano-sh/volcano/pull/5086)

感谢社区开发者：\@[hzxuzhonghu](https://github.com/hzxuzhonghu), \@[Sanchit2662](https://github.com/Sanchit2662), \@[Aman-Cool](https://github.com/Aman-Cool), \@[hajnalmt](https://github.com/hajnalmt), \@[goyalpalak18](https://github.com/goyalpalak18), \@[guoqinwill](https://github.com/guoqinwill), \@[qi-min](https://github.com/qi-min), \@[zhifei92](https://github.com/zhifei92)

---

## 总结

v1.15.0 的核心变化是 Gang-Aware Preemption and Resource Reclamation，将抢占决策从逐 Pod 粒度提升到 Gang 粒度，在抢占方与被抢占方两侧同时进行整体性评估，减少分布式训练场景下因随机驱逐导致的连锁任务失败。DRA Queue Quota 将 DRA 设备资源纳入已有的队列容量模型，使异构资源与 CPU、内存在配额管理上保持一致。Pluggable Multi-Sharding Policy、Benchmark 框架与 Agent Scheduler 稳定性修复，则分别完善了多调度器协同、性能基线建立与延迟敏感负载调度方面的工程能力。

Volcano 将继续面向 AI 训练、推理、Agent、HPC 与大数据等混合部署场景，持续完善统一调度平台的调度能力与工程质量。

---

## 升级注意事项

可以通过 Helm 或 YAML 方式升级到 v1.15.0：

```bash
helm repo update
helm upgrade volcano volcano-sh/volcano --version 1.15.0
```

```bash
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/v1.15.0/installer/volcano-development.yaml
```

- 当前 Gang-Aware Preemption and Resource Reclamation 特性为 Alpha 阶段，需要显式配置 `gangPreempt` 和 `gangReclaim` 两个新的 action。当前不推荐在同一个 scheduler action list 中同时配置新的 `gangPreempt`/ `gangReclaim` 和旧的 `preempt`/ `reclaim` action。
- Scheduling Gates for Queue Admission 为 Alpha，需要同时在 scheduler 和 webhook-manager 中开启。
- DRA scheduling integration 默认开启，以对齐 Kubernetes 1.34+的 DRA 默认行为。如需关闭，可设置 `predicate.DynamicResourceAllocationEnable: false`。
- DRA Queue Quota 依赖 Kubernetes DRA 支持和可用的 DRA driver。

---

## 参考链接

本文重点介绍 v1.15.0 的主要能力。完整的 API Changes、Bug Fixes、依赖更新、测试与维护项和贡献者列表，请参考正式 Release Note 及相关文档。

- Release Note: [Release Note](https://github.com/volcano-sh/volcano/releases/tag/v1.15.0)
- Full Changelog: [Full Changelog](https://github.com/volcano-sh/volcano/compare/v1.14.0...v1.15.0)

---

## 致谢

Volcano v1.15 共有 43 位社区贡献者参与。衷心感谢每一位贡献者，是你们的努力让 Volcano 不断进步，成为更强大、更稳定的统一调度平台！

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
