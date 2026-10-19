---
title: Binpack
---
## 概述

Binpack 调度算法的目标是尽可能填满现有节点（尽量不向空节点分配任务）。在具体实现中，Binpack 调度算法会对能够承载任务的节点进行打分，分数越高表示资源利用率越高。Binpack 算法能够尽可能地填满节点，将应用负载整合到部分节点上，这非常有利于 Kubernetes 集群的节点自动伸缩功能。

## 工作原理

Binpack 算法以插件形式注入到 Volcano 调度器进程中，并在 Pod 的节点选择阶段生效。在计算 Binpack 分数时，Volcano 调度器会考虑 Pod 申请的各种资源，并根据每种资源配置的权重进行加权平均。

主要特性：

- **资源权重**：每种资源类型（CPU、内存、GPU 等）在打分计算中可以设置不同的权重，具体取决于管理员配置的权重值。
- **插件权重**：在计算节点分数时，不同插件也需要分配不同的权重。调度器同样会为 Binpack 插件设置分数权重。
- **NodeOrderFn**：该插件实现了 NodeOrderFn，根据任务放置后节点的资源利用效率对节点进行打分。

## 应用场景

Binpack 算法适用于能够尽可能填满节点的小型作业：

### 大数据场景

大数据处理中的单次查询作业可通过 Binpack 将工作负载整合，最大化活跃节点的资源利用率。

### 电商高并发

电商秒杀场景中的订单生成可利用 Binpack，在峰值负载期间高效使用可用资源。

### AI 推理

AI 推理场景中的单次识别作业可受益于整合调度，减少资源碎片化。

### 互联网服务

互联网高并发服务场景可通过 Binpack 减少节点内部碎片，并在空闲机器上为申请了较多资源的 Pod 预留足够的资源空间，最大化集群空闲资源的利用率。

## 配置

Binpack 插件在调度器 ConfigMap 中配置，支持可选的权重参数：

```yaml
tiers:
- plugins:
  - name: binpack
    arguments:
      binpack.weight: 10
      binpack.cpu: 1
      binpack.memory: 1
      binpack.resources: nvidia.com/gpu
      binpack.resources.nvidia.com/gpu: 2
```

### 配置参数

| 参数 | 说明 | 默认值 |
|-----------|-------------|---------| 
| `binpack.weight` | Binpack 插件分数的整体权重 | 1 |
| `binpack.cpu` | CPU 资源在打分中的权重 | 1 |
| `binpack.memory` | 内存资源在打分中的权重 | 1 |
| `binpack.resources` | 需要纳入考量的额外资源 | - |
| `binpack.resources.<resource>` | 特定资源类型的权重 | 1 |

## 示例

以下是一个使用 Binpack 优先填满节点的调度器配置示例：

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
      - name: binpack
        arguments:
          binpack.weight: 10
          binpack.cpu: 2
          binpack.memory: 1
```

在此配置中，Binpack 插件的权重为 10，CPU 在打分计算中的权重是内存的两倍。