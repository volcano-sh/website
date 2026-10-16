---
title: "Volcano v1.16 发布：新增 NamespaceQueue 与 fairshare 并拓展 HyperNode 生态"
description: "NamespaceQueue 支持租户在自己的命名空间内使用层级队列，fairshare 将历史用量纳入公平调度。其他调度器可通过独立部署 HyperNode 控制器集成拓扑发现与超节点管理能力，Unschedulable Job Cache 则减少了积压场景下的重复调度检查。"
authors: ["volcano"]
date: 2026-10-14
tags: ["release", "volcano", "kubernetes", "scheduling"]
---

# Volcano v1.16 发布：新增 NamespaceQueue 与 fairshare 并拓展 HyperNode 生态

Volcano v1.16.0 新增 NamespaceQueue 和 fairshare 插件。NamespaceQueue 支持租户在自己的命名空间内使用 Volcano 的层级队列能力，在管理员授权的资源范围内配置队列配额、组织队列层级。fairshare 则将同一队列内各命名空间的历史资源用量纳入调度排序，改善多团队共享资源时的公平性。

本次版本还进一步拓展了 HyperNode 生态。使用其他调度器的平台，可以单独部署 HyperNode 控制器，复用拓扑发现逻辑、维护超节点及其层级关系，再通过 HyperNode API 将拓扑信息接入自己的调度流程。对于使用 Volcano 的推理服务，新增的 PodGroup 拓扑反亲和规则则可以将多个实例分散到不同超节点，降低实例集中在同一故障域的风险。

调度性能方面，新增的 Unschedulable Job Cache 缓存作业的调度失败原因，在阻塞条件未变化时跳过重复检查。节点打分、缓存更新与队列查询也有优化，进一步提升调度效率。此外，v1.16.0 还包含 Kubernetes 1.36 适配、批量 Pod 调度时的负载估算、DRA 打分，以及异构资源和稳定性方面的改进。

<!-- truncate -->

## 版本亮点

- **提升调度性能与可扩展性**：新增 Unschedulable Job Cache 减少积压场景下的重复检查，同时优化节点打分、缓存更新与队列查询。
- **新增 NamespaceQueue 支持租户在命名空间内管理队列层级**：租户可在自己的命名空间内使用层级队列，在管理员授权的资源范围内管理配额和资源分配。
- **新增 fairshare 改善租户间的长期公平性**：面向多个租户按命名空间隔离并共享同一队列的场景，引入类似 Slurm 的历史用量衰减机制。
- **通过 PodGroup 拓扑反亲和分散部署业务实例**：可以要求多个实例必须分散到不同拓扑域，也可以设置优先分散的调度偏好。
- **拓展 HyperNode 生态以支持更多调度系统**：其他调度器可复用社区已有的拓扑发现和超节点管理逻辑，无需同时运行 Volcano 的其他组件。

## 重点特性

### 1. 提升调度性能与可扩展性

v1.16.0 新增 Unschedulable Job Cache，改善大量作业等待资源时的调度性能，同时优化节点打分、缓存更新与队列查询。

**Unschedulable Job Cache**

队列配额不足、缺少满足要求的 GPU 节点、节点标签不匹配等因素，都可能导致作业持续等待。在阻塞条件未变化的情况下，逐轮执行相同检查会产生额外调度开销。随着等待作业积压，这些重复检查还会延迟满足调度条件的作业获得资源。

`UnschedulableJobCache` 记录作业未通过的调度检查，并根据插件声明的事件判断重试时机。阻塞条件未变化时，调度器跳过相应的重复检查，收到相关事件后再按正常流程重新评估作业。该机制减少了无效重试，提升了积压场景下可调度作业的调度效率。

**主要能力**：

