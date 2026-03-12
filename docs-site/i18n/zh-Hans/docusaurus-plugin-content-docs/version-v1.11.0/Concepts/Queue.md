---
title: "Queue"
sidebar_position: 1
---

## 简介
队列（Queue）是 PodGroup 的集合，采用先进先出（FIFO）原则。它也被用作资源划分的基础。

## 示例
```shell
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  creationTimestamp: "2024-12-30T09:31:12Z"
  generation: 1
  name: test
  resourceVersion: "987630"
  uid: 88babd01-c83f-4010-9701-c2471c1dd040
spec:
  capability:
    cpu: "8"
    memory: 16Gi
  # deserved field is only used by capacity plugin
  deserved:
    cpu: "4"
    memory: 8Gi
  guarantee:
    resource:
      cpu: "2"
      memory: 4Gi
  priority: 100
  reclaimable: true
  # weight field is only used by proportion plugin
  weight: 1
status:
  allocated:
    cpu: "0"
    memory: "0"
  state: Open
```

## 关键字段
* guarantee, *可选*

guarantee 表示为该队列中的所有 PodGroup 预留的资源。其他队列不能使用这些预留资源。

> **注意**: 如果需要配置 guarantee 值，它必须小于或等于 deserved 值

* deserved, *可选*

deserved 表示该队列中所有 PodGroup 的预期资源量。如果该队列的已分配资源超过配置的 deserved 值，则已分配资源可能会被其他队列回收。

> **注意**:
> 
> 1. 只有启用了 capacity 插件时才能配置此字段，且必须小于或等于 capability 值。proportion 插件使用 weight 自动计算队列的 deserved 值。有关使用 capacity 插件的更多信息，请参阅：[capacity 插件用户指南](https://github.com/volcano-sh/volcano/blob/5b817b1cdf3a5638ba38e934b44af051c9fb419e/docs/user-guide/how_to_use_capacity_plugin.md)
> 2. 如果队列的已分配资源超过其配置的 deserved 值，则该队列无法从其他队列回收资源

* weight, *可选*

`weight` 表示队列在集群资源划分中的 **相对** 权重。应得资源量计算为 **(weight/total-weight) * total-resource**。`total-weight` 是所有队列的总权重。`total-resource` 是集群资源的总数。`weight` 是一个软约束。

> **注意**: 
> 
> 1. 只有启用了 proportion 插件时才能配置此字段。如果未设置 weight，默认为 1。capacity 插件不需要此字段。
> 
> 2. 此字段是一个软约束。Deserved 值是基于 weight 计算的。当其他队列的资源使用量低于其 Deserved 值时，此队列可以通过借用其他队列的资源来超过其 Deserved 值。但是，当集群资源变得稀缺且其他队列需要其借出的资源用于任务时，此队列必须归还借用的资源，直到其使用量与其 Deserved 值相匹配。这种设计确保了集群资源的最大利用率。

* capability, *可选*

`capability` 表示队列可以使用的资源上限。它是一个硬约束。如果未设置此字段，则队列的 capability 将设置为 realCapability（集群总资源减去其他队列的总 guarantee 值）。

* reclaimable, *可选*

`reclaimable` 指定当队列使用的资源超过分配值时，是否允许其他队列回收该队列占用的额外资源。默认值为 `true`。

* priority, *可选*

priority 表示此队列的优先级。在资源分配和资源抢占/回收期间，优先级较高的队列将优先进行分配/抢占/回收。

* parent, *可选*

此字段用于配置[层级队列](/en/docs/hierarchical_queue)。parent 指定父队列。如果未指定 parent，默认情况下队列将被设置为 root 队列的子队列。

## 状态 (Status)
### Open
`Open` 表示队列可用，可以接受新的 PodGroup。
### Closed
`Closed` 表示队列不可用，不能接受任何新的 PodGroup。
### Closing
`Closing` 表示队列正在变为不可用。这是一个瞬态。`Closing` 队列不能接受任何新的 PodGroup。
### Unknown
`Unknown` 表示由于网络抖动等意外情况，队列状态未知。
  
## 注意
#### 默认队列
当 Volcano 启动时，它会自动创建名为 `default` 的队列，其 `weight` 为 `1`。后续未分配给队列的作业将被分配给 `default` 队列。
#### root 队列
当 Volcano 启动时，它还会默认创建一个名为 root 的队列。当启用[层级队列](/en/docs/hierarchical_queue)功能时，将使用此队列，作为所有队列的根队列，默认队列是 root 队列的子队列。

> 有关队列使用场景的更多信息，请参阅[队列资源管理](/en/docs/queue_resource_management)