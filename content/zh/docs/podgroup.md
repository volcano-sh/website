+++
title = "PodGroup"


date = 2019-01-28
lastmod = 2021-06-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "PodGroup"
[menu.docs]
  parent = "concepts"
  weight = 2
+++

### 定义
podgroup是一组强关联pod的集合，主要用于批处理工作负载场景，比如Tensorflow中的一组ps和worker。它是volcano自定义资源类型。

### 样例
```shell
apiVersion: scheduling.volcano.sh/v1beta1
kind: PodGroup
metadata:
  creationTimestamp: "2020-08-11T12:28:55Z"
  generation: 5
  name: test
  namespace: default
  ownerReferences:
  - apiVersion: batch.volcano.sh/v1alpha1
    blockOwnerDeletion: true
    controller: true
    kind: Job
    name: test
    uid: 028ecfe8-0ff9-477d-836c-ac5676491a38
  resourceVersion: "109074"
  selfLink: /apis/scheduling.volcano.sh/v1beta1/namespaces/default/podgroups/job-1
  uid: eb2508f5-3349-439c-b94d-4ac23afd71ff
spec:
  minMember: 1
  minResources:
    cpu: "3"
    memory: "2048Mi"
  priorityClassName: high-prority
  queue: default
status:
  conditions:
  - lastTransitionTime: "2020-08-11T12:28:57Z"
    message: '1/0 tasks in gang unschedulable: pod group is not ready, 1 minAvailable.'
    reason: NotEnoughResources
    status: "True"
    transitionID: 77d5be3f-6169-4f86-8e65-0bdc621ce983
    type: Unschedulable
  - lastTransitionTime: "2020-08-11T12:29:02Z"
    reason: tasks in gang are ready to be scheduled
    status: "True"
    transitionID: 54514401-5c90-4b11-840d-90c1cda93096
    type: Scheduled
  phase: Running
  running: 1

```

### 关键字段
* minMember

minMember表示该podgroup下**最少**需要运行的pod或任务数量。如果集群资源不满足miniMember数量任务的运行需求，调度器将不会调度任何一个该podgroup
内的任务。

* queue

queue表示该podgroup所属的queue。queue必须提前已创建且状态为open。

* priorityClassName

priorityClassName表示该podgroup的优先级，用于调度器为该queue中所有podgroup进行调度时进行排序。**system-node-critical**和**system-cluster-critical**
是2个预留的值，表示最高优先级。不特别指定时，默认使用default优先级或zero优先级。

* minResources

minResources表示运行该podgroup所需要的最少资源。当集群可分配资源不满足minResources时，调度器将不会调度任何一个该podgroup内的任务。

* phase

phase表示该podgroup当前的状态。

* conditions

conditions表示该podgroup的具体状态日志，包含了podgroup生命周期中的关键事件。

* running

running表示该podgroup中当前处于running状态的pod或任务的数量。

* succeed

succeed表示该podgroup中当前处于succeed状态的pod或任务的数量。

* failed

failed表示该podgroup中当前处于failed状态的pod或任务的数量。

### 资源状态

{{<figure library="1" src="status-DAG.png" title="status-DAG">}}

* pending

pending表示该podgroup已经被volcano接纳，但是集群资源暂时不能满足它的需求。一旦资源满足，该podgroup将转变为running状态。

* running

running表示该podgroup至少有**minMember**个pod或任务处于running状态。

* unknown

unknown表示该podgroup中**minMember**数量的pod或任务分为2种状态，部分处于running状态，部分没有被调度。没有被调度的原因可能是资源不够等。调度
器将等待controller重新拉起这些pod或任务。

* inqueue

inqueue表示该podgroup已经通过了调度器的校验并入队，即将为它分配资源。inqueue是一种处于pending和running之间的中间状态。





  

### 使用场景
* minMember的使用

在某些场景下，可能会只需要某个任务的子任务运行达到一定的数量，即可认为本次任务可以运行，如机器学习训练。这种情况下适合使用minMember字段。

* priorityClassName的使用

priorityClassName用于podgroup的优先级排序，可用于任务抢占调度场景。它本身也是一种资源。

* minResources的使用

在某些场景下，任务的运行必须满足最小资源要求，不满足则不能运行该任务，如某些大数据分析场景。这种情况下适合使用minResources字段。

### 说明事项
* 自动创建podgroup

当创建vcjob（Volcano Job的简称）时，若没有指定该vcjob所属的podgroup，默认会为该vcjob创建同名的podgroup。