- **按原因跳过检查**：根据记录的调度失败原因，跳过入队检查、整个作业或部分任务的重复评估，同时遵守 Gang 约束。
- **条件变化后重试**：例如，节点标签变化后重新检查节点亲和性，资源释放后重试资源不足的作业，队列配置变化后重新检查配额。存储和 DRA 插件也可以通过事件 hint 唤醒相关作业。
- **未覆盖的情况继续逐轮检查**：仅当所有拒绝该作业的插件均提供能够安全判断重试时机的事件 hint 时，才缓存该作业。其余情况仍按原有流程逐轮评估，确保重试机会不受影响。
- **不改变 Gang 和队列资源计算**：缓存中的作业仍参与资源需求计算，队列资源与 Gang 条件保持原有检查方式。作业唤醒后仍需通过完整调度检查。
- **保留兜底重试**：未收到相关事件时，watchdog 会在等待超过设定时长后触发重试，默认五分钟。缓存仅保存在内存中，调度器重启后重新建立。

该特性默认关闭，可通过调度器 feature gate 开启：

```bash
helm upgrade --install volcano volcano-sh/volcano \
  --namespace volcano-system --create-namespace --version 1.16.0 \
  --set custom.scheduler_feature_gates="UnschedulableJobCache=true"
```

目前已接入 predicates 封装的上游插件 hint，以及 Resource Fit、proportion 和非层级 capacity。因层级 capacity 检查未通过而等待的作业，以及其他缺少 hint 的插件所阻塞的作业，仍会在每轮调度中检查。排查运行情况时，可开启按 Job 记录的调试指标，查看跳过检查、事件唤醒和 watchdog 重试的次数。

相关资料：

