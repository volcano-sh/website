+++
title = "介绍"


date = 2024-01-16
lastmod = 2024-01-16

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "概览"
[menu.v1-8-2]
  parent = "scheduler"
  weight = 1
+++

### 简介
Volcano Scheduler是负责Pod调度的组件，它由一系列action和plugin组成。action定义了调度各环节中需要执行的动作；plugin根据不同场景提供了action
中算法的具体实现细节。Volcano scheduler具有高度的可扩展性，您可以根据需要实现自己的action和plugin。

### 工作流
{{<figure library="1" src="scheduler.PNG" title="Volcano scheduler工作流">}}

Volcano scheduler的工作流程如下：

1. 客户端提交的Job被scheduler观察到并缓存起来。
2. 周期性的开启会话，一个调度周期开始。
3. 将没有被调度的Job发送到会话的待调度队列中。
4. 遍历所有的待调度Job，按照定义的次序依次执行enqueue、allocate、preempt、reclaim、backfill等动作，为每个Job找到一个最合适的节点。将该Job
绑定到这个节点。action中执行的具体算法逻辑取决于注册的plugin中各函数的实现。
5. 关闭本次会话。

## Actions
### enqueue
Enqueue action负责通过一系列的过滤算法筛选出符合要求的待调度任务并将它们送入待调度队列。经过这个action，任务的状态将由pending变为inqueue。
### allocate
Allocate action负责通过一系列的预选和优选算法筛选出最适合的节点。
### preempt
Preempt action负责根据优先级规则为同一队列中高优先级任务执行抢占调度。
### reclaim
Reclaim action负责当一个新的任务进入待调度队列，但集群资源已不能满足该任务所在队列的要求时，根据队列权重回收队列应得资源。
### backfill
backfill action负责将处于pending状态的任务尽可能的调度下去以保证节点资源的最大化利用。

## Plugins
### gang
gang plugin认为未处于ready状态（包括Binding、Bound、Running、Allocated、Succeed、Pipelined）的任务具有更高的优先级。它会检查假如驱逐某
些任务回收队列部分应得资源后，该任务所属的Job中任务的运行数量是否满足minAvailable的要求，以决定是否执行驱逐动作。
### conformance
conformance plugin认为命名空间kube-system下的任务具有更高的优先级。这些任务不能被抢占。
### DRF
DRF plugin认为占用资源较少的任务具有更高的优先级。它会尝试计算已分配给抢占者和被抢占者的资源总量，并在抢占者资源资源份额更少时触发抢占行为。
### nodeorder
nodeorder plugin通过一系列维度的打分算法，算出针对某个任务时所有的节点的得分情况。得分最高的节点被认为是针对该任务最合适的节点。
### predicates
predictions plugin通过一系列维度的评估算法，决定某个任务是否适合被绑定到某个节点。
### priority
priority plugin用于比较两个job或任务的优先级。它通过比较job.spec.priorityClassName来决定哪个job的优先级更高。对于两个任务，它会依次比较
task.priorityClassName、task.createTime、task.id in order来决定谁的优先级更高。
## 配置
由于Volcano scheduler采用了组合模式的设计，它具有高度的扩展性。用户可以根据个人需要决定使用哪些action和plugin，也可以根据action和plugin的
接口自定义实现。scheduler的配置位于名为**volcano-scheduler-configmap**的configmap内，该configmap被作为volume挂载在容器的/volcano.scheduler
路径下。
### 如何查看Volcano scheduler的配置
* 查看名为volcano-scheduler-configmap的configmap

```shell
# kubectl get configmap -nvolcano-system
NAME                          DATA   AGE
volcano-scheduler-configmap   1      6d2h
```

* 查看configmap的data部分详情

```shell
# kubectl get configmap volcano-scheduler-configmap -nvolcano-system -oyaml
apiVersion: v1
data:
  volcano-scheduler.conf: |
    actions: "enqueue, allocate, backfill"
    tiers:
    - plugins:
      - name: priority
      - name: gang
      - name: conformance
    - plugins:
      - name: drf
      - name: predicates
      - name: proportion
      - name: nodeorder
      - name: binpack
kind: ConfigMap
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"v1","data":{"volcano-scheduler.conf":"actions: \"enqueue, allocate, backfill\"\ntiers:\n- plugins:\n  - name: priority\n  - name: gang\n  - name: conformance\n- plugins:\n  - name: drf\n  - name: predicates\n  - name: proportion\n  - name: nodeorder\n  - name: binpack\n"},"kind":"ConfigMap","metadata":{"annotations":{},"name":"volcano-scheduler-configmap","namespace":"volcano-system"}}
  creationTimestamp: "2020-08-15T04:01:02Z"
  name: volcano-scheduler-configmap
  namespace: volcano-system
  resourceVersion: "266"
  selfLink: /api/v1/namespaces/volcano-system/configmaps/volcano-scheduler-configmap
  uid: 1effe4d6-126c-42d6-a3a4-b811075c30f5
```

在volcano-scheduler.conf中主要包括actions和tiers两部分。在actions中，使用逗号作为分隔符配置各需要执行的action。需要注意的是，action的配置
顺序就是scheduler的执行顺序。Volcano本身不会对action顺序的合理性进行检查。tiers中配置的plugin列表即为注册到scheduler中的plugin。plugin中
实现的算法将会被action调用。