---
title: "Priority"
---

## 概述

Priority 插件提供了作业和任务排序的实现，以及 PreemptableFn——一个计算哪些作业可被抢占的函数。作业根据 `priorityClassName` 进行排序，任务则依次按 `priorityClassName`、`createTime` 和 `id` 排序。


## 工作原理

Priority 插件实现了以下几个关键函数：

- **JobOrderFn**：比较两个作业，根据 `job.spec.priorityClassName` 确定其相对优先级
- **TaskOrderFn**：比较两个任务，依次按 `task.priorityClassName`、`task.createTime` 和 `task.id` 确定其相对优先级
- **PreemptableFn**：根据优先级级别识别可被抢占的任务


![fair-share](/img/doc/fair-share.png)


## 应用场景

当集群运行多个作业但资源不足，且每个作业都有数量不等的 Pod 等待调度时，使用 Kubernetes 默认调度器会导致 Pod 数量较多的作业最终获得集群更多的资源。针对这种情况，Volcano 调度器提供了算法，使不同作业能够以公平共享的方式分配集群资源。

### 自定义优先级

Priority 插件使用户能够自定义作业和任务的优先级，并根据自身需求在不同级别配置调度策略。在应用层面，优先级按照 Job 的 `priorityClassName` 进行排列。

### 实时性要求

对于运行有高实时性要求应用的集群，例如：

- 金融服务场景
- IoT 监控场景
- 实时分析

Priority 插件可确保这些高优先级工作负载被优先调度。

## 配置

Priority 插件通常放置在插件配置的第一层：

```yaml
tiers:
- plugins:
  - name: priority
  - name: gang
  - name: conformance
```

## 示例

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

然后在作业中引用优先级类：

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

在此示例中，当资源有限时，具有 `high-priority` 的作业将在 `low-priority` 作业之前被调度。