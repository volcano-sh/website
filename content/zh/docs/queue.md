+++
title =  "Queue"


date = 2019-01-28
lastmod = 2020-09-03

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
queue 是容纳一组 **podgroup** 的队列，也是该组 podgroup 获取集群资源的划分依据

### 样例
```shell
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  creationTimestamp: "2020-08-10T11:54:36Z"
  generation: 1
  name: default
  resourceVersion: "559"
  selfLink: /apis/scheduling.volcano.sh/v1beta1/queues/default
  uid: 14082e4c-bef6-4248-a414-1e06d8352bf0
spec:
  reclaimable: true
  weight: 1
  capability:
    cpu: "4"
    memory: "4096Mi"
status:
  state: Open
```

### 关键字段
* weight

`weight`表示该 queue 在集群资源划分中所占的**相对**比重，该 queue 应得资源总量为 **(weight/total-weight) * total-resource**。其中，
total-weight 表示所有的 queue 的 weight 总和，total-resource 表示集群的资源总量。weight 是一个**软约束**，取值范围为 [1, 2^31-1]

* capability

`capability`表示该 queue 内所有 podgroup 使用资源量之和的上限，它是一个**硬约束**

* reclaimable

`reclaimable` 表示该 queue 在资源使用量超过该 queue 所应得的资源份额时，是否允许其他 queue 回收该 queue 使用超额的资源，默认值为 **true**

### 资源状态
* Open

该 queue 当前处于可用状态，可接收新的 podgroup

* Closed

该 queue 当前处于不可用状态，不可接收新的 podgroup

* Closing

该 queue 正在转化为不可用状态，不可接收新的 podgroup

* Unknown

该 queue 当前处于不可知状态，可能是网络或其他原因导致 queue 的状态暂时无法感知

## 使用场景
###  weight 的资源划分-1

#### 背景：
* 集群 CPU 总量为 4C
* 已默认创建名为 default 的 queue，weight 为 1
*  集群中无任务运行

#### 操作：
1. 当前情况下，default queue 可是使用全部集群资源，即 4C
2. 创建名为 test 的 queue，weight 为 3。此时，default weight:test weight = 1:3,即 default queue 可使用 1C，test queue 可使用 3C
3. 创建名为 p1 和 p2 的 podgroup，分别属于 default queue 和 test queue
4. 分别向 p1 和 p2 中投递 job1 和 job2，资源申请量分别为 1C 和 3C，2 个 job 均能正常工作

###  weight 的资源划分-2

#### 背景：
*  集群 CPU 总量为 4C
*  已默认创建名为 default 的 queue，weight 为 1
*  集群中无任务运行

#### 操作：
1. 当前情况下，default queue 可是使用全部集群资源，即 4C
2. 创建名为 p1 的 podgroup，属于 default queue。
3. 分别创建名为 job1 和 job2 的 job，属于 p1 ,资源申请量分别为 1C 和 3C，job1 和 job2 均能正常工作
4. 创建名为 test 的 queue，weight 为 3。此时，default weight:test weight = 1:3,即 default queue 可使用 1C，test queue 可使用 3C。但由于 test
queue 内此时无任务，job1 和 job2 仍可正常工作
5. 创建名为 p2 的 podgroup，属于 test queue。
6. 创建名为 job3 的 job，属于 p2，资源申请量为 3C。此时，job2 将被驱逐，将资源归还给 job3，即 default queue 将 3C 资源归还给 test queue。

###  capability 的使用

#### 背景：
*  集群 CPU 总量为 4C
*  已默认创建名为 default 的 queue，weight 为 1
*  集群中无任务运行

#### 操作：
1. 创建名为 test 的 queue，capability 设置 cpu 为 2C，即 test queue 使用资源上限为 2C
2. 创建名为 p1 的 podgroup，属于 test queue
3. 分别创建名为 job1 和 job2 的 job，属于 p1，资源申请量分别为 1C 和 3C，依次下发。由于 capability 的限制，job1 正常运行，job2 处于 pending 状态

###  reclaimable 的使用

#### 背景：
*  集群 CPU 总量为 4C
*  已默认创建名为 default 的 queue，weight 为 1
*  集群中无任务运行

#### 操作：
1. 创建名为 test 的 queue，reclaimable 设置为 false，weight 为 1。此时，default weight:test weight = 1:1,即 default queue 和 test queue 均可使用 2C。
2. 创建名为 p1、p2 的 podgroup，分别属于 test queue 和 default queue
3. 创建名为 job1 的 job，属于 p1，资源申请量 3C，job1 可正常运行。此时，由于 default queue 中尚无任务，test queue 多占用 1C
4. 创建名为 job2 的 job，属于 p2，资源申请量 2C，任务下发后处于 pending 状态，即 test queue 的 reclaimable 为 false 导致该 queue 不归还多占的资源

### 说明事项
#### default queue
volcano 启动后，会默认创建名为 default 的 queue，weight 为 1 。后续下发的 job，若未指定 queue，默认属于 default queue
#### weight 的软约束
weight 的软约束是指 weight 决定的 queue 应得资源的份额并不是不能超出使用的。当其他 queue 的资源未充分利用时，需要超出使用资源的 queue 可临时多占。但其
他 queue 后续若有任务下发需要用到这部分资源，将驱逐该 queue 多占资源的任务以达到 weight 规定的份额（前提是 queue 的 reclaimable 为 true ）。这种设计可以
保证集群资源的最大化利用。