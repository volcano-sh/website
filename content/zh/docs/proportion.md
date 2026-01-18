+++
title = "Proportion"

date = 2021-05-13
lastmod = 2025-11-11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Proportion"
[menu.docs]
  parent = "plugins"
  weight = 5
+++

## 简介

Proportion调度算法是使用**Queue**的概念，用来控制集群总资源的分配比例。每一个queue分配到的集群资源比例是一定的。

举例来说，有3个团队，共享一个集群上的资源池：
- A团队最多使用总集群的40%
- B团队最多使用30%
- C团队最多使用30%

如果投递的作业量超过团队最大可用资源，就需要排队。

## 工作原理

Proportion插件根据队列配置管理资源分配：

- **Queue Weight**: 每个队列有一个权重，决定其集群资源的份额
- **Capability**: 队列可以使用的最大资源
- **Guarantee**: 保证给队列的最小资源
- **Deserved Resources**: 队列根据其权重应该获得的资源

实现的关键功能：

- **QueueOrderFn**: 根据资源利用率对队列进行调度排序
- **ReclaimableFn**: 确定是否可以从队列回收资源
- **OverusedFn**: 检查队列是否使用了超过其应得份额的资源

## 场景

Proportion调度算法为集群的调度带来了弹性、灵活性上面的提升：

### 多团队资源共享

最典型的场景就是在一个公司的多个开发团队，共用一个集群的时候，这种调度算法能够很好的处理不同部门之间的共享资源配比和隔离的需求。

### 多业务混合场景

在多业务混合场景：
- **计算密集型**: AI业务
- **网络IO密集型**: MPI和HPC业务
- **存储密集型**: 大数据业务

Proportion调度算法通过配比，能很好的按需分配共享资源。

## 配置

### 队列定义

首先，创建具有适当资源分配的队列：

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: team-a-queue
spec:
  weight: 4
  capability:
    cpu: "40"
    memory: "80Gi"
---
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: team-b-queue
spec:
  weight: 3
  capability:
    cpu: "30"
    memory: "60Gi"
---
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: team-c-queue
spec:
  weight: 3
  capability:
    cpu: "30"
    memory: "60Gi"
```

### 调度器配置

在调度器中启用Proportion插件：

```yaml
tiers:
- plugins:
  - name: priority
  - name: gang
- plugins:
  - name: drf
  - name: predicates
  - name: proportion
  - name: nodeorder
```

## 示例

### 在VolcanoJob中使用队列

将作业提交到特定队列：

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: team-a-job
spec:
  schedulerName: volcano
  queue: team-a-queue
  minAvailable: 2
  tasks:
  - replicas: 2
    name: worker
    template:
      spec:
        containers:
        - name: worker
          image: busybox
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
```

### 具有保证和能力的队列

创建同时具有最小保证和最大能力的队列：

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: production-queue
spec:
  weight: 5
  guarantee:
    resource:
      cpu: "10"
      memory: "20Gi"
  capability:
    cpu: "50"
    memory: "100Gi"
  reclaimable: true
```

在此配置中：
- 队列保证至少有10个CPU和20Gi内存
- 当资源可用时，它可以使用最多50个CPU和100Gi内存
- 当其他队列需要时，可以从此队列回收资源
