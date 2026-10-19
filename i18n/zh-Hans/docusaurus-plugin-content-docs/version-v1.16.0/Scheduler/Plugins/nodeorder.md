---
title: Nodeorder
---

## 概述

Nodeorder 插件是一种调度优化策略，通过模拟分配从多个维度对节点进行打分，以找到最适合当前任务的节点。打分参数由用户配置。

## 工作原理

Nodeorder 插件实现了 **NodeOrderFn**，使用一系列打分算法对任务的所有候选节点进行评分。得分最高的节点被认为是最适合该任务的节点。

评分维度包括：
- **Affinity（亲和性）**：节点和 Pod 亲和性/反亲和性分数
- **LeastRequestedResource（最少请求资源）**：优先选择可用资源更多的节点
- **MostRequestedResource（最多请求资源）**：优先选择可用资源较少的节点（用于整合）
- **BalancedResourceAllocation（均衡资源分配）**：优先选择资源使用均衡的节点
- **ImageLocality（镜像本地性）**：优先选择已缓存所需容器镜像的节点

## 应用场景

Nodeorder 插件从多个维度提供调度评分标准。通过组合不同维度，用户可以根据自身需求灵活配置合适的调度策略。

### 工作负载分布

通过调整不同评分维度的权重，可以控制工作负载在集群中的分布方式：
- 使用 **LeastRequestedResource** 均匀分散工作负载
- 使用 **MostRequestedResource** 整合工作负载（类似 Binpack）

### 镜像本地性优化

对于体积较大的容器镜像，使用 **ImageLocality** 打分可以通过优先选择已缓存所需镜像的节点来缩短 Pod 启动时间。

### 亲和性优化

**Affinity** 维度确保 Pod 按照其亲和性和反亲和性规则进行放置。

## 配置

Nodeorder 插件在调度器 ConfigMap 中启用，支持配置权重：

```yaml
tiers:
- plugins:
  - name: predicates
  - name: nodeorder
    arguments:
      nodeorder.weight: 10
      nodeorder.leastrequested.enable: true
      nodeorder.mostrequested.enable: false
      nodeorder.nodeaffinity.enable: true
      nodeorder.podaffinity.enable: true
      nodeorder.balancedresource.enable: true
      nodeorder.imagelocality.enable: true
```

### 配置参数

| 参数 | 说明 | 默认值 |
|-----------|-------------|---------| 
| `nodeorder.weight` | Nodeorder 插件的整体权重 | 1 |
| `nodeorder.leastrequested.enable` | 启用最少请求资源打分 | true |
| `nodeorder.mostrequested.enable` | 启用最多请求资源打分 | false |
| `nodeorder.nodeaffinity.enable` | 启用节点亲和性打分 | true |
| `nodeorder.podaffinity.enable` | 启用 Pod 亲和性打分 | true |
| `nodeorder.balancedresource.enable` | 启用均衡资源打分 | true |
| `nodeorder.imagelocality.enable` | 启用镜像本地性打分 | true |
| `nodeorder.leastrequested.weight` | 最少请求打分的权重 | 1 |
| `nodeorder.mostrequested.weight` | 最多请求打分的权重 | 1 |
| `nodeorder.nodeaffinity.weight` | 节点亲和性打分的权重 | 1 |
| `nodeorder.podaffinity.weight` | Pod 亲和性打分的权重 | 1 |
| `nodeorder.balancedresource.weight` | 均衡资源打分的权重 | 1 |
| `nodeorder.imagelocality.weight` | 镜像本地性打分的权重 | 1 |

## 示例

### 分散工作负载的配置

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: volcano-scheduler-configmap
  namespace: volcano-system
data:
  volcano-scheduler.conf: |
    actions: "enqueue, allocate, backfill"
    tiers:
    - plugins:
      - name: priority
      - name: gang
    - plugins:
      - name: predicates
      - name: nodeorder
        arguments:
          nodeorder.leastrequested.enable: true
          nodeorder.leastrequested.weight: 2
          nodeorder.balancedresource.enable: true
```

### 整合工作负载的配置

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: volcano-scheduler-configmap
  namespace: volcano-system
data:
  volcano-scheduler.conf: |
    actions: "enqueue, allocate, backfill"
    tiers:
    - plugins:
      - name: priority
      - name: gang
    - plugins:
      - name: predicates
      - name: nodeorder
        arguments:
          nodeorder.mostrequested.enable: true
          nodeorder.mostrequested.weight: 2
          nodeorder.leastrequested.enable: false
```

### 带 Pod 亲和性的作业

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: affinity-job
spec:
  schedulerName: volcano
  minAvailable: 2
  tasks:
  - replicas: 2
    name: worker
    template:
      spec:
        affinity:
          podAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: cache
                topologyKey: kubernetes.io/hostname
        containers:
        - name: worker
          image: busybox
```

Nodeorder 插件将对已存在符合亲和性规则 Pod 的节点给予更高的分数。