---
title: "Proportion"
---

## 概述

比例调度算法利用**队列**的概念来控制集群中分配的总资源的比例。每个队列都分配一定比例的集群资源。

例如，如果三个团队共享集群上的资源池：
- A 队最多可以使用整个集群的 40%
- B队最多可以使用30%
- C队最多可以使用30%

如果交付的工作量超过团队的最大可用资源，作业将排队。

## 它是如何运作的

Proportion 插件根据队列配置管理资源分配：

- **队列权重**：每个队列都有一个权重，决定其在集群资源中的份额
- **能力**：队列可以使用的最大资源
- **保证**：保证队列的最低资源
- **应得资源**：队列应根据其权重接收的资源

实现的关键功能：

- **QueueOrderFn**：根据资源利用率对队列进行排序以进行调度
- **ReclaimableFn**：确定是否可以从队列中回收资源
- **OverusedFn**：检查队列是否使用超过其应有的份额

## 设想

Proportion调度算法提高了集群调度的灵活性和弹性：

### 多团队资源共享

最典型的场景是公司内多个开发团队共享集群。这种调度算法很好地处理了不同部门之间共享资源分配和隔离的要求。

### 多业务混合场景

在具有不同工作负载的环境中：
- **计算密集型**：AI业务
- **网络IO密集型**：MPI和HPC业务
- **存储密集型**：大数据业务

比例调度算法可以通过匹配按需求分配共享资源。

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

### 调度程序配置

在调度程序中启用比例插件：

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

## 例子

### 在 VolcanoJob 中使用队列

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

### 有保障、有能力的队列

创建一个同时具有最小保证和最大容量的队列：

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
- 队列保证至少10个CPU和20Gi内存
- 在资源可用的情况下，最多可以使用 50 个 CPU 和 100Gi 内存
- 当其他队列需要资源时，可以从此队列回收资源