---
id: podgroup
title: PodGroup
sidebar_position: 2
---

## 简介
PodGroup 是一组具有强关联性的 Pod 集合，主要用于批量调度，例如 TensorFlow 中的 ps 和 worker 任务。PodGroup 是一种自定义资源定义 (CRD) 类型。

## 示例
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
  priorityClassName: high-priority
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
## 关键字段
### minMember
`minMember` 表示 PodGroup 下运行的最小 Pod 或任务数量。如果集群资源无法满足运行最小数量 Pod 或任务的需求，则不会调度 PodGroup 中的任何 Pod 或任务。
### queue
`queue` 表示 PodGroup 所属的队列。队列必须处于 Open 状态。
### priorityClassName
`priorityClassName` 表示 PodGroup 的优先级，调度器在调度期间使用它来对队列中的所有 PodGroup 进行排序。注意，**system-node-critical** 和 **system-cluster-critical** 是保留值，表示最高优先级。如果未指定 `priorityClassName`，则使用默认优先级。
### minResources
`minResources` 表示运行 PodGroup 所需的最小资源。如果集群中的可用资源无法满足要求，则也不会调度 PodGroup 中的任何 Pod 或任务。
### phase
`phase` 表示 PodGroup 的当前状态。
### conditions
`conditions` 表示 PodGroup 的状态日志，包括 PodGroup 生命周期中发生的关键事件。  
### running
`running` 表示 PodGroup 中正在运行的 Pod 或任务的数量。
### succeed
`succeed` 表示 PodGroup 中成功的 Pod 或任务的数量。
### failed
`failed` 表示 PodGroup 中失败的 Pod 或任务的数量。
## 状态 (Status)
![status-DAG](/img/doc/status-DAG.png)

### pending

`pending` 表示 PodGroup 已被 Volcano 接受，但其资源需求尚未满足。一旦满足，状态将变为 running。
### running
`running` 表示 PodGroup 下至少有 **minMember** 个 Pod 或任务正在运行。
### unknown
`unknown` 表示在 **minMember** 个 Pod 或任务中，有些正在运行，而有些尚未调度。原因可能是资源不足。调度器将等待 ControllerManager 再次启动这些 Pod 或任务。
### inqueue
`inqueue` 表示 PodGroup 已通过校验，正在等待绑定到节点。它是 pending 和 running 之间的一个瞬态。
## 用法
### minMember
在机器学习训练等某些场景中，您不需要作业的所有任务都完成。相反，当指定数量的任务完成时，作业即可完成。在这种情况下，`minMember` 字段非常适用。
### priorityClassName
`priorityClassName` 用于抢占式优先级调度。
### minResources 
在大数据分析等某些场景中，只有当可用资源满足最小要求时，作业才能运行。`minResources` 适用于此类场景。
## 注意
#### 自动创建
如果创建 VolcanoJob 时未指定 PodGroup，Volcano 将创建一个与 VolcanoJob 同名的 PodGroup。  