- PR：[#5848](https://github.com/volcano-sh/volcano/pull/5848)、[#5644](https://github.com/volcano-sh/volcano/pull/5644)
- 设计与性能验证：[Unschedulable Job Cache](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/design/unschedulable-job-cache.md)
- 使用指南：[启用 Unschedulable Job Cache](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/user-guide/how_to_enable_unschedulable_job_cache.md)
- 感谢贡献者：\@[JesseStutler](https://github.com/JesseStutler)

此外，节点打分支持多个插件在同一次节点遍历中完成评分，降低多插件场景下的打分开销。节点更新与队列查询也减少了不必要的对象拷贝和遍历。([#5928](https://github.com/volcano-sh/volcano/pull/5928)、[#5556](https://github.com/volcano-sh/volcano/pull/5556)、[#5506](https://github.com/volcano-sh/volcano/pull/5506))

性能与可扩展性将持续优化。后续将结合基准测试和生产反馈，持续优化调度流程、缓存与事件处理、状态更新等环节。

---

### 2. 新增 NamespaceQueue 支持租户在命名空间内管理队列层级

不同平台采用不同的租户模型。有的平台通过集群级 Queue 为租户划分资源池，也有的平台以 namespace 作为团队或项目的管理边界，希望租户在各自命名空间内配置队列配额和层级关系。NamespaceQueue 面向后一种场景，让队列管理与租户的资源管理范围保持一致。

`NamespaceQueue` 将 Volcano 的层级队列能力扩展到命名空间。管理员通过集群 Queue 的 `spec.allowedNamespaces` 授权资源访问范围后，租户可在自己的命名空间内创建队列、建立父子队列层级，并配置 `capability`、`deserved`、`guarantee`、`reclaimable` 等资源属性。

管理员负责资源池授权，租户在授权范围内管理内部配额与队列层级。队列名称在命名空间内隔离，不同命名空间可使用相同名称。

该特性默认关闭。使用下面的 Helm 参数后，控制器、调度器和 admission webhook 会同时启用 NamespaceQueue。使用 chart 默认调度配置时，还会自动切换到层级 capacity：

```bash
helm upgrade --install volcano volcano-sh/volcano \
  --namespace volcano-system --create-namespace --version 1.16.0 \
  --set custom.namespace_queue_enable=true
```

先创建命名空间和允许接入的集群 Queue，再创建租户队列：

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

管理员还需通过 RBAC 授予租户在本命名空间内操作 `namespacequeues` 的权限。确认 NamespaceQueue 的 `Ready=True`、`Authorized=True` 后，`team-a` 中的 Job 或 PodGroup 即可使用下面的引用：

```yaml
spec:
  queue: namespace/training
```

提交作业时，不带前缀的队列名仍指向原有的集群 Queue。设置 NamespaceQueue 的父队列时，`cluster/<name>` 指向集群 Queue，普通名称则指向同命名空间内的 NamespaceQueue。使用 NamespaceQueue 需要启用层级 capacity，不应同时启用 proportion。

相关资料：

- PR：[#5590](https://github.com/volcano-sh/volcano/pull/5590)、[#5629](https://github.com/volcano-sh/volcano/pull/5629)
- 使用指南：[NamespaceQueue 用户指南](https://volcano.sh/zh-Hans/docs/UserGuide/user_guide_how_to_use_namespace_queue)
- 设计文档：[命名空间级队列](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/design/namespace-queue.md)
- 感谢贡献者：\@[gitGurugu](https://github.com/gitGurugu)

---

### 3. 新增 fairshare 改善租户间的长期公平性

Volcano 原有的资源共享与配额治理主要围绕集群级 Queue 展开，适合为租户分配独立队列的模型。另一类平台以 namespace 作为团队或项目的隔离边界，多个租户向同一个 Queue 提交作业，需要在队列内部获得公平的调度机会。两种模型对应不同的资源管理需求。

在共享队列中，仅依据当前资源分配量排序，难以反映各租户一段时间内的累计消耗。例如，一个团队持续提交 GPU 作业，已有作业完成后又继续占用释放的资源，后续加入的团队可能长期等待。

新增的 `fairshare` 插件借鉴 Slurm 的 fair-share 思路，以 namespace 标识租户，记录同一队列内各命名空间的累计资源用量（资源数量与使用时长的乘积），优先调度历史用量较少的命名空间。历史用量按指数衰减，默认半衰期为四小时，较早用量对调度排序的影响逐步降低。

fairshare 可与 DRF 配合使用，将历史资源用量作为当前资源分配之外的补充排序依据。插件通过调整等待作业的顺序改善公平性，也可按需限制新作业入队，不会抢占运行中的作业。用户可配置生效队列、统计资源类型，以及是否通过 ConfigMap 持久化历史用量。

调度配置示例：

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

配置时应将 `fairshare` 排在 `drf` 之前，否则作业顺序可能由 DRF 优先决定。如需保持 PriorityClass 的排序优先级，应将 `priority` 排在前面。历史用量持久化与入队限制默认关闭。

相关资料：

- 特性 PR：[#5161](https://github.com/volcano-sh/volcano/pull/5161)
- 设计文档：[Fair Share Scheduling](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/design/fairshare.md)
- 使用指南：[fairshare 插件](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/user-guide/how_to_use_fairshare_plugin.md)
- 特性贡献者：\@[dmildh-absci](https://github.com/dmildh-absci)

---

### 4. 通过 PodGroup 拓扑反亲和分散部署业务实例

推理服务运行多个实例时，同一实例的 Pod 通常需要在拓扑上集中部署，以减少通信开销，不同实例则需要分散到不同故障域，降低单个超节点故障的影响。原有 `networkTopology` 可以限制一个 PodGroup 内部的调度范围，但多个 PodGroup 仍可能集中在同一个超节点。

新增的 `group-topology-affinity` 插件可以约束不同 PodGroup 之间的调度位置。用户可通过标签选择器匹配需要分散部署的 PodGroup，并指定机架、超节点等 HyperNode 层级。required 规则强制将匹配的 PodGroup 部署到不同拓扑域，preferred 规则则优先选择不同拓扑域。结合 `networkTopology`，可同时满足实例内部集中部署与实例之间分散部署的需求。选择范围既可以限于当前命名空间，也可以通过 namespace selector 扩展到其他命名空间。

在现有调度插件列表中加入以下配置，并保留原有 action 和其他插件：

```yaml
- name: group-topology-affinity
  arguments:
    weight: 10
- name: network-topology-aware
  arguments:
    weight: 10
```

假设 HyperNode 拓扑中已有 `supernode` 层级，可以为需要分散部署的每个 PodGroup 配置相同规则，并分别设置名称：

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

成员 Pod 需要使用 `schedulerName: volcano`，并通过 `scheduling.k8s.io/group-name` 注解关联对应 PodGroup。选择器匹配的是 PodGroup 标签。每条规则必须在 `topologyTierName` 和 `topologyTier` 中选择一个，偏好规则还需设置 1 到 100 的权重。

当前规则只在 `allocate` 阶段生效，backfill 调度的 BestEffort Pod 不受这些规则约束。目前还不支持 SubGroup 之间的亲和与反亲和、跨 PodGroup 亲和，以及运行中 Pod 的自动迁移。

相关资料：

- PR：[#5349](https://github.com/volcano-sh/volcano/pull/5349)
- 设计文档：[PodGroup 拓扑亲和性设计](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/design/group-topology-affinity.md)
- 使用指南：[PodGroup 反亲和性](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/user-guide/how_to_use_podgroup_anti_affinity.md)
- 感谢贡献者：\@[wangyang0616](https://github.com/wangyang0616)

---

### 5. 拓展 HyperNode 生态以支持更多调度系统

使用其他调度器的平台，也需要发现集群拓扑、维护超节点及其层级关系。此前，这些平台若需复用 HyperNode，仍需运行 Volcano 的 controller manager。v1.16.0 新增 HyperNode 控制器独立部署方式，为其他调度系统集成拓扑发现与超节点管理能力提供支持，进一步拓展 HyperNode 生态。

平台可单独部署 HyperNode 控制器，复用社区已有的 UFM、节点标签等拓扑发现方式，由控制器自动创建和更新 HyperNode 资源，维护超节点及其层级关系。其他调度器通过 HyperNode API 获取拓扑信息，并结合业务需求实现拓扑感知调度，无需同时运行 Volcano 调度器和其他控制器。

独立控制器与原有集成模式共用拓扑发现和 HyperNode 管理逻辑，后续社区增加的发现方式也可以在两种模式中复用。不同调度系统可共享拓扑发现与超节点管理能力，各平台的相关改进也可贡献到同一套实现中。

本次提供了独立的 `vc-hypernode-controller-manager` 二进制、镜像和 Helm Deployment。chart 可选择 `controller-manager`、`standalone` 或 `disabled` 模式，默认仍由原有 controller manager 管理 HyperNode。只部署 HyperNode 控制器时，可以使用：

```bash
helm upgrade --install volcano volcano-sh/volcano \
  --namespace volcano-system --create-namespace --version 1.16.0 \
  --set custom.hypernode_controller_mode=standalone \
  --set custom.controller_enable=false \
  --set custom.scheduler_enable=false \
  --set custom.admission_enable=false
```

拓扑发现仍通过 `custom.controller_config_override` 配置。如果要保留其他 Volcano 组件，只需调整 HyperNode 模式。从现有部署切换时，先设置为 `disabled`，等待 controller manager 完成滚动更新，再启用 `standalone`，确保同一时间只有一个进程管理 HyperNode。

相关资料：

- PR：[#5137](https://github.com/volcano-sh/volcano/pull/5137)、[#5136](https://github.com/volcano-sh/volcano/pull/5136)
- 设计文档：[HyperNode 控制器独立部署](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/design/hypernode-controller-standalone.md)
- 使用指南：[部署独立 HyperNode 控制器](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/user-guide/how_to_install_standalone_hypernode_controller.md)
- 拓扑发现配置：[HyperNode Auto Discovery](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/user-guide/how_to_use_hypernode_auto_discovery.md)
- 感谢贡献者：\@[wangyang0616](https://github.com/wangyang0616)

---

## 其他值得关注的增强

### 批量 Pod 调度时的负载估算

监控指标存在采集与更新延迟。批量调度 Pod 时，新分配的任务可能尚未反映在监控数据中，调度器可能因此低估节点负载，继续向这些节点分配任务。

`usage` 插件新增 session 级的 shadow load cache，预估尚未反映在监控数据中的 Pod 的 CPU 和内存用量。节点打分时，调度器综合考虑预估用量与实际监控值，减少指标延迟导致的负载误判。缓存保留每个 Pod 的预估值，回滚时扣除对应原值，避免重新计算引入资源用量偏差。

可在现有调度配置中补充以下插件参数，同时保留监控数据源配置：

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

用户可以通过 `request_ratio`、`burst_ratio` 和 `risk_factor` 等参数调整估算方式，也可以设置 BestEffort Pod 的固定预估用量。插件根据 `metrics.interval` 识别可能尚未反映在监控数据中的 Pod，该值默认为 30 秒。

相关资料：[PR #5314](https://github.com/volcano-sh/volcano/pull/5314)、[Usage-Based Scheduling](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/design/usage-based-scheduling.md)。感谢贡献者 \@[3th4novo](https://github.com/3th4novo)。

### 按 NodeGroup 设置队列资源限额

通过 NodeGroup 插件新增的队列注解，用户可分别设置队列在各 NodeGroup 中的资源使用上限。例如，先使用固定资源池，达到队列在该池中的限额后，再将新增任务调度到其他允许使用的资源池。

```yaml
metadata:
  annotations:
    volcano.sh/nodegroup-resource-limits: |
      {"fixed": {"cpu": "100", "memory": "200Gi"}, "overflow": {"cpu": "50"}}
```

只限制注解中列出的资源项，未配置的资源不受额外限制。子队列不会继承父队列的这项配置，需要限制用量的队列应各自设置注解。

相关资料：[PR #5461](https://github.com/volcano-sh/volcano/pull/5461)、[NodeGroup 使用指南](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/user-guide/how_to_use_nodegroup_plugin.md)。感谢贡献者 \@[ruanwenjun](https://github.com/ruanwenjun)。

### 基于 Pod 级分配信息提高 NUMA 资源判断准确性

原有节点级 NUMA 汇总信息难以准确区分资源释放和新任务分配。如果节点上的 Pod 释放 CPU 时，另一批 Pod 已完成调度但尚未由 kubelet 分配资源，汇总数据的变化可能导致调度器误判可用 CPU，进而错误拒绝实际满足 NUMA 策略的任务。

Numatopology 新增 `spec.podAllocations`，记录 Pod UID、名称、命名空间及各容器的资源分配，CPU 使用 cpuset 表示。调度器结合 Pod 级实际分配与尚待分配的任务，更新节点 NUMA 资源视图，减少资源信息失真导致的 NUMA 策略误判。细粒度信息也便于定位容器的 CPU 分配与资源占用。使用该能力需配套支持新字段的 resource-exporter。([#5467](https://github.com/volcano-sh/volcano/pull/5467)、[#5504](https://github.com/volcano-sh/volcano/pull/5504))

### DRA 与异构资源调度

- **DRA 打分**：调度使用 DRA 优先级设备请求的 Pod 时，接入上游 DynamicResources 的打分及归一化逻辑。([#5728](https://github.com/volcano-sh/volcano/pull/5728))
- **HAMi Ascend 软切分**：接入 `hami-vnpu-core`，支持设备内存虚拟化与算力时间片共享，需要配套的设备插件和运行时。完整配置请参考 [vNPU 使用指南](https://github.com/volcano-sh/volcano/blob/v1.16.0/docs/user-guide/how_to_use_vnpu.md)。([#5462](https://github.com/volcano-sh/volcano/pull/5462)、[#5722](https://github.com/volcano-sh/volcano/pull/5722))
- **Ascend 健康检查**：根据 allocatable 设备信息判断 vNPU 健康状态。([#5418](https://github.com/volcano-sh/volcano/pull/5418))
- **vGPU 选择与一致性修复**：新增按 GPU UUID 设置允许和排除列表的注解，并修复绑定与回滚过程中的设备分配元数据一致性问题。([#5726](https://github.com/volcano-sh/volcano/pull/5726)、[#5588](https://github.com/volcano-sh/volcano/pull/5588))

### HyperNode 发现与拓扑调度一致性

- **拓扑更新与发现**：修正 HyperNode 更新时的拓扑重建行为，避免 informer 缓存延迟导致重复创建 HyperNode，并在 UFM endpoint 配置缺失或类型错误时返回错误而非触发 panic。([#5076](https://github.com/volcano-sh/volcano/pull/5076)、[#5894](https://github.com/volcano-sh/volcano/pull/5894)、[#6057](https://github.com/volcano-sh/volcano/pull/6057))
- **抢占与回收后的拓扑选择**：保留并优先处理跨调度周期的 SubJob HyperNode nomination，未启用 hard 拓扑约束的作业也会遵循该结果，使 Gang 抢占或回收释放的资源能够按预期用于后续放置。([#5440](https://github.com/volcano-sh/volcano/pull/5440)、[#5476](https://github.com/volcano-sh/volcano/pull/5476))

### Grove 与 KubeRay 接入多级 Gang 调度

Grove 和 KubeRay 已接入 Volcano 的多级 Gang 调度能力，为不同角色和副本提供更细粒度的调度支持。

- **Grove**：已合入 Volcano 调度后端，将不同角色映射为 PodGroup 内的 SubGroup，支持按角色设置 Gang 约束。([PR #516](https://github.com/ai-dynamo/grove/pull/516))
- **KubeRay**：已合入 `SubGroupPolicy` 支持，将 Ray worker group 的副本配置转换为 Gang 约束，支持按完整副本进行调度，包括由多个 Pod 组成的多主机副本。([PR #5249](https://github.com/ray-project/kuberay/pull/5249))

两项集成目前都侧重于 Gang 约束，尚未接入 SubGroup 级网络拓扑感知调度。

注：多级 Gang 调度自 Volcano v1.14 起已支持，并不限定于 v1.16。

### Kubernetes 兼容与运行管理

v1.16.0 支持 Kubernetes 1.36，依赖版本升级到 Kubernetes 1.36.1，源码构建需要 Go 1.26。存储绑定改用上游 VolumeBinding 实现，并同步更新客户端代码、RBAC、安装清单和 CI 配置。([#5287](https://github.com/volcano-sh/volcano/pull/5287))

运维方面，用户可以调整负责更新 Job、Task 状态的 worker 数量，并通过新增指标查看队列中的工作负载状态和调度器提交的驱逐事务。Volcano agent 也支持 Pod 级资源配置，计算资源请求时会计入原生 sidecar 与 Pod overhead。([#5873](https://github.com/volcano-sh/volcano/pull/5873)、[#5826](https://github.com/volcano-sh/volcano/pull/5826)、[#5754](https://github.com/volcano-sh/volcano/pull/5754)、[#5656](https://github.com/volcano-sh/volcano/pull/5656)、[#5822](https://github.com/volcano-sh/volcano/pull/5822))

新增的 inqueue 资源指标可展示已准入但尚未运行的作业预留的 CPU、内存和标量资源，帮助定位队列配额不足的原因。([#5243](https://github.com/volcano-sh/volcano/pull/5243))

### 稳定性与正确性修复

- 修复准入失败后仍占用 inqueue 预留资源的问题，以及 scheduling gate 预留资源未计入祖先队列的问题。([#5339](https://github.com/volcano-sh/volcano/pull/5339)、[#6047](https://github.com/volcano-sh/volcano/pull/6047))
- 避免已完成的 PodGroup 在 Pod 删除后重新进入队列并预留资源，也避免正在终止的任务退回 Inqueue 状态。([#5996](https://github.com/volcano-sh/volcano/pull/5996)、[#5796](https://github.com/volcano-sh/volcano/pull/5796))
- 修复 PVC informer 尚未同步导致 Pod 无法进入正常调度的问题，以及重建 Pod 被写入旧 PodGroup 注解的问题。([#5596](https://github.com/volcano-sh/volcano/pull/5596)、[#5344](https://github.com/volcano-sh/volcano/pull/5344))
- 修复 Agent Scheduler 提前退出时的队列处理，以及占位节点导致的增量快照空指针问题。([#5560](https://github.com/volcano-sh/volcano/pull/5560)、[#5927](https://github.com/volcano-sh/volcano/pull/5927))
- 资源回收在提交前重新检查设备可用性，避免提交无法满足设备需求的回收决策。([#5855](https://github.com/volcano-sh/volcano/pull/5855))
- 修正节点打分与 PreFilter 的插件接入，确保批量预计算和跳过检查的结果按预期生效。([#5497](https://github.com/volcano-sh/volcano/pull/5497)、[#5505](https://github.com/volcano-sh/volcano/pull/5505)、[#5542](https://github.com/volcano-sh/volcano/pull/5542))

### 安全修复

v1.16.0 修复了 [GHSA-j38h-7pfq-cxmw](https://github.com/volcano-sh/volcano/security/advisories/GHSA-j38h-7pfq-cxmw)。在 DRA 容量计算中，过大的设备数量或最小任务数可能导致长时间循环计算。计算过程持续持有缓存锁时，也会阻塞其他命名空间作业的调度。

通过 ResourceClaim 触发该问题，需要集群支持 DRA 并显式开启 `DRAConsumableCapacity`，用户还需有权限创建带容量维度的 `ExactCount` 请求，以及引用该请求的 Pod。修复后，容量计算改用乘法，不再按用户指定的数量逐次累加，同时加强数量校验和溢出处理。

受影响版本为 v1.15.0 和 v1.15.1，修复已随 v1.15.2 首次发布，v1.16.0 同样包含修复。风险等级为**中危，CVSS 6.5**，使用受影响版本的用户应及时升级。感谢 \@[thc1006](https://github.com/thc1006) 报告并修复该问题，以及 \@[JesseStutler](https://github.com/JesseStutler) 协调安全公告发布。

---

## 升级注意事项

可通过 Helm 或安装清单升级到 v1.16.0：

```bash
helm repo add volcano-sh https://volcano-sh.github.io/helm-charts
helm repo update
helm upgrade volcano volcano-sh/volcano \
  --namespace volcano-system --version 1.16.0
```

```bash
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/v1.16.0/installer/volcano-development.yaml
```

- 使用 NamespaceQueue 或新的 PodGroup、Numatopology 字段前，应同步更新 CRD、RBAC 和控制面组件。
- NamespaceQueue 与 UnschedulableJobCache 默认关闭。NamespaceQueue 依赖层级 capacity，而本次缓存实现暂不缓存层级 capacity 的拒绝结果。
- 启用 fairshare 前应检查插件顺序，启用拓扑反亲和性前应确认其生效范围。
- 自定义拓扑插件需要适配 `HyperNodeGradientResult` 并重新构建，同时检查 Kubernetes 1.36 集成接口的变化。源码构建需要 Go 1.26。
- 将 HyperNode 切换到独立控制器时，应先完成 `disabled` 模式的滚动更新，再启用 `standalone`。
- 现有 Volcano CRD 增加了 Helm 卸载保留注解，但本次新增的 NamespaceQueue CRD 尚未带有该注解。重新安装前应确认资源保留与归属。

## 参考链接

本文介绍 v1.16.0 的主要能力，完整 API 变化、问题修复、依赖更新及维护项请参考 Release Note。

- [Release Note](https://github.com/volcano-sh/volcano/releases/tag/v1.16.0)
- [完整变更记录](https://github.com/volcano-sh/volcano/compare/v1.15.0...v1.16.0)

## 致谢

Volcano v1.16 共有 65 位贡献者参与。衷心感谢每一位贡献者在功能开发、问题修复、测试、文档和评审中的投入，推动 Volcano 持续提升调度能力与稳定性！参与本次版本合并 PR 的作者包括：

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
