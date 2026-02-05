+++
title = "Predicates"

date = 2021-05-13
lastmod = 2025-11-11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Predicates"
[menu.docs]
  parent = "plugins"
  weight = 10
+++

## 简介

Predicate plugin通过pod、nodeInfo作为参数，调用predicateGPU，根据计算结果对作业进行评估预选。它根据各种标准过滤无法容纳任务的节点，包括资源可用性、节点条件以及GPU资源等特殊要求。

## 工作原理

Predicates插件调用各种预选函数，以pod和nodeInfo作为参数来评估和预选调度节点。它实现：

- **PredicateFn**: 如果节点可以容纳任务返回true，否则返回false

插件评估多个标准：
- 节点资源（CPU、Memory等）
- 节点条件和污点
- Pod亲和性和反亲和性规则
- 存储卷约束
- GPU和其他加速器可用性

## 场景

### 具有GPU需求的AI工作负载

在AI的应用场景下，GPU资源是必需，Predicate plugin可以快速筛选出来需要GPU的进行集中调度。

### 资源过滤

插件确保只有具有足够资源的节点被考虑用于任务放置，防止由于资源约束导致的调度失败。

### 节点条件过滤

具有阻止调度条件的节点（例如NotReady、MemoryPressure、DiskPressure）被过滤掉。

## 配置

Predicates插件在调度器ConfigMap中启用：

```yaml
tiers:
- plugins:
  - name: priority
  - name: gang
- plugins:
  - name: predicates
  - name: nodeorder
  - name: binpack
```

### 配置参数

Predicates插件支持多个配置选项：

```yaml
tiers:
- plugins:
  - name: predicates
    arguments:
      predicate.GPUSharingEnable: true
      predicate.CacheEnable: true
      predicate.ProportionalEnable: true
      predicate.resources: nvidia.com/gpu
      predicate.resources.nvidia.com/gpu.weight: 100
```

| 参数 | 描述 | 默认值 |
|------|------|--------|
| `predicate.GPUSharingEnable` | 启用GPU共享预选 | false |
| `predicate.CacheEnable` | 启用预选缓存以提高性能 | true |
| `predicate.ProportionalEnable` | 启用比例资源预选 | false |

## 示例

### 需要GPU资源的作业

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: gpu-training-job
spec:
  schedulerName: volcano
  minAvailable: 1
  tasks:
  - replicas: 1
    name: trainer
    template:
      spec:
        containers:
        - name: tensorflow
          image: tensorflow/tensorflow:latest-gpu
          resources:
            requests:
              nvidia.com/gpu: "1"
            limits:
              nvidia.com/gpu: "1"
```

Predicates插件将过滤节点，仅包括具有可用GPU资源的节点。

### 具有节点亲和性的作业

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: zone-specific-job
spec:
  schedulerName: volcano
  minAvailable: 1
  tasks:
  - replicas: 1
    name: worker
    template:
      spec:
        affinity:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              nodeSelectorTerms:
              - matchExpressions:
                - key: topology.kubernetes.io/zone
                  operator: In
                  values:
                  - us-west-2a
        containers:
        - name: worker
          image: busybox
```

Predicates插件将确保作业仅被调度到指定区域的节点。
