---
title: "Numa-aware"
---

## 概述

当一个节点运行大量 CPU 密集型 Pod 时，工作负载可能会在不同的 CPU 核心之间迁移，这取决于 Pod 是否被限速以及调度时哪些 CPU 核心可用。许多工作负载对此迁移不敏感，无需任何干预即可正常运行。然而，对于 CPU 缓存亲和性和调度延迟会显著影响性能的工作负载，则需要特殊的 CPU 管理策略来确定节点上的放置偏好。

## 挑战

CPU 管理器（CPU Manager）和拓扑管理器（Topology Manager）是 Kubelet 的组件，用于辅助 CPU 放置。但它们存在以下局限性：

1. **调度器不感知拓扑**：调度器不具备拓扑感知能力。这意味着 Pod 可能被调度到某个节点后，因拓扑管理器的拒绝而失败。这对于 TensorFlow 作业是不可接受的——如果某个 worker 或 parameter server 在节点上启动失败，整个作业都将失败。

2. **仅限节点级别**：这些管理器仅在节点级别运行，无法在整个集群范围内为 NUMA 拓扑匹配最优节点。

## Numa-aware 插件工作原理

Numa-aware 插件旨在解决上述局限性：

- **CPU 资源拓扑调度**：支持基于 CPU 拓扑的调度
- **Pod 级别拓扑策略**：支持 Pod 级别的拓扑策略

插件工作流程：
1. 从节点收集 NUMA 拓扑信息
2. 评估 CPU 和内存的放置需求
3. 根据 NUMA 亲和性对节点打分
4. 确保任务被放置在能满足其拓扑要求的节点上

## 应用场景

NUMA 感知调度常见于对 CPU 参数和调度延迟敏感的计算密集型作业：

### 科学计算

高性能科学计算作业可通过 NUMA 感知调度确保最优的内存访问模式，从而受益。

### 视频处理

视频解码工作负载在具有 NUMA 感知的调度下可获得更好的性能表现。

### 动画渲染

CPU 密集型的动画渲染作业可从优化的 CPU 和内存放置中获益。

### 大数据离线处理

大规模数据处理作业在经过 NUMA 优化的调度下可实现更高的吞吐量。

## 配置

### 在节点上启用拓扑管理器

首先，确保 Kubelet 配置了拓扑管理：

```yaml
# kubelet 配置
topologyManagerPolicy: single-numa-node
cpuManagerPolicy: static
```

### 调度器配置

启用 Numa-aware 插件：

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

| 参数 | 说明 | 默认值 |
|-----------|-------------|---------| 
| `numa-aware.weight` | NUMA 感知打分的权重 | 1 |

## 示例

### 带 NUMA 拓扑的节点

一个典型的 NUMA 节点可能具有：
- 2 个 NUMA 节点
- 每个节点 16 个 CPU 核心
- 每个节点 64GB 内存

```
NUMA Node 0: CPU 0-15, 64GB Memory
NUMA Node 1: CPU 16-31, 64GB Memory
```

### 需要 NUMA 感知的作业

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

在此示例中：
- 作业申请 8 个 CPU 和 32GB 内存
- NUMA 策略要求所有资源来自单个 NUMA 节点
- 调度器将找到能够从单个 NUMA 节点满足此需求的节点

### 带拓扑策略注解的 Pod

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

| 策略 | 说明 |
|--------|-------------|
| `none` | 无 NUMA 偏好 |
| `best-effort` | 尽量放置在最优 NUMA 节点，但不满足时不失败 |
| `restricted` | 仅放置在能满足 NUMA 要求的节点上 |
| `single-numa-node` | 所有资源必须来自单个 NUMA 节点 |