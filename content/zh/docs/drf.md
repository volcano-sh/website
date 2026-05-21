+++
title = "DRF"

date = 2021-05-13
lastmod = 2025-11-11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "DRF"
[menu.docs]
  parent = "plugins"
  weight = 7
+++

{{<figure library="1" src="drfjob.png" title="DRF Plugin">}}

## 简介

DRF调度算法的全称是**Dominant Resource Fairness**，是基于容器组Dominant Resource的调度算法。volcano-scheduler观察每个Job请求的主导资源，并将其作为对集群资源使用的一种度量，根据Job的主导资源，计算Job的share值，在调度的过程中，具有较低share值的Job将具有更高的调度优先级。这样能够满足更多的作业，不会因为一个胖业务，饿死大批小业务。DRF调度算法能够确保在多种类型资源共存的环境下，尽可能满足分配的公平原则。

## 工作原理

DRF插件：

1. **观察主导资源**: 对于每个作业，识别哪种资源（CPU、Memory、GPU等）代表了集群资源的最大份额
2. **计算Share值**: 根据其主导资源使用情况计算每个作业的share值
3. **优先调度较低Share**: 具有较低share值（使用较少主导资源）的作业获得更高的调度优先级

实现的关键功能：

- **JobOrderFn**: 根据主导资源份额对作业排序，优先调度份额较小的作业
- **PreemptableFn**: 根据资源公平性计算确定作业是否可以被抢占

插件尝试计算分配给抢占者和被抢占任务的资源总量，当抢占者任务资源较少时触发抢占。

## 场景

DRF调度算法优先考虑集群中业务的吞吐量，适用批处理场景：

### AI训练

单次AI训练作业受益于DRF，因为它确保了多个训练工作负载之间的公平资源分配。

### 大数据处理

单次大数据计算和查询作业可以与集群中的其他工作负载公平共享资源。

### 混合资源工作负载

在具有不同资源需求（CPU密集型、内存密集型、GPU密集型作业）的环境中，DRF确保所有资源维度的公平分配。

## 配置

DRF插件在调度器ConfigMap中配置：

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

考虑一个具有以下资源的集群：
- 100个CPU
- 400 GB内存

以及两个作业：
- **作业A**: 每个任务需要2个CPU和8 GB内存
- **作业B**: 每个任务需要1个CPU和32 GB内存

对于作业A：
- 每个任务的CPU份额：2/100 = 2%
- 每个任务的内存份额：8/400 = 2%
- 主导资源：CPU和内存相等（2%）

对于作业B：
- 每个任务的CPU份额：1/100 = 1%
- 每个任务的内存份额：32/400 = 8%
- 主导资源：内存（8%）

使用DRF，作业A将首先被调度，因为其主导资源份额（2%）小于作业B的（8%）。这确保了没有作业可以通过请求大量单一资源来垄断集群。

### VolcanoJob示例

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
