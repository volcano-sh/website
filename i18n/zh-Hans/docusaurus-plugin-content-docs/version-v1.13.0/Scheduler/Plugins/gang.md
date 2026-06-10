---
title: Gang
---
## 概述

Gang 调度策略是 Volcano 调度器的核心调度算法之一。它满足调度过程中"全部成功或全部不执行"的调度需求，避免因 Pod 被随意调度而造成集群资源浪费。Gang 调度算法会观察一个 Job 下已调度的 Pod 数量是否满足最小运行数量要求。当满足 Job 的最小运行数量时，才对 Job 下的所有 Pod 执行调度操作；否则不执行。

![Gang Plugin](/img/doc/gang.png)

## 工作原理

Gang 插件将不处于 `Ready` 状态的任务（包括 Binding、Bound、Running、Allocated、Succeed 和 Pipelined 状态）视为具有更高优先级。在尝试驱逐部分 Pod 并回收资源后，它会检查队列中分配的资源是否能满足任务运行 `minAvailable` 个 Pod 所需的资源。如果满足，Gang 插件将继续进行调度。

Gang 插件实现的关键函数：

- **JobReadyFn**：检查作业是否拥有足够的资源以满足 `minAvailable` 要求
- **JobPipelinedFn**：检查作业是否可以进行流水线调度
- **JobValidFn**：验证作业的 Gang 约束是否得到满足

## 应用场景

基于容器组概念的 Gang 调度算法非常适合需要多进程协同工作的场景：

### AI 与深度学习

AI 场景通常包含复杂的流程，包括数据摄取、数据分析、数据拆分、训练、服务和日志记录等。这些流程需要一组容器协同工作，非常适合基于容器组的 Gang 调度策略。

### MPI 与高性能计算

MPI 计算框架下的多线程并行计算通信场景同样适合 Gang 调度，因为主从进程需要协同工作。容器组中的容器高度相关，可能存在资源争用，整体调度分配可以有效解决死锁问题。

### 资源效率

在集群资源不足的情况下，Gang 调度策略可通过防止部分作业分配（这会导致资源白白等待其他任务）来显著提高集群资源利用率。

## 配置

Gang 插件通常默认启用，在调度器 ConfigMap 中配置：

```yaml
tiers:
- plugins:
  - name: priority
  - name: gang
  - name: conformance
```

## 示例

以下是一个使用 Gang 调度的 VolcanoJob 示例：

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-job
spec:
  minAvailable: 3  # Gang 约束：至少 3 个 Pod 必须可调度
  schedulerName: volcano
  tasks:
  - replicas: 1
    name: ps
    template:
      spec:
        containers:
        - name: tensorflow
          image: tensorflow/tensorflow:latest
  - replicas: 2
    name: worker
    template:
      spec:
        containers:
        - name: tensorflow
          image: tensorflow/tensorflow:latest
```

在此示例中，只有当全部 3 个 Pod（1 个 ps + 2 个 worker）能够同时获得资源分配时，作业才会被调度。