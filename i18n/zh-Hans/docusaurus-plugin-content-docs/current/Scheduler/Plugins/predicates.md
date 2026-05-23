---
title : "Predicates"
---
## 概述

Predicates 插件通过一系列评估算法来判断任务是否可以绑定到某个节点。它根据多种标准对节点进行过滤，包括资源可用性、节点状态以及 GPU 资源等特殊需求。

## 工作原理

Predicates 插件以 Pod 和 nodeInfo 作为参数，调用各种断言函数对节点进行评估和预选，以确定候选调度节点。它实现了：

- **PredicateFn**：若节点能够承载任务则返回 true，否则返回 false

插件评估的多个标准：
- 节点资源（CPU、内存等）
- 节点状态和污点
- Pod 亲和性和反亲和性规则
- 存储卷约束
- GPU 及其他加速器的可用性

## 应用场景

### 需要 GPU 的 AI 工作负载

在需要 GPU 资源的 AI 场景中，Predicates 插件可以快速筛选出具备所需 GPU 资源的节点，以便集中调度。

### 资源过滤

该插件确保只有具备足够资源的节点才会被纳入任务放置的考量范围，防止因资源不足导致调度失败。

### 节点状态过滤

处于不可调度状态的节点（例如 NotReady、MemoryPressure、DiskPressure）将被过滤掉。

## 配置

Predicates 插件在调度器 ConfigMap 中启用：

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

Predicates 插件支持多个配置选项：

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

| 参数 | 说明 | 默认值 |
|-----------|-------------|---------| 
| `predicate.GPUSharingEnable` | 启用 GPU 共享断言 | false |
| `predicate.CacheEnable` | 启用断言缓存以提升性能 | true |
| `predicate.ProportionalEnable` | 启用比例资源断言 | false |

## 示例

### 需要 GPU 资源的作业

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

Predicates 插件将对节点进行过滤，仅保留具有可用 GPU 资源的节点。

### 带节点亲和性的作业

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

Predicates 插件将确保作业仅被调度到指定可用区的节点上。