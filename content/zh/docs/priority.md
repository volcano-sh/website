+++
title = "Priority"

date = 2021-05-13
lastmod = 2025-11-11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Priority"
[menu.docs]
  parent = "plugins"
  weight = 6
+++

{{<figure library="1" src="fair-share.png" title="fair-share调度">}}

## 简介

Priority plugin提供了job、task排序的实现，以及计算牺牲作业的函数preemptableFn。job的排序根据priorityClassName，task的排序依次根据priorityClassName、createTime、id。

## 工作原理

Priority插件实现了几个关键功能：

- **JobOrderFn**: 比较两个作业并根据`job.spec.priorityClassName`确定它们的相对优先级
- **TaskOrderFn**: 比较两个任务并通过依次比较`task.priorityClassName`、`task.createTime`和`task.id`来确定它们的相对优先级
- **PreemptableFn**: 根据优先级级别识别可以被抢占的任务

## 场景

当集群运行了多个Job，但资源不足，并且每个Job下有不等数量的Pod等待被调度的时候，如果使用Kubernetes默认调度器，那么最终，具有更多Pod数量的Job将分得更多的集群资源。在这种情况下，volcano-scheduler提供算法支持不同的Job以fair-share的形式共享集群资源。

### 自定义优先级

Priority plugin能够让用户自定义job、task优先级，根据自己的需求在不同层次来定制调度策略。根据job的priorityClassName在应用层面进行优先级排序。

### 实时性要求

例如集群中有金融场景、物联网监控场景等需要较高实时性的应用，Priority plugin能够保证其优先得到调度。

## 配置

Priority插件通常放在插件的第一层：

```yaml
tiers:
- plugins:
  - name: priority
  - name: gang
  - name: conformance
```

## 示例

### 创建PriorityClass

首先，在集群中创建PriorityClass：

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
globalDefault: false
description: "关键工作负载的高优先级"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 1000
globalDefault: false
description: "批处理工作负载的低优先级"
```

### 在VolcanoJob中使用优先级

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

在此示例中，当资源有限时，具有`high-priority`的作业将在具有`low-priority`的作业之前被调度。
