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
让多集群 AI 作业的使用体验尽量接近“在单集群中运行一个 Job”。

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
  - HyperJob 扮演 **“Job 级别的元调度器（meta-scheduler）”** 角色。
  - 负责确定多少副本下发到哪个集群，再由各集群内的 Volcano Job 完成批量调度
    （包括 Gang 调度、公平共享、队列优先级等）。

- **跨集群资源优化**
  - 便于 **利用多个集群中零散或异构的资源**。
  - 可以把负载分摊到多个集群，提升整体吞吐与资源利用率。

## HyperJob 与普通 Volcano Job 的对比

HyperJob 与 Volcano Job 同属一个调度体系，但关注的粒度不同：

| 对比项                     | Volcano Job                                      | HyperJob                                                                      |
|----------------------------|--------------------------------------------------|-------------------------------------------------------------------------------|
| 调度范围                   | 单集群                                           | 多集群                                                                        |
| 执行单元                   | 单个集群中的一个 `Job`                          | 一个 HyperJob 对应多个底层 Volcano Job                                        |
| 多集群感知                 | 不感知多集群                                    | 原生面向多集群的高层抽象                                                      |
| 作业拆分                   | 不提供                                          | **内置自动拆分**                                                              |
| 状态视图                   | 每个集群、每个 Job 各自管理                     | **统一的 HyperJob 状态视图**                                                 |
| 典型使用场景               | 单集群即可满足资源与调度需求                    | 需要聚合多个集群资源或必须跨集群运行的作业                                   |

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

## 架构概览

HyperJob 的典型工作流程如下（概念性描述）：

1. **用户在控制平面集群中提交一个 HyperJob。**
2. HyperJob 控制器：
   - 解析期望的副本数和资源需求。
   - 根据 **拆分策略** 决定各目标集群的副本与资源分配。
3. 对每个目标集群，控制器创建一个或多个 **底层 Volcano Job**。
4. **Volcano Global** 与 **Karmada** 负责：
   - 多集群的调度与 `ResourceBinding` 管理。
   - 跨集群队列与作业优先级管理。
   - 多租户公平调度与资源准入控制。
5. HyperJob 持续跟踪所有子 Job 的状态，并将其 **聚合回 HyperJob 状态** 中。

在该架构中：

- HyperJob 关注 **作业级抽象与拆分逻辑**。
- Volcano Job 关注 **单集群内的批量调度能力**。
- Volcano Global + Karmada 关注 **多集群维度的资源协调与放置**。

多集群架构的详细介绍，可参考
[多集群AI作业调度](/zh/docs/multi_cluster_scheduling/) 与
[Volcano Global](https://github.com/volcano-sh/volcano-global) 项目。

## HyperJob YAML 示例（概念性）

HyperJob 的具体 API 以 Volcano 设计与实现为准。
下面示例为 **简化的概念示例**，用于帮助理解 HyperJob 如何描述一个逻辑作业及其跨集群拆分方式。
权威、最新的字段定义请以
[HyperJob 设计文档](https://github.com/volcano-sh/volcano/blob/master/docs/design/hyperjob-multi-cluster-job-splitting.md)
及 Volcano 仓库中的 CRD 定义为准。

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: HyperJob
metadata:
  name: llm-train-hyperjob
spec:
  # 逻辑作业的高层模板
  template:
    apiVersion: batch.volcano.sh/v1alpha1
    kind: Job
    spec:
      minAvailable: 64
      schedulerName: volcano
      queue: global-ai
      tasks:
        - name: trainer
          replicas: 64
          template:
            spec:
              containers:
                - name: trainer
                  image: example.com/llm-train:latest
                  resources:
                    requests:
                      cpu: "8"
                      memory: "64Gi"
                      nvidia.com/gpu: "1"
              restartPolicy: OnFailure

  # 拆分策略（字段名称仅作示意，实际以实现为准）
  splitPolicy:
    strategy: ByCluster
    clusters:
      - name: cluster-a
        replicas: 32
      - name: cluster-b
        replicas: 32
```

在真实环境中，HyperJob 规范可能还包括：

- 更精细的 **集群选择与约束条件**。
- 描述如何将子 Job 状态 **聚合映射为 HyperJob 状态** 的字段。
- 跨集群的 **重试、回滚与清理策略** 等高级能力。

请始终参考最新的 Volcano 文档与代码获取准确 API。

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

