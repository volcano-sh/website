+++
title = "Gang"

date = 2021-05-13
lastmod = 2025-11-11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Gang"
[menu.docs]
  parent = "plugins"
  weight = 4
+++

{{<figure library="1" src="gang.png" title="Gang Plugin">}}

## 简介

Gang调度策略是volcano-scheduler的核心调度算法之一，它满足了调度过程中的"All or nothing"的调度需求，避免Pod的任意调度导致集群资源的浪费。具体算法是，观察Job下的Pod已调度数量是否满足了最小运行数量，当Job的最小运行数量得到满足时，为Job下的所有Pod执行调度动作，否则，不执行。

## 工作原理

Gang插件认为不处于`Ready`状态（包括Binding、Bound、Running、Allocated、Succeed和Pipelined）的任务具有更高的优先级。它检查分配给队列的资源是否能够满足任务运行`minAvailable`个Pod所需的资源。如果可以，Gang插件将继续进行调度。

Gang插件实现的关键功能：

- **JobReadyFn**: 检查作业是否有足够的资源满足其`minAvailable`要求
- **JobPipelinedFn**: 检查作业是否可以进行流水线处理
- **JobValidFn**: 验证作业的Gang约束是否满足

## 场景

基于容器组概念的Gang调度算法十分适合需要多进程协作的场景：

### AI和深度学习

AI场景往往包含复杂的流程，Data Ingestion、Data Analysts、Data Splitting、Trainer、Serving、Logging等，需要一组容器进行协同工作，就很适合基于容器组的Gang调度策略。

### MPI和HPC

MPI计算框架下的多线程并行计算通信场景，由于需要主从进程协同工作，也非常适合使用Gang调度策略。容器组下的容器高度相关也可能存在资源争抢，整体调度分配，能够有效解决死锁。

### 资源效率

在集群资源不足的场景下，Gang的调度策略对于集群资源的利用率的提升是非常明显的，通过防止部分作业分配来避免资源浪费。

## 配置

Gang插件通常默认启用，在调度器ConfigMap中配置：

```yaml
tiers:
- plugins:
  - name: priority
  - name: gang
  - name: conformance
```

## 示例

以下是使用Gang调度的VolcanoJob示例：

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-job
spec:
  minAvailable: 3  # Gang约束：至少3个pod必须可调度
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

在此示例中，只有当所有3个pod（1个ps + 2个worker）都能同时分配资源时，作业才会被调度。
