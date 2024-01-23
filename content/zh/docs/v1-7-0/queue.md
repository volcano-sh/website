+++
title =  "Queue"


date = 2024-01-16
lastmod = 2024-01-16

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Queue"
[menu.v1-7-0]
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

weight表示该queue在集群资源划分中所占的**相对**比重，该queue应得资源总量为 **(weight/total-weight) * total-resource**。其中，
total-weight表示所有的queue的weight总和，total-resource表示集群的资源总量。weight是一个**软约束**，取值范围为[1, 2^31-1]

* capability

capability表示该queue内所有podgroup使用资源量之和的上限，它是一个**硬约束**

* reclaimable

reclaimable表示该queue在资源使用量超过该queue所应得的资源份额时，是否允许其他queue回收该queue使用超额的资源，默认值为**true**

### 资源状态
* Open

该queue当前处于可用状态，可接收新的podgroup

* Closed

该queue当前处于不可用状态，不可接收新的podgroup

* Closing

该Queue正在转化为不可用状态，不可接收新的podgroup

* Unknown

该queue当前处于不可知状态，可能是网络或其他原因导致queue的状态暂时无法感知

## 使用场景
###  weight的资源划分-1

#### 背景：
* 集群CPU总量为4C
* 已默认创建名为default的queue，weight为1
*  集群中无任务运行

#### 操作：
1. 当前情况下，default queue可是使用全部集群资源，即4C
2. 创建名为test的queue，weight为3。此时，default weight:test weight = 1:3,即default queue可使用1C，test queue可使用3C
3. 创建名为p1和p2的podgroup，分别属于default queue和test queue
4. 分别向p1和p2中投递job1和job2，资源申请量分别为1C和3C，2个job均能正常工作

###  weight的资源划分-2

#### 背景：
*  集群CPU总量为4C
*  已默认创建名为default的queue，weight为1
*  集群中无任务运行

#### 操作：
1. 当前情况下，default queue可是使用全部集群资源，即4C
2. 创建名为p1的podgroup，属于default queue。
3. 分别创建名为job1和job2的job，属于p1,资源申请量分别为1C和3C，job1和job2均能正常工作
4. 创建名为test的queue，weight为3。此时，default weight:test weight = 1:3,即default queue可使用1C，test queue可使用3C。但由于test
queue内此时无任务，job1和job2仍可正常工作
5. 创建名为p2的podgroup，属于test queue。
6. 创建名为job3的job，属于p2，资源申请量为3C。此时，job2将被驱逐，将资源归还给job3，即default queue将3C资源归还给test queue。

###  capability的使用

#### 背景：
*  集群CPU总量为4C
*  已默认创建名为default的queue，weight为1
*  集群中无任务运行

#### 操作：
1. 创建名为test的queue，capability设置cpu为2C，即test queue使用资源上限为2C
2. 创建名为p1的podgroup，属于test queue
3. 分别创建名为job1和job2的job，属于p1，资源申请量分别为1C和3C，依次下发。由于capability的限制，job1正常运行，job2处于pending状态

###  reclaimable的使用

#### 背景：
*  集群CPU总量为4C
*  已默认创建名为default的queue，weight为1
*  集群中无任务运行

#### 操作：
1. 创建名为test的queue，reclaimable设置为false，weight为1。此时，default weight:test weight = 1:1,即default queue和test queue均可使用2C。
2. 创建名为p1、p2的podgroup，分别属于test queue和default queue
3. 创建名为job1的job，属于p1，资源申请量3C，job1可正常运行。此时，由于default queue中尚无任务，test queue多占用1C
4. 创建名为job2的job，属于p2，资源申请量2C，任务下发后处于pending状态，即test queue的reclaimable为false导致该queue不归还多占的资源

### 说明事项
#### default queue
volcano启动后，会默认创建名为default的queue，weight为1。后续下发的job，若未指定queue，默认属于default queue
#### weight的软约束
weight的软约束是指weight决定的queue应得资源的份额并不是不能超出使用的。当其他queue的资源未充分利用时，需要超出使用资源的queue可临时多占。但其
他queue后续若有任务下发需要用到这部分资源，将驱逐该queue多占资源的任务以达到weight规定的份额（前提是queue的reclaimable为true）。这种设计可以
保证集群资源的最大化利用。