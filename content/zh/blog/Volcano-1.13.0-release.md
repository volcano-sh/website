+++
title =  "Volcano v1.13 重磅发布！大模型训练与推理等调度能力全面增强"
description = "新增特性：支持LeaderWorkerSet用于大模型推理场景、新增Cron VolcanoJob、支持基于标签的HyperNode自动发现、新增原生Ray框架支持、新增HCCL插件支持、增强NodeGroup功能、引入ResourceStrategyFit插件、混部能力与操作系统解耦、支持自定义超卖资源名称、支持Kubernetes v1.33等"
subtitle = ""

date = 2025-09-29
lastmod = 2025-09-29
datemonth = "Sep"
dateyear = "2025"
dateday = "29"

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["volcano"]

tags = ["Practice"]
summary = "新增特性：支持LeaderWorkerSet用于大模型推理场景、新增Cron VolcanoJob、支持基于标签的HyperNode自动发现、新增原生Ray框架支持、新增HCCL插件支持、增强NodeGroup功能、引入ResourceStrategyFit插件、混部能力与操作系统解耦、支持自定义超卖资源名称、支持Kubernetes v1.33等"

# Add menu entry to sidebar.
linktitle = "Volcano v1.13 重磅发布！大模型训练与推理等调度能力全面增强"
[menu.posts]
parent = "tutorials"
weight = 5
+++

# Volcano v1.13 重磅发布！大模型训练与推理等调度能力全面增强

北京时间2025年9月29日，<a href="https://github.com/volcano-sh/volcano/releases/tag/v1.13.0">Volcano v1.13 版本</a>[1]正式发布。本次更新在多方面进行了功能增强，为用户提供更完善的云原生批量计算解决方案。

## 版本亮点

v1.13.0版本的主要更新包括：

**AI训练与推理增强**

