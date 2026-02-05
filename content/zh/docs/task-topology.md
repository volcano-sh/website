+++
title = "Task-topology"

date = 2021-05-13
lastmod = 2026-01-19

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Task-topology"
[menu.docs]
  parent = "plugins"
  weight = 9
+++

## 简介

Task-topology算法是一种根据Job内task之间亲和性和反亲和性配置计算task优先级和Node优先级的算法。通过在Job内配置task之间的亲和性和反亲和性策略，并使用task-topology算法，可优先将具有亲和性配置的task调度到同一个节点上，将具有反亲和性配置的Pod调度到不同的节点上。

## 工作原理

Task-topology插件分析作业中的任务关系并优化放置：

- **亲和性**: 受益于在同一节点上的任务（例如，用于快速本地通信）
- **反亲和性**: 应该在不同节点上的任务（例如，用于容错）

实现的关键功能：

- **TaskOrderFn**: 根据拓扑偏好对任务排序
- **NodeOrderFn**: 根据节点满足拓扑要求的程度为节点评分

## 场景

### 节点亲和性

#### 深度学习和TensorFlow

Task-topology对于提升深度学习计算场景下的计算效率非常重要。以TensorFlow计算为例，配置"ps"（参数服务器）和"worker"之间的亲和性。Task-topology算法，可使"ps"和"worker"尽量调度到同一台节点上，从而提升"ps"和"worker"之间进行网络和数据交互的效率，进而提升计算效率。

#### HPC和MPI

HPC、MPI场景下task之间具有高度同步性，需要高速的网络IO。将相关任务放在同一节点上可以减少网络延迟并提高性能。

### 反亲和性

#### 参数服务器分布

以TensorFlow计算为例，"ps"与"ps"之间的反亲和性可以确保它们分布在不同的节点上以实现更好的负载分布。

#### 高可用性

电商服务场景的主从备份，数据容灾，保证一个作业挂掉之后有备用作业继续提供服务。

## 配置

在调度器中启用Task-topology插件：

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

## 示例

### 具有任务亲和性的作业

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

### 具有任务反亲和性的作业

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

在此示例中，两个master副本将被调度到不同的节点以确保高可用性。
