+++
title = "Binpack"

date = 2021-05-13
lastmod = 2025-11-11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Binpack"
[menu.docs]
  parent = "plugins"
  weight = 5
+++

## 简介

Binpack调度算法的目标是尽量把已有的节点填满（尽量不往空白节点分配）。具体实现上，binpack调度算法是给可以投递的节点打分，分数越高表示节点的资源利用率越高。binpack算法能够尽可能填满节点，将应用负载靠拢在部分节点，这非常有利于K8S集群节点的自动扩缩容功能。

## 工作原理

Binpack算法以插件的形式，注入到volcano-scheduler调度过程中，将会应用在Pod优选节点的阶段。Volcano-scheduler在计算binpack算法时，会考虑Pod请求的各种资源，并根据各种资源所配置的权重做平均。

关键特性：

- **资源权重**: 每种资源类型（CPU、Memory、GPU等）在评分计算中可以有不同的权重，这取决于管理员为每种资源配置的权重值。
- **插件权重**: 不同的插件在计算节点分数时，也需要分配不同的权重，scheduler也为binpack插件设置了分数权重。
- **NodeOrderFn**: 插件实现NodeOrderFn，根据放置任务后节点的利用效率为节点评分。

## 场景

binpack算法对能够尽可能填满节点的小作业有利：

### 大数据场景

大数据处理中的单次查询作业通过整合工作负载并最大化活动节点上的资源利用率来受益于Binpack。

### 电商高并发

电商秒杀场景订单生成可以利用Binpack在峰值负载期间高效使用可用资源。

### AI推理

AI推理场景中的单次识别作业受益于整合调度，减少资源碎片。

### 互联网服务

互联网上的高并发服务场景受益于Binpack，通过减少节点内的碎片并在空闲机器上为申请了更多资源请求的Pod预留足够的资源空间，使集群下空闲资源得到最大化的利用。

## 配置

Binpack插件在调度器ConfigMap中配置，可选权重参数：

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
|------|------|--------|
| `binpack.weight` | Binpack插件分数的整体权重 | 1 |
| `binpack.cpu` | CPU资源在评分中的权重 | 1 |
| `binpack.memory` | Memory资源在评分中的权重 | 1 |
| `binpack.resources` | 要考虑的额外资源 | - |
| `binpack.resources.<resource>` | 特定资源类型的权重 | 1 |

## 示例

以下是使用Binpack优先填充节点的调度器配置示例：

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

在此配置中，Binpack插件被赋予权重10，CPU在评分计算中的权重是内存的两倍。
