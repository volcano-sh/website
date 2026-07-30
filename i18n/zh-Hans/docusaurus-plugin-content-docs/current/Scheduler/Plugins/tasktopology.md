---
title: "Task-topology"
---

## 概述

Task-topology 算法根据 Job 内任务之间的亲和性和反亲和性配置来计算任务和节点的优先级。通过配置 Job 内任务之间的亲和性和反亲和性策略，并使用 Task-topology 算法，具有亲和性配置的任务将优先被调度到同一节点，而具有反亲和性配置的任务则被调度到不同节点。

## 工作原理

Task-topology 插件分析作业内的任务关系并优化任务放置：

- **亲和性（Affinity）**：适合放置在同一节点上的任务（例如，以实现快速本地通信）
- **反亲和性（Anti-affinity）**：应放置在不同节点上的任务（例如，以实现容错）

实现的关键函数：

- **TaskOrderFn**：根据拓扑偏好对任务进行排序
- **NodeOrderFn**：根据节点满足拓扑要求的程度对节点打分

## 应用场景

### 节点亲和性

#### 深度学习与 TensorFlow

Task-topology 对于提高深度学习计算场景中的计算效率非常重要。以 TensorFlow 计算为例，配置"ps"（参数服务器）与"worker"之间的亲和性，Task-topology 算法能够使"ps"和"worker"尽可能被调度到同一节点，从而提高二者之间的网络和数据交互效率，进而提升计算效率。

#### HPC 与 MPI

HPC 和 MPI 场景中的任务具有高度同步性，需要高速网络 IO。将相关任务放置在同一节点上可降低网络延迟，提升性能。

### 反亲和性

#### 参数服务器分布

在 TensorFlow 计算中，"ps"实例之间的反亲和性可确保它们分布在不同节点上，以实现更好的负载均衡。

#### 高可用性

电商服务场景可利用反亲和性实现主从备份和数据容灾，确保在主作业故障后备份作业能够继续提供服务。

## 配置

在调度器中启用 Task-topology 插件：

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

### 带任务亲和性的作业

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

### 带任务反亲和性的作业

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

在此示例中，两个 master 副本将被调度到不同节点，以确保高可用性。

## 传统注解用法 (Legacy Annotation Usage)

在较早的版本中（或在使用特定算子如 kubeflow/tf-operator 时），Task Topology 也支持通过 Job 或 Pod 上的注解（Annotations）来进行配置。

### 更新调度器配置

注册 `task-topology` 插件并可配置权重参数：

```yaml
    - plugins:
      - name: task-topology
        arguments:
          task-topology.weight: 10
```

### 使用注解配置

以 tensorflow job 为例：

1. 在 volcano job 或 tensorflow job 中添加以下格式的注解：
   1. `affinity` 注解表示任务之间有联系，因此应将它们分配到相同的节点；
   2. `anti-affinity` 注解表示任务之间没有联系，因此应将它们分配到不同的节点；
   3. `task-order` 注解表示分配任务的顺序。例如，`ps,worker` 意味着调度器应优先调度 `ps` 任务。当所有 `ps` 任务分配完成后，调度器开始调度 `worker` 任务。**此注解不是必填项。**

```yaml
    volcano.sh/task-topology-affinity: "ps,worker;ps,evaluator"
    volcano.sh/task-topology-anti-affinity: "ps;worker,chief;chief,evaluator"
    volcano.sh/task-topology-task-order: "ps,worker,chief,evaluator"
```