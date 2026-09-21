+++ 
title = "HyperJob"
description = "基于 HyperJob 的多集群作业拆分与高级调度"
date = 2026-02-05
lastmod = 2026-02-05

draft = false  # 是否为草稿
toc = true  # 是否显示目录
type = "docs"  # 请勿修改

# 侧边栏菜单
linktitle = "HyperJob"
[menu.docs]
  parent = "concepts"
  weight = 4
+++

## 概述

HyperJob 是构建在 Volcano Job 之上的 **多集群高层作业抽象**。
用户不再需要在多个集群中分别创建和管理 Volcano Job，而是只需要提交一个 HyperJob，
系统就会自动在多个集群之间 **拆分**、**下发**、并 **聚合管理** 底层作业。

HyperJob 主要解决以下问题：

- 单个 Kubernetes 集群 **资源不足以承载** 大规模 AI/ML 训练任务。
- 希望 **统一利用多个集群的算力**（例如跨地域、跨环境的 GPU 集群）。
- 需要对实际运行在多个集群中的作业，仍然只保留 **一个统一的控制与状态视图**。

HyperJob 以 Volcano Job 为执行单元，并结合 **Volcano Global** 与 **Karmada**，
让多集群 AI 作业的使用体验尽量接近"在单集群中运行一个 Job"。

## 核心特性与优势

- **自动作业拆分**
  - 将一个大型逻辑作业自动拆分为多个子 Job，下发到不同集群执行。
  - 拆分可以基于副本数、资源配额或其他在 HyperJob 中定义的策略。

- **统一状态管理**
  - HyperJob 提供一个 **统一的高层状态**，对多个底层 Volcano Job 的状态进行聚合。
  - 用户可以通过一个 HyperJob 完成启动、停止和状态查看等操作。

- **简化多集群使用**
  - 用户不需要关心每个集群中具体的 Job 清单。
  - 集群选择、实例分布和资源放置由 HyperJob 控制面和 Volcano Global 共同完成。

- **高层调度能力**
  - HyperJob 扮演 **"Job 级别的元调度器（meta-scheduler）"** 角色。
  - 负责确定多少副本下发到哪个集群，再由各集群内的 Volcano Job 完成批量调度
    （包括 Gang 调度、公平共享、队列优先级等）。

- **跨集群资源优化**
  - 便于 **利用多个集群中零散或异构的资源**。
  - 可以把负载分摊到多个集群，提升整体吞吐与资源利用率。

## HyperJob 与普通 Volcano Job 的对比

HyperJob 构建在 Volcano Job 之上，并非替代品。它将 Volcano 的能力扩展到多集群场景，同时在每个集群内保留 Volcano Job 的所有特性。

| 对比项                  | Volcano Job                                      | HyperJob                                                                      |
|-------------------------|--------------------------------------------------|-------------------------------------------------------------------------------|
| **范围**                | 单集群                                           | 多集群                                                                        |
| **抽象层级**            | 集群级原语（管理 Pod）                          | 元级原语（管理 Volcano Job）                                                  |
| **主要用例**            | 批量工作负载调度                                | 跨异构集群的大规模训练                                                        |
| **作业组成**            | 单个作业包含多个任务                            | 多个 Volcano Job 的组合                                                       |
| **状态跟踪**            | 跟踪单个作业内的 Pod                            | 聚合多个集群中多个 Volcano Job 的状态                                         |

HyperJob 专为训练需求超出单集群容量或需要利用不同集群的异构加速器资源的场景而设计。

**适合直接使用 Volcano Job 的场景**

- 所有工作负载只运行在 **单个集群** 中。
- 集群本身的资源足以容纳训练或推理任务。
- 已有控制器/流水线已经与 Volcano Job 打通，只需要单集群调度能力。

**适合使用 HyperJob 的场景**