- [支持LeaderWorkerSet用于大模型推理场景](#支持leaderworkerset用于大模型推理场景)
- [新增Cron VolcanoJob](#新增cron-volcanojob)
- [支持基于标签的HyperNode自动发现](#支持基于标签的hypernode自动发现)
- [新增原生Ray框架支持](#新增原生ray框架支持)
- [新增HCCL插件支持](#新增hccl插件支持)

**资源管理与调度增强**

- [引入ResourceStrategyFit插件](#引入resourcestrategyfit插件)
  - [按资源类型独立评分策略](#按资源类型独立评分策略)
  - [稀缺资源避让(SRA)](#稀缺资源避让sra)
- [增强NodeGroup功能](#增强nodegroup功能)

**混部能力增强**

- [混部能力与操作系统解耦](#混部能力与操作系统解耦)
- [支持自定义超卖资源名称](#支持自定义超卖资源名称)

## 支持LeaderWorkerSet用于大模型推理场景

[LeaderWorkerSet (LWS)](https://github.com/kubernetes-sigs/lws) 是一个用于在Kubernetes上部署一组Pod的API。它主要用于解决AI/ML推理工作负载中的多主机推理问题，特别是需要对大型语言模型(LLM)进行分片并在多个节点的多个设备上运行的场景。

自开源以来，Volcano一直积极与上下游生态集成，构建了涵盖AI和大数据等批量计算的全面社区生态。在LWS的[v0.7](https://github.com/kubernetes-sigs/lws/releases/tag/v0.7.0)版本中，它原生集成了Volcano的AI调度能力。与新版本的Volcano配合使用时，LWS会自动创建PodGroup，然后由Volcano进行调度和管理，从而为大模型推理场景实现Gang调度等高级能力。

展望未来，Volcano将继续扩展其生态集成能力，为更多致力于在Kubernetes上实现分布式推理的项目提供强大的调度和资源管理支持。

使用文档：[LeaderWorkerSet With Gang](https://github.com/kubernetes-sigs/lws/tree/main/docs/examples/sample/gang-scheduling)。

相关PRs：https://github.com/kubernetes-sigs/lws/pull/496, https://github.com/kubernetes-sigs/lws/pull/498

感谢社区开发者：@[JesseStutler](https://github.com/JesseStutler)

## 新增Cron VolcanoJob

本次版本引入了对Cron Volcano Job的支持。用户现在可以根据预定义的调度计划定期创建和运行Volcano Job，类似于Kubernetes原生的CronJob，以实现批量计算任务(如AI和大数据)的定期执行。详细功能如下：

- **定时执行**：使用标准的Cron表达式(`spec.schedule`)定义作业的执行周期。
- **时区支持**：在`spec.timeZone`中设置时区，确保作业在预期的本地时间执行。
- **并发策略**：通过`spec.concurrencyPolicy`控制并发行为：
  - `AllowConcurrent`：允许多个作业并发执行(默认)。
  - `ForbidConcurrent`：如果前一个作业尚未完成，则跳过当前的调度执行。
  - `ReplaceConcurrent`：如果前一个作业仍在运行，则终止它并启动新的作业。
- **历史管理**：配置要保留的成功(`successfulJobsHistoryLimit`)和失败(`failedJobsHistoryLimit`)作业历史记录的数量；旧作业会自动清理。
- **错过调度处理**：`startingDeadlineSeconds`字段允许在一定时间范围内容忍调度延迟；超时被视为错过执行。
- **状态跟踪**：CronJob状态(`status`)跟踪当前活动的作业、上次调度时间和上次成功完成时间，便于监控和管理。

相关PRs：https://github.com/volcano-sh/apis/pull/192, https://github.com/volcano-sh/volcano/pull/4560

感谢社区开发者：@[GoingCharlie](https://github.com/volcano-sh/volcano/commits?author=GoingCharlie), @[hwdef](https://github.com/hwdef), @[Monokaix](https://github.com/volcano-sh/volcano/commits?author=Monokaix)

使用示例：[Cron Volcano Job Example](https://github.com/volcano-sh/volcano/blob/master/example/cronjob/cronjob.yaml)。

## 支持基于标签的HyperNode自动发现

Volcano在v1.12版本中正式推出了网络拓扑感知调度能力，并率先实现了基于InfiniBand (IB)网络的UFM自动发现机制。然而，对于不支持IB网络或使用其他网络架构(如以太网)的硬件集群，手动维护网络拓扑仍然繁琐。

为解决这一问题，新版本引入了**基于标签的HyperNode自动发现机制**。此功能为用户提供了一种通用且灵活的方式来描述网络拓扑，将复杂的拓扑管理任务转化为简单的节点标签管理。

该机制允许用户在volcano-controller-configmap中定义拓扑层级与节点标签之间的对应关系。Volcano控制器会定期扫描集群中的所有节点，并根据它们的标签自动执行以下任务：

- **自动拓扑构建**：根据节点上的一组标签，自动从上到下构建多层HyperNode拓扑结构(例如，机架 -> 交换机 -> 节点)。
- **动态维护**：当节点标签发生变化，或添加、删除节点时，控制器会自动更新HyperNode的成员和结构，确保拓扑信息与集群状态保持一致。
- **支持多种拓扑类型**：允许用户同时定义多个独立的网络拓扑，以适应不同的硬件集群(例如，GPU集群、NPU集群)或不同的网络分区。

配置示例：

```yaml
# volcano-controller-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: volcano-controller-configmap
  namespace: volcano-system
data:
  volcano-controller.conf: |
    networkTopologyDiscovery:
      - source: label
        enabled: true
        interval: 10m # 发现间隔
        config:
          networkTopologyTypes:
            # 定义一个名为topology-A的拓扑类型
            topology-A:
              # 定义拓扑层级，从上到下排序
              - nodeLabel: "volcano.sh/hypercluster" # 顶层HyperNode
              - nodeLabel: "volcano.sh/hypernode"   # 中间层HyperNode
              - nodeLabel: "kubernetes.io/hostname" # 底层物理节点
```

此功能通过在Volcano控制器的ConfigMap中添加标签源来启用。上述配置定义了一个名为`topology-A`的三层拓扑结构：

- 顶层(Tier 2)：由`volcano.sh/hypercluster`标签定义。
- 中间层(Tier 1)：由`volcano.sh/hypernode`标签定义。
- 底层：物理节点，由Kubernetes内置的`kubernetes.io/hostname`标签标识。

当节点被标记如下时，它将被自动识别并分类到拓扑路径`cluster-s4 -> node-group-s0`：

```yaml
# 节点node-0的标签
labels:
  kubernetes.io/hostname: node-0
  volcano.sh/hypernode: node-group-s0
  volcano.sh/hypercluster: cluster-s4
```

基于标签的网络拓扑自动发现功能提供了出色的通用性和灵活性。它不依赖于特定的网络硬件(如IB)，适用于各种异构集群，并允许用户通过标签灵活定义任意深度的层级结构。它将复杂的拓扑维护任务自动化为简单的节点标签管理，显著降低了运维成本和错误风险。此外，该机制可以动态适应集群节点和标签的变化，实时保持拓扑信息的准确性，无需手动干预。

相关PR：https://github.com/volcano-sh/volcano/pull/4629

感谢社区开发者：@[zhaoqi612](https://github.com/zhaoqi612)

使用文档：[HyperNode Auto Discovery](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_hypernode_auto_discovery.md)。

## 新增原生Ray框架支持

[Ray](https://docs.ray.io/) 是一个开源的统一分布式计算框架，其核心目标是简化从单机到大规模集群的并行计算，特别适合扩展Python和AI应用。为了在Kubernetes上管理和运行Ray，社区提供了KubeRay——一个专为Kubernetes设计的操作器。它充当Kubernetes和Ray框架之间的桥梁，极大地简化了Ray集群和作业的部署和管理。

历史上，在Kubernetes上运行Ray工作负载主要依赖于KubeRay Operator。KubeRay在其[v0.4.0版本(2022年发布)](https://docs.ray.io/en/master/cluster/kubernetes/k8s-ecosystem/volcano.html)中集成了Volcano，用于Ray集群的调度和资源管理，解决了分布式训练场景中的资源死锁等问题。随着Volcano新版本的推出，用户现在可以直接通过原生Volcano Job创建和管理Ray集群并提交计算任务。这为Ray用户提供了另一种使用方案，允许他们更直接地利用Volcano的Gang调度、队列管理和公平调度以及作业生命周期管理等能力来运行Ray工作负载。

相关PR：https://github.com/volcano-sh/volcano/pull/4581

感谢社区开发者：@[Wonki4](https://github.com/Wonki4)

设计文档：[Ray Framework Plugin Design Doc](https://github.com/volcano-sh/volcano/blob/master/docs/design/distributed-framework-plugins.md)。

使用文档：[Ray Plugin User Guide](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_ray_plugin.md)。

## 新增HCCL插件支持

新版本为Volcano Job添加了HCCL Rank插件(`hcclrank`)，用于在分布式任务中自动为Pod分配HCCL Rank。这包括：

- Volcano Job的`hcclrank`插件的新实现，支持根据任务类型(master/worker)和索引自动计算HCCL Rank并注入到Pod注解中。
- 该插件支持自定义master/worker任务名称，允许用户在分布式任务中指定master/worker角色。

此功能增强了Volcano对HCCL通信场景(如华为昇腾)的原生支持，便于AI训练任务中Rank的自动管理和分配。

相关PR：https://github.com/volcano-sh/volcano/pull/4524

感谢社区开发者：@[kingeasternsun](https://github.com/kingeasternsun)

## 增强NodeGroup功能

在层级队列结构中，为每个子队列重复配置与其父队列相同的节点组亲和性(`nodeGroupAffinity`)会导致配置冗余且难以维护。

为解决这个问题，Nodegroup插件添加了对层级队列内亲和性继承的支持。启用后，调度器根据以下规则解析队列的有效亲和性：

1. **优先自身配置**：如果队列定义了`spec.affinity`，则直接使用此配置。
2. **向上继承**：如果队列没有定义`spec.affinity`，则向上搜索其父队列，并继承最近的祖先队列定义的亲和性配置。
3. **覆盖能力**：子队列可以通过定义自己的`spec.affinity`来覆盖继承的配置，确保灵活性。

此功能允许管理员在父队列(例如部门级别)设置统一的节点组亲和性，所有子队列(例如团队级别)将自动继承此设置，简化管理。

对于没有NodeAffinity配置的队列，插件中的"strict"参数控制调度行为。当`strict`设置为`true`(默认值)时，这些队列中的任务无法调度到任何节点。当`strict`设置为`false`时，允许这些任务调度到没有`volcano.sh/nodegroup-name`标签的常规节点。

在调度器配置文件的nodegroup插件参数中，设置`enableHierarchy: true`启用层级队列模式，设置`strict: false`配置非严格模式。示例配置如下：

```yaml
actions: "allocate, backfill, preempt, reclaim"
tiers:
- plugins:
  - name: nodegroup
    arguments:
      enableHierarchy: true # 启用层级支持
      strict: false # 设置为非严格模式，允许队列中的任务调度到没有"volcano.sh/nodegroup-name"标签的节点
```

相关PRs：https://github.com/volcano-sh/volcano/pull/4455

感谢社区开发者：@[JesseStutler](https://github.com/JesseStutler), @[wuyueandrew](https://github.com/wuyueandrew)

NodeGroup设计文档：[NodeGroup Design.](https://github.com/volcano-sh/volcano/blob/master/docs/design/node-group.md)

NodeGroup使用文档：[NodeGroup User Guide.](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_nodegroup_plugin.md)

## 引入ResourceStrategyFit插件

在Kubernetes原生的`noderesources` fit策略中，只能对所有资源应用单一的聚合(`MostAllocated`)或分散(`LeastAllocated`)策略。这在复杂的异构计算环境(如AI/ML集群)中存在局限性。为满足差异化的调度需求，Volcano引入了增强的`ResourceStrategyFit`插件。

该插件现在集成了两个核心功能：按资源类型独立评分策略和稀缺资源避让(SRA)。

### 按资源类型独立评分策略

此功能允许用户为不同的资源(例如cpu、memory、nvidia.com/gpu)独立指定`MostAllocated`(binpack)或`LeastAllocated`(spread)策略，并为它们分配不同的权重。调度器根据每种资源的独立配置精细计算节点分数。

为简化同一系列资源的管理(例如，同一供应商的不同型号GPU)，此功能还支持资源名称的后缀通配符(`*`)匹配。

- **语法规则**：仅支持后缀通配符，例如`nvidia.com/gpu/*`。像`*`或`vendor.*/gpu`这样的模式被视为无效。
- **匹配优先级**：使用"最长前缀匹配"原则。精确匹配具有最高优先级；当不存在精确匹配时，选择具有最长前缀的通配符模式。

配置示例：以下配置为特定的V100 GPU型号设置高优先级binpack策略，为所有其他NVIDIA GPU设置通用binpack策略，为CPU资源设置spread策略。还支持Pod级别的资源评分策略配置。

```yaml
actions: "enqueue, allocate, backfill, reclaim, preempt"
tiers:
- plugins:
  - name: resource-strategy-fit
    arguments:
      resourceStrategyFitWeight: 10
      resources:
        # 精确匹配，最高优先级
        nvidia.com/gpu-v100:
          type: MostAllocated
          weight: 3
        # 通配符匹配，适用于所有其他NVIDIA GPU
        nvidia.com/gpu/*:
          type: MostAllocated
          weight: 2
        # CPU资源的精确匹配
        cpu:
          type: LeastAllocated
          weight: 1
```

### 稀缺资源避让(SRA)

SRA是一种"软"策略，旨在提高昂贵或稀缺资源(如GPU)的整体利用率。它影响节点评分，引导不需要特定稀缺资源的普通任务(例如，仅需CPU的任务)尽可能避免包含这些资源的节点。这有助于为真正需要稀缺资源的任务"保留"稀缺资源节点，从而减少资源争用和任务等待时间。

机制：

1. 用户在配置中定义一组"稀缺资源"(例如`nvidia.com/gpu`)。
2. 当调度不请求任何定义的稀缺资源的Pod时，SRA策略生效。
3. 调度器降低拥有这些稀缺资源的节点的分数。节点拥有的稀缺资源类型越多，其分数越低。
4. 对于请求稀缺资源的Pod，SRA策略不会对其调度决策产生负面影响。

配置示例：以下配置将`nvidia.com/gpu`定义为稀缺资源。当调度仅需CPU的任务时，拥有GPU的节点的分数将降低，使任务更有可能调度到没有GPU的节点。

```yaml
actions: "enqueue, allocate, backfill, reclaim, preempt"
tiers:
- plugins:
  - name: resource-strategy-fit
    arguments:
      # ... resourceStrategyFit的binpack/spread策略配置 ...
      resources:
        nvidia.com/gpu:
          type: MostAllocated
          weight: 2
        cpu:
          type: LeastAllocated
          weight: 1
      # SRA策略配置
      sra:
        enable: true
        resources: "nvidia.com/gpu" # 定义稀缺资源列表，逗号分隔
        weight: 10 # SRA策略在总分中的权重
        resourceWeight:
          nvidia.com/gpu: 1 # 将nvidia.com/gpu定义为稀缺资源及其权重
```

通过结合ResourceStrategyFit的binpack/spread策略和SRA的避让策略，用户可以实现对异构资源更精细和高效的调度。

相关PRs：https://github.com/volcano-sh/volcano/pull/4391, https://github.com/volcano-sh/volcano/pull/4454, https://github.com/volcano-sh/volcano/pull/4512

感谢社区开发者：@[LY-today](https://github.com/LY-today), @[XbaoWu](https://github.com/XbaoWu), @[ditingdapeng](https://github.com/ditingdapeng), @[kingeasternsun](https://github.com/kingeasternsun)

设计文档：[ResourceStrategyFit Design](https://github.com/volcano-sh/volcano/blob/master/docs/design/resource-strategy-fit-scheduling.md)

使用文档：[ResourceStrategyFit User Guide](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_resource_strategy_fit_plugin.md)

## 混部能力与操作系统解耦

Volcano的混部能力由两部分组成：应用级和内核级。应用级混部为在线和离线工作负载提供统一调度、动态资源超卖、节点压力驱逐等功能。内核级混部涉及在内核级别对CPU、内存和网络等资源的QoS保证，通常需要特定操作系统(如OpenEuler)的支持。在新版本中，Volcano将混部能力与操作系统解耦。对于使用不支持内核级混部的操作系统的用户，他们可以选择使用Volcano的应用级混部能力，实现在线和离线任务的统一调度、动态资源超卖以及高优先级任务保证。

具体使用：安装Volcano agent时，指定`--supported-features`参数：

```shell
helm install volcano . --create-namespace -n volcano-system --set custom.colocation_enable=true --set "custom.agent_supported_features=OverSubscription\,Eviction\,Resources"
```

相关PRs：https://github.com/volcano-sh/volcano/pull/4409, https://github.com/volcano-sh/volcano/pull/4630

感谢社区开发者：@[ShuhanYan](https://github.com/ShuhanYan), @[Monokaix](https://github.com/Monokaix)

混部文档：https://volcano.sh/en/docs/colocation/

## 支持自定义超卖资源名称

Volcano混部Agent添加了参数`--extend-resource-cpu-name`和`--extend-resource-memory-name`，允许用户自定义超卖资源的名称。这支持CPU和内存资源的自定义命名(默认值分别为`kubernetes.io/batch-cpu`和`kubernetes.io/batch-memory`)，增强了设置超卖资源名称的灵活性。

具体使用：安装Volcano时，指定`--extend-resource-cpu-name`和`--extend-resource-memory-name`参数：

```shell
helm install volcano . --create-namespace -n volcano-system --set custom.colocation_enable=true --set custom.agent_extend_resource_cpu_name=example.com/cpu --set custom.agent_extend_resource_memory_name=example.com/memory
```

相关PRs：https://github.com/volcano-sh/volcano/pull/4413, https://github.com/volcano-sh/volcano/pull/4630

感谢社区开发者：@[ShuhanYan](https://github.com/ShuhanYan), @[Monokaix](https://github.com/Monokaix)

混部文档：https://volcano.sh/en/docs/colocation/

## 新增Kubernetes 1.33支持

Volcano版本与Kubernetes社区发布保持同步。v1.13支持最新的Kubernetes v1.33版本，通过全面的UT和E2E测试用例确保功能和可靠性。

参与Volcano适配新Kubernetes版本工作，请参考：[adapt-k8s-todo](https://github.com/volcano-sh/volcano/blob/v1.13.0/docs/design/adapt-k8s-todo.md)。

相关PR：https://github.com/volcano-sh/volcano/pull/4430

感谢社区开发者：@[mahdikhashan](https://github.com/mahdikhashan)

## **总结：Volcano v1.13.0，持续引领云原生批量计算发展**

Volcano v1.13.0不仅是技术的提升，更是云原生批量计算领域的持续创新。无论是AI大模型训练与推理、大数据调度，还是资源优化，Volcano v1.13.0都提供了强大的功能和灵活的解决方案。我们相信Volcano v1.13.0将帮助用户在云原生批量计算领域取得更大的成就，开启AI与大数据调度的新篇章！

**立即体验Volcano v1.13.0，步入高效计算的新时代！**

**v1.13.0发布地址：** https://github.com/volcano-sh/volcano/releases/tag/v1.13.0

## **致谢**

Volcano v1.13.0包含了36位社区成员的贡献。衷心感谢所有贡献者：

| @ElectricFish7 | @philandstuff   | @junzebao        |
| :------------- | :-------------- | :--------------- |
| @ShuhanYan     | @GautamBytes    | @coldzerofear    |
| @houyuting     | @lhlxc          | @cyf-2002        |
| @neo502721     | @suyiiyii       | @dafu-wu         |
| @ditingdapeng  | @GoingCharlie   | @Wonki4          |
| @zhaoqi612     | @huntersman     | @JesseStutler    |
| @LY-today      | @XbaoWu         | @kingeasternsun  |
| @Monokaix      | @wuyueandrew    | @mahdikhashan    |
| @bibibox       | @archlitchi     | @guoqinwill      |
| @ouyangshengjia| @Poor12         | @dongjiang1989   |
| @zhifei92      | @halcyon-r      | @Xu-Wentao       |
| @hajnalmt      | @kevin-wangzefeng| @linuxfhy       |
