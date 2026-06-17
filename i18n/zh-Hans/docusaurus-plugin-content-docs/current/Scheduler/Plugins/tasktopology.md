---
title: "Task-topology"
---

## 概述

任务拓扑算法根据作业中任务之间的亲和性和反亲和性配置来计算任务和节点的优先级。通过配置Job内任务之间的亲和性和反亲和性策略，并使用Task-topology算法，可以将亲和性配置的任务优先调度到同一节点，而反亲和性配置的任务则调度到不同的节点。

## 它是如何运作的

任务拓扑插件分析作业中的任务关系并优化放置：

- **亲和性**：受益于同一节点的任务（例如，为了快速本地通信）
- **反亲和性**：应该在不同节点上的任务（例如，为了容错）

实现的关键功能：

- **TaskOrderFn**：根据拓扑首选项对任务进行排序
- **NodeOrderFn**：根据节点满足拓扑要求的程度对节点进行评分

## 设想

### 节点亲和力

#### 深度学习和 TensorFlow

任务拓扑对于提高深度学习计算场景中的计算效率非常重要。以TensorFlow计算为例，配置ps（参数服务器）与worker的亲和力。 Task-topology算法使得“ps”和“worker”尽可能被调度到同一个节点，提高它们之间的网络和数据交互的效率，从而提高计算效率。

#### 高性能计算和MPI

HPC和MPI场景中的任务高度同步，需要高速的网络IO。将相关任务放置在同一节点上可以减少网络延迟并提高性能。

### 反亲和力

#### 参数服务器分布

在TensorFlow计算中，“ps”实例之间的反亲和性可以确保它们分布在不同的节点上，以实现更好的负载分配。

#### 高可用性

电商业务场景受益于主从备份的反亲和性和数据容灾，保证主作业失败后备份作业继续提供服务。

## 配置

在调度程序中启用任务拓扑插件：

```yaml
tiers:
- plugins:
  - name: priority
  - name: gang
- plugins:
  - name: predicates
  - name: nodeorder
  - name: task-topology
```

## 例子

### 具有任务亲和力的工作

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-job
spec:
  schedulerName: volcano
  minAvailable: 3
  policies:
  - event: PodEvicted
    action: RestartJob
  tasks:
  - replicas: 1
    name: ps
    policies:
    - event: TaskCompleted
      action: CompleteJob
    template:
      metadata:
        labels:
          role: ps
      spec:
        containers:
        - name: tensorflow
          image: tensorflow/tensorflow:latest
  - replicas: 2
    name: worker
    template:
      metadata:
        labels:
          role: worker
      spec:
        containers:
        - name: tensorflow
          image: tensorflow/tensorflow:latest
  plugins:
    env: []
    svc: []
  topologyPolicy:
    mode: affinity
    tiers:
    - tasks:
      - ps
      - worker
```

### 工作与任务反亲和力

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: ha-service
spec:
  schedulerName: volcano
  minAvailable: 2
  tasks:
  - replicas: 2
    name: master
    template:
      spec:
        containers:
        - name: master
          image: my-service:latest
  topologyPolicy:
    mode: anti-affinity
    tiers:
    - tasks:
      - master
```

在本例中，两个主副本将被调度到不同的节点以保证高可用性。