- LLM 预训练/大规模分布式训练等，需要 **多个集群的总算力** 才能满足需求。
- 希望对跨集群的训练/推理任务，仍然只提交 **一个逻辑作业** 并进行统一管理。
- 需要组合多种 **异构资源**（不同 GPU 型号、不同可用区或机型），让系统自动选择合适的集群。

## 典型使用场景

- **多集群 LLM 训练**
  - 单个集群 GPU 规模不足时，将训练副本拆分到多个集群执行。
  - 用户只需要管理一个 HyperJob，对底层多个 Volcano Job 无感知。

- **异构资源调度**
  - 组合多个拥有不同 GPU 型号或算力配置的集群。
  - HyperJob 根据资源类型与可用性，将不同子任务分配到最合适的集群中。

- **资源溢出与弹性扩展**
  - 当主集群资源接近饱和时，可通过 HyperJob 自动将多余副本调度到其他集群。
  - 无需改动上层作业定义或业务逻辑。

- **跨地域/多机房训练**
  - 将训练任务拆分到不同地域或机房的集群中执行。
  - 可结合数据本地化、合规要求、链路延迟等因素进行策略控制。

## HyperJob YAML 示例

### 场景 1：大规模训练作业拆分

研究团队希望训练一个需要 256 个 GPU 的大型语言模型，但他们最大的集群只有 128 个 GPU。使用 HyperJob，他们可以将训练作业拆分为两个子作业，每个子作业使用 128 个 GPU，并在两个集群上运行。

```yaml
apiVersion: training.volcano.sh/v1alpha1
kind: HyperJob
metadata:
  name: llm-training
spec:
  minAvailable: 2
  maxDomains: 2
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

### 场景 2：异构集群

某组织拥有多个具有不同代次加速器的集群（例如 Ascend NPU 910B 和 910C）。他们需要在这些异构集群上运行训练作业。

```yaml
apiVersion: training.volcano.sh/v1alpha1
kind: HyperJob
metadata:
  name: ascend-heterogeneous-training
spec:
  minAvailable: 2
  replicatedJobs:
  - name: trainer-910b
    replicas: 1
    clusterNames: ["cluster-ascend-910b-1", "cluster-ascend-910b-2"]
    templateSpec:
      tasks:
      - name: worker
        replicas: 64
        template:
          spec:
            affinity:
              nodeAffinity:
                requiredDuringSchedulingIgnoredDuringExecution:
                  nodeSelectorTerms:
                  - matchExpressions:
                    - key: hardware-type
                      operator: In
                      values:
                      - Ascend910B
            containers:
            - name: trainer
              image: training-image:v1
              resources:
                requests:
                  ascend910c: 1
                limits:
                  ascend910c: 1
  - name: trainer-910c
    replicas: 1
    clusterNames: ["cluster-ascend-910c-1"]
    templateSpec:
      tasks:
      - name: worker
        replicas: 64
        template:
          spec:
            affinity:
              nodeAffinity:
                requiredDuringSchedulingIgnoredDuringExecution:
                  nodeSelectorTerms:
                  - matchExpressions:
                    - key: hardware-type
                      operator: In
                      values:
                      - Ascend910C
            containers:
            - name: trainer
              image: training-image:v1
              resources:
                requests:
                  ascend910c: 1
                limits:
                  ascend910c: 1
```

## 相关概念与参考链接

- **Volcano Job**：单集群批作业的核心抽象。
  详情见 [VolcanoJob](/zh/docs/vcjob/)。
- **Queue（队列）**：控制资源共享与优先级。
  详情见 [Queue](/zh/docs/queue/) 与 [队列资源管理](/zh/docs/queue_resource_management/)。
- **多集群AI作业调度**：
  详情见 [多集群AI作业调度](/zh/docs/multi_cluster_scheduling/)，了解 Volcano Global 架构与使用方式。
- **HyperJob 设计文档**：
  设计细节见：  
  `https://github.com/volcano-sh/volcano/blob/master/docs/design/hyperjob-multi-cluster-job-splitting.md`

