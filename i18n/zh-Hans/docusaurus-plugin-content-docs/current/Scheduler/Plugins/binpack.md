---
title: Binpack
---
## 概述

Binpack调度算法的目标是尽可能地填充现有节点（尽量不分配给空节点）。具体实现中，Binpack调度算法对能够容纳任务的节点进行评分，评分越高，资源利用率越高。 Binpack算法可以尽可能的填满节点，将应用负载整合到部分节点上，非常有利于Kubernetes集群的节点自动伸缩功能。

## 它是如何运作的

Binpack算法作为插件注入到Volcano Scheduler进程中，并在Pod的节点选择阶段应用。在计算 Binpack 分数时，Volcano Scheduler 会考虑 Pod 请求的各种资源，并根据为每个资源配置的权重对其进行平均。

主要特点：

- **资源权重**：每种资源类型（CPU、内存、GPU等）在评分计算中可以有不同的权重，具体取决于管理员配置的权重值。
- **插件权重**：不同的插件在计算节点分数时也需要分配不同的权重。调度程序还为 Binpack 插件设置分数权重。
- **NodeOrderFn**：该插件实现 NodeOrderFn 以根据放置任务后节点的利用效率来对节点进行评分。

## 设想

Binpack算法对于可以填充尽可能多的节点的小型作业是有益的：

### 大数据场景

大数据处理中的单个查询作业可以通过整合工作负载并最大限度地提高活动节点上的资源利用率来受益于 Binpack。

### 电商高并发

电商闪购场景中的订单生成可以利用 Binpack 在高峰负载期间高效利用可用资源。

### 人工智能推理

AI推理场景中的单一识别作业受益于统一调度，减少资源碎片。

### 互联网服务

互联网上的高并发服务场景受益于 Binpack，减少节点内的碎片，并在空闲机器上为申请更多资源请求的 Pod 保留足够的资源空间，最大限度地利用集群中的空闲资源。

## 配置

Binpack 插件在调度程序 ConfigMap 中使用可选的权重参数进行配置：

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

| 参数 | 描述 | 默认值 |
|-----------|-------------|---------|
| `binpack.weight` | Binpack 插件评分的整体权重 | 1 |
| `binpack.cpu` | 评分中 CPU 资源的权重 | 1 |
| `binpack.memory` | 评分中内存资源的权重 | 1 |
| `binpack.resources` | 需要考虑的其他资源 | - |
| `binpack.resources.<resource>` | 特定资源类型的权重 | 1 |

## 例子

下面是一个使用 Binpack 来确定节点填充优先级的调度程序配置示例：

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

在此配置中，Binpack 插件的权重为 10，在评分计算中 CPU 的权重是内存的两倍。