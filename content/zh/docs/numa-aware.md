+++
title = "Numa-aware"

date = 2021-05-13
lastmod = 2025-11-11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Numa-aware"
[menu.docs]
  parent = "plugins"
  weight = 14
+++

## 简介

当节点运行多个cpu密集的pod。基于pod是否可以迁移cpu以及调度周期cpu资源状况，工作负载可以迁移到不同的cpu核心下。许多工作负载对cpu资源迁移并不敏感。然而，有一些cpu的缓存亲和度以及调度延迟显著影响性能的工作负载，kubelet允许可选的cpu编排策略(cpu management)来确定节点上cpu资源的绑定分配。

## 挑战

cpu manager以及topology manager都是kubelet的组件，帮助进行CPU放置。然而，它存在如下局限：

1. **调度器不感知**: 基于kubelet的调度组件不支持topology-aware。所以可能由于Topology manager，导致整个node上的调度失败。这对Tensorflow job是难以接受的，因为一旦有任何worker task挂掉，整个作业都将调度失败。

2. **仅节点级别**: 这些manager是节点级这导致无法在整个集群中匹配numa topology的最佳节点。

## Numa-aware插件工作原理

Numa-aware plugin致力于解决如上局限：

- **支持cpu资源的拓扑调度**: 支持基于CPU拓扑的调度
- **支持pod级别的拓扑协议**: 支持pod级别的拓扑策略

插件：
1. 从节点收集NUMA拓扑信息
2. 评估CPU和内存放置要求
3. 根据NUMA亲和性为节点评分
4. 确保任务被放置在能够满足其拓扑要求的节点上

## 场景

Numa-aware的常见场景是那些对cpu参数敏感、调度延迟敏感的计算密集型作业：

### 科学计算

高性能科学计算受益于NUMA感知调度，以确保最佳的内存访问模式。

### 视频处理

视频解码工作负载可以通过NUMA感知调度实现更好的性能。

### 动漫动画渲染

动漫动画渲染等CPU密集型作业受益于优化的CPU和内存放置。

### 大数据离线处理

大规模数据处理作业可以通过NUMA优化的调度实现更好的吞吐量。

## 配置

### 在节点上启用Topology Manager

首先，确保kubelet配置了拓扑管理：

```yaml
# kubelet配置
topologyManagerPolicy: single-numa-node
cpuManagerPolicy: static
```

### 调度器配置

启用Numa-aware插件：

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

| 参数 | 描述 | 默认值 |
|------|------|--------|
| `numa-aware.weight` | NUMA感知评分的权重 | 1 |

## 示例

### 具有NUMA拓扑的节点

一个典型的NUMA节点可能有：
- 2个NUMA节点
- 每个有16个CPU核心
- 每个有64GB内存

```
NUMA Node 0: CPU 0-15, 64GB Memory
NUMA Node 1: CPU 16-31, 64GB Memory
```

### 需要NUMA感知的作业

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
- 作业请求8个CPU和32GB内存
- NUMA策略要求所有资源来自单个NUMA节点
- 调度器将找到一个能够从单个NUMA节点满足此要求的节点

### 具有拓扑策略注解的Pod

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

### NUMA拓扑策略

插件支持多种拓扑策略：

| 策略 | 描述 |
|------|------|
| `none` | 无NUMA偏好 |
| `best-effort` | 尝试放置在最佳NUMA节点，但如果不可能也不会失败 |
| `restricted` | 仅放置在能够满足NUMA要求的节点 |
| `single-numa-node` | 所有资源必须来自单个NUMA节点 |
