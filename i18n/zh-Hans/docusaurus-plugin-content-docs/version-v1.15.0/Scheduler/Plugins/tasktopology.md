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
    arguments:
      task-topology.weight: 10
```

## 注解

通过 Job 上的注解配置任务拓扑。Volcano Job 控制器会将这些注解传递给 PodGroup，插件从 PodGroup 中读取注解。

| 注解 | 说明 |
| --- | --- |
| `volcano.sh/task-topology-affinity` | 定义倾向于调度到同一节点的任务组。使用分号（`;`）分隔不同组，使用逗号（`,`）分隔组内的任务名称，例如 `"ps,worker;ps,evaluator"`。只包含一个任务名称的组表示该任务的多个副本具有自亲和性。 |
| `volcano.sh/task-topology-anti-affinity` | 定义倾向于调度到不同节点的任务组。格式与亲和性注解相同，例如 `"ps;worker,chief"`。只包含一个任务名称的组表示该任务的多个副本具有自反亲和性。 |
| `volcano.sh/task-topology-task-order` | 使用逗号分隔的任务名称列表定义任务分配优先级。靠前的任务优先级更高，例如 `"ps,worker"` 表示 `ps` 的优先级高于 `worker`。此注解为可选项，仅影响参与亲和性或反亲和性分组的任务。 |

注解中的任务名称必须与 Job 中的任务一致，并且同一组内不能重复任务名称。如果拓扑注解无效，插件将忽略该 Job 的拓扑配置。亲和性和反亲和性是评分偏好，而不是硬性调度约束。

## 示例

### 带任务亲和性的作业

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-job
  annotations:
    volcano.sh/task-topology-affinity: "ps,worker"
    volcano.sh/task-topology-task-order: "ps,worker"
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
```

插件会先调度 `ps` 任务，再调度 `worker` 任务，并提高已运行同一亲和性组内任务的节点得分。

### 带任务反亲和性的作业

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: ha-service
  annotations:
    volcano.sh/task-topology-anti-affinity: "master"
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
```

在此示例中，已运行 `master` 副本的节点得分会降低，因此两个副本倾向于调度到不同节点。