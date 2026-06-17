---
title: "Priority"
---

## 概述

Priority Plugin 提供作业和任务排序的实现，以及 PreemptableFn——计算哪些作业可以被抢占的函数。作业按照“priorityClassName”排序，任务按照“priorityClassName”、“createTime”、“id”依次排序。


## 它是如何运作的

Priority 插件实现了几个关键功能：

- **JobOrderFn**：比较两个作业并根据“job.spec.priorityClassName”确定它们的相对优先级
- **TaskOrderFn**：比较两个任务并通过按顺序比较`task.priorityClassName`、`task.createTime`和`task.id`来确定它们的相对优先级
- **PreemptableFn**：根据优先级标识可以被抢占的任务


![公平分享](/img/doc/fair-share.png)


## 设想

当集群运行多个作业但资源不足，并且每个作业都有不同数量的 Pod 等待调度时，使用 Kubernetes 默认调度程序将导致具有更多 Pod 的作业最终获得更多集群资源。在这种情况下，Volcano Scheduler提供了算法，使不同的作业能够以公平共享的方式共享集群资源。

### 自定义优先级

优先级插件使用户可以自定义作业和任务优先级，并根据自己的需求配置不同级别的调度策略。优先级根据作业在应用程序级别的“priorityClassName”进行排列。

### 实时要求

适用于实时性要求较高的应用集群，例如：

- 金融服务场景
- 物联网监控场景
- 实时分析

Priority Plugin 可以确保首先调度这些高优先级工作负载。

## 配置

Priority 插件通常放置在第一层插件中：

```yaml
tiers:
- plugins:
  - name: priority
  - name: gang
  - name: conformance
```

## 例子

### 创建优先级类

首先，在集群中创建 PriorityClass：

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
globalDefault: false
description: "High priority for critical workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 1000
globalDefault: false
description: "Low priority for batch workloads"
```

### 在 VolcanoJob 中使用优先级

然后在您的工作中引用优先级：

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: high-priority-job
spec:
  schedulerName: volcano
  priorityClassName: high-priority
  minAvailable: 1
  tasks:
  - replicas: 1
    name: task
    template:
      spec:
        priorityClassName: high-priority
        containers:
        - name: worker
          image: busybox
          command: ["sleep", "1000"]
```

在此示例中，当资源有限时，“高优先级”的作业将被调度在“低优先级”的作业之前。