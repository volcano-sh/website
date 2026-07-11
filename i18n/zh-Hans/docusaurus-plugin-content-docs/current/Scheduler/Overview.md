---
title: "Introduction"
sidebar_position: 1
---

## 简介
Volcano调度器是负责pod调度的组件。它由一系列操作和插件组成。操作定义了每个步骤中应执行的操作。插件提供了不同场景下的动作算法细节。
Volcano 调度程序具有高度可扩展性。您可以根据您的要求指定和实施操作和插件。
## 工作流程
![火山调度程序工作流程](/img/doc/scheduler.PNG)


Volcano调度器的工作原理如下：

1. 监视并缓存客户端提交的作业。
2. 定期打开会话。一个调度周期开始。
3. 将缓存中未调度的作业发送到会话中的待调度队列中。
4. 遍历所有要调度的作业。按照定义的顺序执行排队、分配、抢占、回收和回填操作，并为每个作业找到最合适的节点。将作业绑定到节点。 action中执行的具体算法逻辑取决于注册插件中每个函数的实现。
5. 关闭本次会话。

## 行动
### 入队
入队动作负责根据一系列过滤算法过滤出符合调度要求的任务，并将其发送到待调度队列中。执行操作后，任务的状态从“pending”变为“inqueue”。 
###分配
分配动作负责根据一系列预测和优化算法选择最合适的节点。 
### 抢占
抢占动作负责按照优先级规则抢占调度同一队列中的高优先级任务。 
### 回收
回收动作负责当新任务进入队列且集群资源无法满足队列需要时，根据队列权重回收分配给集群的资源。
###回填
回填动作负责将处于“pending”状态的任务回填到集群节点中，以最大化节点的资源利用率。

## 插件
### 帮派
gang 插件认为未处于“Ready”状态的任务（包括 Binding、Bound、Running、Allocated、Succeed 和 Pipelined）具有更高的优先级。它在尝试驱逐一些 Pod 并回收资源后，检查分配给队列的资源是否能够满足任务运行“minavailable”Pod 所需的资源。如果是，gang 插件将驱逐一些 pod。 
### 一致性
一致性插件认为命名空间“kube-system”中的任务具有更高的优先级。这些任务不会被抢占。
### DRF
DRF插件认为资源较少的任务具有较高的优先级。它尝试计算分配给抢占者和被抢占任务的资源总量，并在抢占者任务资源较少时触发抢占。
### 节点顺序
nodeorder 插件通过使用一系列评分算法对任务的所有节点进行评分。得分最高的节点被认为是最适合该任务的节点。
### 谓词
谓词插件通过使用一系列评估算法来确定任务是否绑定到节点。
### 优先级
优先级插件比较两个作业或任务的优先级。对于两个作业，它通过比较“job.spec.priorityClassName”来决定谁的优先级更高。对于两个任务，它通过依次比较“task.priorityClassName”、“task.createTime”和“task.id”来决定谁的优先级更高。
## 配置
Volcano 调度程序因其复合模式设计而具有高度可扩展性。用户可以根据自己的需要决定使用哪些action和plugin，也可以通过调用action或plugin接口来实现定制。调度程序配置位于名为 **volcano-scheduler-configmap** 的 ConfigMap 中，它作为卷安装到调度程序容器中的“/volcano.scheduler”目录中。
### 如何获取 Volcano Scheduler 的配置
* 获取名为“volcano-scheduler-configmap”的ConfigMap。

```shell
# kubectl get configmap -nvolcano-system
NAME                          DATA   AGE
volcano-scheduler-configmap   1      6d2h
```

* 查看ConfigMap中data部分的详细信息。

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

“actions”和“tiers”包含在“volcano-scheduler.conf”中。在“actions”中，逗号用作分隔符来配置要由调度程序执行的操作。请注意，调度程序将按照配置的顺序执行操作。 Volcano本身不会检查订单的合理性。 `tiers` 中配置的插件列表是向调度程序注册的插件。插件中定义的具体算法将在`actions`中调用。