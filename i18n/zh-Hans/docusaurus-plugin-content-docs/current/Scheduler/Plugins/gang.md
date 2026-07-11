---
title: Gang
---
## 概述

Gang调度策略是Volcano Scheduler的核心调度算法之一。满足调度过程中“All or Nothing”的调度要求，避免Pod任意调度造成的集群资源浪费。 Gang调度器算法观察一个Job下调度的Pod数量是否满足最小运行次数。当满足Job的最小运行次数时，对该Job下的所有Pod执行调度动作；否则不执行。

![帮派插件](/img/doc/gang.png)

## 它是如何运作的

Gang 插件认为未处于“就绪”状态的任务（包括绑定、绑定、运行、分配、成功和管道化）具有更高的优先级。它在尝试驱逐一些 Pod 并回收资源后，检查分配给队列的资源是否能够满足任务运行“minAvailable”Pod 所需的资源。如果是，Gang 插件将继续进行调度。

Gang插件实现的关键功能：

- **JobReadyFn**：检查作业是否有足够的资源来满足其“minAvailable”要求
- **JobPipelinedFn**：检查作业是否可以流水线化
- **JobValidFn**：验证作业的 Gang 约束是否满足

## 设想

基于容器组概念的Gang调度算法非常适合需要多进程协作的场景：

### 人工智能和深度学习

AI 场景通常包含复杂的流程，包括数据摄取、数据分析师、数据分割、训练器、服务和日志记录。这些需要一组容器协同工作，适合基于容器的Gang调度策略。

### MPI 和 HPC

MPI计算框架下的多线程并行计算通信场景也适合Gang调度，因为主从进程需要协同工作。容器组下的容器关联性强，可能存在资源争用。整体调度分配可以有效解决死锁情况。

### 资源效率

在集群资源不足的情况下，Gang调度策略可以通过防止部分作业分配而浪费资源等待其他任务，从而显着提高集群资源的利用率。

## 配置

Gang 插件通常默认启用并在调度程序 ConfigMap 中配置：

```yaml
tiers:
- plugins:
  - name: priority
  - name: gang
  - name: conformance
```

## 例子

以下是使用 Gang 调度的 VolcanoJob 示例：

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-job
spec:
  minAvailable: 3  # Gang constraint: at least 3 pods must be schedulable
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

在此示例中，只有当所有 3 个 Pod（1 个 ps + 2 个工作线程）可以同时分配资源时，才会调度作业。