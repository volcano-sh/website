+++
title = "Nodeorder"

date = 2021-05-13
lastmod = 2025-11-11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Nodeorder"
[menu.docs]
  parent = "plugins"
  weight = 11
+++

## 简介

Nodeorder plugin是一种调度优选策略：通过模拟分配从各个维度为node打分，找到最适合当前作业的node。打分参数由用户来配置。

## 工作原理

Nodeorder插件实现**NodeOrderFn**，使用一系列评分算法为任务的所有节点评分。得分最高的节点被认为是最适合该任务的节点。

评分维度包括：
- **Affinity**: 节点和pod亲和性/反亲和性分数
- **LeastRequestedResource**: 优先选择可用资源更多的节点
- **MostRequestedResource**: 优先选择可用资源更少的节点（整合）
- **BalancedResourceAllocation**: 优先选择资源使用均衡的节点
- **ImageLocality**: 优先选择已有容器镜像的节点

## 场景

Nodeorder plugin给调度提供了多个维度的打分标准，不同维度的组合，能够让用户根据自身需求灵活的配置合适的调度策略。

### 工作负载分布

通过调整不同评分维度的权重，您可以控制工作负载在集群中的分布方式：
- 使用**LeastRequestedResource**均匀分散工作负载
- 使用**MostRequestedResource**整合工作负载（类似于Binpack）

### 镜像本地性优化

对于大型容器镜像，使用**ImageLocality**评分可以通过优先选择已有所需镜像的节点来减少pod启动时间。

### 亲和性优化

**Affinity**维度确保pod根据其亲和性和反亲和性规则放置。

## 配置

Nodeorder插件在调度器ConfigMap中启用，可配置权重：

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
|------|------|--------|
| `nodeorder.weight` | Nodeorder插件的整体权重 | 1 |
| `nodeorder.leastrequested.enable` | 启用最少请求资源评分 | true |
| `nodeorder.mostrequested.enable` | 启用最多请求资源评分 | false |
| `nodeorder.nodeaffinity.enable` | 启用节点亲和性评分 | true |
| `nodeorder.podaffinity.enable` | 启用pod亲和性评分 | true |
| `nodeorder.balancedresource.enable` | 启用均衡资源评分 | true |
| `nodeorder.imagelocality.enable` | 启用镜像本地性评分 | true |
| `nodeorder.leastrequested.weight` | 最少请求评分的权重 | 1 |
| `nodeorder.mostrequested.weight` | 最多请求评分的权重 | 1 |
| `nodeorder.nodeaffinity.weight` | 节点亲和性评分的权重 | 1 |
| `nodeorder.podaffinity.weight` | pod亲和性评分的权重 | 1 |
| `nodeorder.balancedresource.weight` | 均衡资源评分的权重 | 1 |
| `nodeorder.imagelocality.weight` | 镜像本地性评分的权重 | 1 |

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

### 具有Pod亲和性的作业

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

如果节点已有匹配亲和性规则的pod，Nodeorder插件将为这些节点打更高的分数。
