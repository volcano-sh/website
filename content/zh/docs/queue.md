+++
title =  "Queue"


date = 2019-01-28
lastmod = 2024-12-30

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Queue"
[menu.docs]
  parent = "concepts"
  weight = 1
+++

### 定义
queue是容纳一组**podgroup**的队列，也是该组podgroup获取集群资源的划分依据

### 样例
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
  # deserved字段仅用于capacity插件
  deserved:
    cpu: "4"
    memory: 8Gi
  guarantee:
    resource:
      cpu: "2"
      memory: 4Gi
  priority: 100
  reclaimable: true
  # weight字段仅用于proportion插件
  weight: 1
status:
  allocated:
    cpu: "0"
    memory: "0"
  state: Open
```

### 关键字段
* guarantee,*可选*

guarantee表示该queue为自己队列中的所有podgroup预留的资源，其他队列无法使用该部分资源。

> **注意**: 若需配置guarantee值，则需要小于等于deserved值的配置

* deserved,*可选*

deserved表示该queue内所有podgroup的资源应得量，若该queue已分配资源量超过了设置的deserved值，则queue中已分配的资源可被其他queue回收

> **注意**：
> 
> 1. 该字段只有在capacity插件开启时可按需配置，需要小于等于capability值，proportion插件使用weight来自动计算queue的deserved值。capacity插件使用文档详见：[capacity plugin User Guide](https://github.com/volcano-sh/volcano/blob/5b817b1cdf3a5638ba38e934b44af051c9fb419e/docs/user-guide/how_to_use_capacity_plugin.md)
> 2. 若queue中已分配的资源量超过了自己配置的deserved值，则queue不可再回收其他队列中的资源
<!--目前capacity插件使用指导文档引用的是github中的链接，后续若官方网站文档中添加了中文的capacity插件使用指导，则替换为官方网站中的文档链接-->

* weight,*可选*

weight表示该queue在集群资源划分中所占的**相对**比重，该queue应得资源量deserved的计算方式为 **(weight/total-weight) * total-resource**。其中，
total-weight表示所有的queue的weight总和，total-resource表示集群的资源总量。weight是一个**软约束**，取值范围为[1, 2^31-1]

> **注意**：
> 
> 1. 该字段只有在proportion插件开启时可按需配置，若不设置weight，则默认设置为1，capacity插件无需设置此字段
> 2. 该字段为软约束，Deserved值由weight计算得到，当其他queue中的资源占用量未达到Deserved值时，该队列的资源使用量可超过Deserved值，即从其他队列借用资源，但当集群资源不够用，且其他队列有任务需要用到这部分借出去的资源时，则该队列需要归还借出去的资源，回收到Deserved值为止。这种设计可以保证集群资源的最大化利用。

* capability,*可选*

capability表示该queue内所有podgroup使用资源量之和的上限，它是一个**硬约束**，若不设置该字段，则队列的capability会设置为realCapability（集群的资源总量减去其他队列的总guarantee值）

* reclaimable,*可选*

reclaimable表示该queue在资源使用量超过该queue所应得的资源份额时，是否允许其他queue回收该queue使用超额的资源，默认值为**true**

* priority,*可选*

priority表示该queue的优先级，在资源分配和资源抢占/回收时，更高优先级的队列将会优先分配/抢占/回收资源

* parent,*可选*

该字段用于配置[层级队列](/zh/docs/hierarchical_queue)。parent用来指定queue的父队列，若未指定parent，则默认会作为root queue的子队列

### 资源状态
* Open

该queue当前处于可用状态，可接收新的podgroup

* Closed

该queue当前处于不可用状态，不可接收新的podgroup

* Closing

该Queue正在转化为不可用状态，不可接收新的podgroup

* Unknown

该queue当前处于不可知状态，可能是网络或其他原因导致queue的状态暂时无法感知

### 说明事项
* default queue

volcano启动后，会默认创建名为default的queue。后续下发的job，若未指定queue，默认属于default queue

* root queue

volcano启动后，同样会默认创建名为root的queue，该queue为开启[层级队列](/zh/docs/hierarchical_queue)功能时使用，作为所有队列的根队列，default queue为root queue的子队列

> 队列的详细使用场景请参考[队列资源管理](/zh/docs/queue_resource_management)