---
title : "Predicates"
---
## 概述

Predicates插件通过一系列评估算法来确定任务是否可以绑定到节点。它根据各种标准（包括资源可用性、节点条件以及 GPU 资源等特殊要求）过滤掉无法容纳任务的节点。

## 它是如何运作的

Predicates 插件以 pod 和 nodeInfo 作为参数调用各种谓词函数来评估和预选用于调度的节点。它实现：

- **PredicateFn**：如果节点可以容纳任务则返回 true 的函数，否则返回 false

该插件评估多个标准：
- 节点资源（CPU、内存等）
- 节点条件和污点
- Pod亲和力和反亲和力规则
- 体积限制
- GPU 和其他加速器的可用性

## 设想

### 具有 GPU 要求的 AI 工作负载

在需要GPU资源的AI场景中，Predicates插件可以快速筛选出拥有所需GPU资源的节点进行集中调度。

### 资源过滤

该插件确保只有资源充足的节点才会被考虑进行任务放置，防止由于资源限制而导致调度失败。

### 节点条件过滤

具有阻止调度的条件（例如，NotReady、MemoryPressure、DiskPressure）的节点将被过滤掉。

## 配置

Predicates 插件在调度程序 ConfigMap 中启用：

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

Predicates 插件支持多种配置选项：

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

| Parameter | Description | Default |
|-----------|-------------|---------|
| `predicate.GPUSharingEnable` | Enable GPU sharing predicate | false |
| `predicate.CacheEnable` | Enable predicate caching for performance | true |
| `predicate.ProportionalEnable` | Enable proportional resource predicate | false |

## 例子

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

Predicates 插件将过滤节点，仅包含具有可用 GPU 资源的节点。

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

谓词插件将确保作业仅调度到指定区域中的节点。