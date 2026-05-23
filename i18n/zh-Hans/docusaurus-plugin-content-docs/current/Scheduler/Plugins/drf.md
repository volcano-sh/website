---
title: DRF
---

## 概述

DRF 调度算法的全称是**主资源公平性（Dominant Resource Fairness）**，它是一种基于容器组主资源的调度算法。主资源是指容器组所需的所有资源中，相对于集群总资源占比最大的那种资源。

DRF 算法优先调度主资源份额最小的容器组。这种方式可以在不让单个资源密集型作业饿死大量小作业的前提下，承载更多的作业。DRF 调度算法确保在多种资源共存的环境中，尽可能地满足公平分配原则。

![Drf Plugin](/img/doc/drfjob.png)

## 工作原理

DRF 插件的工作流程如下：

1. **观测主资源**：对于每个作业，识别哪种资源（CPU、内存、GPU 等）在集群资源中占比最大
2. **计算份额值**：根据每个作业的主资源使用情况计算其份额值
3. **优先调度低份额**：份额值较低（主资源使用较少）的作业获得更高的调度优先级

实现的关键函数：

- **JobOrderFn**：根据作业的主资源份额对作业进行排序，优先调度份额较小的作业
- **PreemptableFn**：根据资源公平性计算结果判断某个作业是否可被抢占

该插件尝试计算分配给抢占方和被抢占方任务的资源总量，当抢占方任务拥有的资源较少时触发抢占。

## 应用场景

DRF 调度算法优先保障集群中业务的吞吐量，适用于批处理场景：

### AI 训练

单个 AI 训练作业可从 DRF 中受益，确保多个训练工作负载之间的公平资源分配。

### 大数据处理

单个大数据计算和查询作业可与集群中的其他工作负载公平共享资源。

### 混合资源工作负载

在资源需求多样化的环境中（CPU 密集型、内存密集型、GPU 密集型作业），DRF 可确保跨所有资源维度的公平分配。

## 配置

DRF 插件在调度器 ConfigMap 中配置：

```yaml
tiers:
- plugins:
  - name: priority
  - name: gang
- plugins:
  - name: drf
  - name: predicates
  - name: proportion
```

## 示例

假设集群拥有以下资源：
- 100 个 CPU
- 400 GB 内存

以及两个作业：
- **作业 A**：每个任务需要 2 个 CPU 和 8 GB 内存
- **作业 B**：每个任务需要 1 个 CPU 和 32 GB 内存

对于作业 A：
- 每任务 CPU 份额：2/100 = 2%
- 每任务内存份额：8/400 = 2%
- 主资源：CPU 和内存相等（2%）

对于作业 B：
- 每任务 CPU 份额：1/100 = 1%
- 每任务内存份额：32/400 = 8%
- 主资源：内存（8%）

使用 DRF 时，作业 A 会被优先调度，因为其主资源份额（2%）小于作业 B（8%）。这确保了任何作业都无法通过大量申请单一资源来垄断集群。

### VolcanoJob 示例

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: drf-example-job
spec:
  schedulerName: volcano
  minAvailable: 2
  tasks:
  - replicas: 2
    name: worker
    template:
      spec:
        containers:
        - name: worker
          image: busybox
          resources:
            requests:
              cpu: "2"
              memory: "8Gi"
            limits:
              cpu: "2"
              memory: "8Gi"
```