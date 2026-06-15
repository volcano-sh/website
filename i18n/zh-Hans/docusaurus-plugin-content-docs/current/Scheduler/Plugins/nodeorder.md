---
title: Nodeorder
---

## 概述

Nodeorder插件是一种调度优化策略，通过模拟分配从各个维度对节点进行评分，找到最适合当前任务的节点。评分参数由用户配置。

## 它是如何运作的

Nodeorder 插件实现了 **NodeOrderFn**，使用一系列评分算法对任务的所有节点进行评分。得分最高的节点被认为是最适合该任务的节点。

评分维度包括：
- **亲和力**：节点和 Pod 亲和力/反亲和力分数
- **LeastRequestedResource**：优先选择拥有更多可用资源的节点
- **MostRequestedResource**：优先选择可用资源较少的节点（整合）
- **BalancedResourceAllocation**：优先选择资源使用均衡的节点
- **ImageLocality**：优先选择已经拥有容器镜像的节点

## 设想

Nodeorder 插件提供了跨多个维度的评分标准以进行调度。不同维度的组合使得用户可以根据自己的需求灵活配置合适的调度策略。

### 工作负载分配

通过调整不同评分维度的权重，您可以控制工作负载在集群中的分布方式：
- 使用 **LeastRequestedResource** 均匀分布工作负载
- 使用 **MostRequestedResource** 来整合工作负载（类似于 Binpack）

### 图像局部性优化

对于大型容器映像，使用 **ImageLocality** 评分可以通过优先选择已具有所需映像的节点来减少 pod 启动时间。

### 亲和力优化

**亲和性** 维度确保 Pod 根据其亲和性和反亲和性规则进行放置。

## 配置

Nodeorder 插件在调度程序 ConfigMap 中启用，并具有可配置的权重：

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

| 参数 | 描述 | 默认值 |
|-----------|-------------|---------|
| `nodeorder.weight` | Nodeorder 插件的整体权重 | 1 |
| `nodeorder.leastrequested.enable` | 启用最少请求资源评分 | true |
| `nodeorder.mostrequested.enable` | 启用最多请求资源评分 | false |
| `nodeorder.nodeaffinity.enable` | 启用节点亲和性评分 | true |
| `nodeorder.podaffinity.enable` | 启用 Pod 亲和性评分 | true |
| `nodeorder.balancedresource.enable` | 启用均衡资源评分 | true |
| `nodeorder.imagelocality.enable` | 启用镜像本地性评分 | true |
| `nodeorder.leastrequested.weight` | 最少请求评分的权重 | 1 |
| `nodeorder.mostrequested.weight` | 最多请求评分的权重 | 1 |
| `nodeorder.nodeaffinity.weight` | 节点亲和性评分的权重 | 1 |
| `nodeorder.podaffinity.weight` | Pod 亲和性评分的权重 | 1 |
| `nodeorder.balancedresource.weight` | 均衡资源评分的权重 | 1 |
| `nodeorder.imagelocality.weight` | 镜像本地性评分的权重 | 1 |

## 例子

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

### 具有 Pod 亲和力的作业

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

如果节点已经有匹配亲和性规则的 Pod，则 Nodeorder 插件将为节点评分更高。