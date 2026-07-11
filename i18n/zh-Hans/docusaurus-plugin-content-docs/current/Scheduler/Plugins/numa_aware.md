---
title: "Numa-aware"
---

## 概述

当节点运行许多受 CPU 限制的 Pod 时，工作负载可能会转移到不同的 CPU 核心，具体取决于 Pod 是否受到限制以及调度时哪些 CPU 核心可用。许多工作负载对这种迁移并不敏感，无需任何干预即可正常工作。但是，在 CPU 缓存关联性和调度延迟显着影响工作负载性能的工作负载中，需要特殊的 CPU 管理策略来确定节点上的放置首选项。

## 挑战

CPU 管理器和拓扑管理器是有助于 CPU 布局的 Kubelet 组件。然而，它们有以下限制：

1. **调度程序不了解**：调度程序不了解拓扑。这意味着在节点上调度的 Pod 可能会因拓扑管理器而失败。这对于 TensorFlow 作业来说是不可接受的——如果节点上的任何工作程序或参数服务器发生故障，整个作业都将失败。

2. **仅节点级**：这些管理器在节点级别运行，这导致无法在整个集群中为 NUMA 拓扑匹配最佳节点。

## Numa 感知插件的工作原理

Numa-aware 插件旨在解决这些限制：

- **CPU资源拓扑调度**：支持基于CPU拓扑的调度
- **Pod级拓扑策略**：支持Pod级拓扑策略

插件：
1.从节点收集NUMA拓扑信息
2. 评估 CPU 和内存布局要求
3. 根据NUMA亲和力对节点进行评分
4. 确保任务放置在能够满足其拓扑要求的节点上

## 设想

NUMA 感知调度的常见场景是对 CPU 参数和调度延迟敏感的计算密集型作业：

### 科学计算

高性能科学计算受益于 NUMA 感知调度，以确保最佳的内存访问模式。

### 视频处理

通过 NUMA 感知进行调度时，视频解码工作负载可以获得更好的性能。

### 动画渲染

CPU 密集型动画渲染作业受益于优化的 CPU 和内存布局。

### 大数据离线处理

大规模数据处理作业可以通过 NUMA 优化调度实现更好的吞吐量。

## 配置

### 在节点上启用拓扑管理器

首先，确保 Kubelet 配置了拓扑管理：

```yaml
# kubelet configuration
topologyManagerPolicy: single-numa-node
cpuManagerPolicy: static
```

### 调度程序配置

启用 Numa 感知插件：

```yaml
tiers:
- plugins:
  - name: priority
  - name: gang
- plugins:
  - name: predicates
  - name: nodeorder
  - name: numa-aware
    arguments:
      numa-aware.weight: 10
```

### 配置参数

| Parameter | Description | Default |
|-----------|-------------|---------|
| `numa-aware.weight` | Weight of NUMA-aware scoring | 1 |

## 例子

### 具有 NUMA 拓扑的节点

典型的 NUMA 节点可能具有：
- 2 个 NUMA 节点
- 每个有 16 个 CPU 核心
- 每个都有 64GB 内存

```
NUMA Node 0: CPU 0-15, 64GB Memory
NUMA Node 1: CPU 16-31, 64GB Memory
```

### 需要 NUMA 意识的工作

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: numa-aware-job
spec:
  schedulerName: volcano
  minAvailable: 1
  tasks:
  - replicas: 1
    name: compute
    template:
      metadata:
        annotations:
          volcano.sh/numa-topology-policy: single-numa-node
      spec:
        containers:
        - name: compute
          image: compute-intensive-app:latest
          resources:
            requests:
              cpu: "8"
              memory: "32Gi"
            limits:
              cpu: "8"
              memory: "32Gi"
```

在这个例子中：
- 该作业需要 8 个 CPU 和 32GB 内存
- NUMA 策略要求所有资源来自单个 NUMA 节点
- 调度器会从单个NUMA节点中找到能够满足此要求的节点

### 具有拓扑策略注释的 Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: numa-sensitive-pod
  annotations:
    volcano.sh/numa-topology-policy: best-effort
spec:
  schedulerName: volcano
  containers:
  - name: app
    image: myapp:latest
    resources:
      requests:
        cpu: "4"
        memory: "16Gi"
      limits:
        cpu: "4"
        memory: "16Gi"
```

### NUMA 拓扑策略

该插件支持多种拓扑策略：

| 策略 | 描述 |
|--------|-------------|
| `none` | 无 NUMA 偏好 |
| `best-effort` | 尽量放置在最优 NUMA 节点，但如果无法满足则不失败 |
| `restricted` | 仅放置在能满足 NUMA 要求的节点上 |
| `single-numa-node` | 所有资源必须来自单个 NUMA 节点 |