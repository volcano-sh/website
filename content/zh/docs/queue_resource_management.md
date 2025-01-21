+++
title = "队列资源管理"

date = 2024-12-30
lastmod = 2024-12-30

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
toc_depth = 5
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
[menu.docs]
  parent = "features"
  weight = 5
+++

## 功能概述

[队列](/zh/docs/queue)是Volcano的核心概念之一，用于支持多租户场景下的资源分配与任务调度。通过队列，用户可以实现多租资源分配、任务优先级控制、资源抢占与回收等功能，显著提升集群的资源利用率和任务调度效率。

## 核心特性

### 1. 灵活的资源配置

   * 支持多维度资源配额控制(CPU、内存、GPU、NPU等)
   * 提供三级资源配置机制:
      * capability: 队列资源使用上限
      * deserverd: 资源应得量（在无其他队列提交作业时，该队列内作业所占资源量可超过deserverd值，当有多个队列提交作业且集群资源不够用时，超过deserverd值的资源量可以被其他队列回收）
      * guarantee: 资源预留量（预留资源只可被该队列所使用，其他队列无法使用）

      > 建议及注意事项: 
      >
      > 1. 进行三级资源配置时，需遵循: guarantee <= deserverd <= capability；
      > 2. guarantee/capability可按需配置，在开启capacity插件时需要配置deserverd值；
      > 3. deserverd配置建议：在平级队列场景，所有队列的deserverd值总和等于集群资源总量；在层级队列场景，子队列的deserverd值总和等于父队列的deserverd值，但不能超过父队列的deserverd值。
      > 4. capability配置注意事项：在层级队列场景，子队列的capability值不能超过父队列的capability值，若子队列的capability未设置，则会继承父队列的capability值。

   * 支持动态资源配额调整


### 2.层级队列管理

   * 支持多[层级队列](/zh/docs/hierarchical_queue)结构
   * 提供父子队列间的资源继承与隔离
   * 兼容Yarn式的资源管理模式，便于大数据工作负载迁移
   * 支持跨层级队列的资源共享与回收

### 3.智能资源调度

   * 资源借用：允许队列使用其他队列的空闲资源
   * 资源回收：当资源紧张时，优先回收超额使用的资源
   * 资源抢占：确保高优先级任务的资源需求

### 4.多租户隔离

   * 严格的资源配额控制
   * 基于优先级的资源分配
   * 防止单个租户过度占用资源

## 队列调度实现机制
### 队列相关Actions
Volcano中的队列调度涉及以下核心action：

1. `enqueue`：控制作业进入队列的准入机制，根据队列的资源配额和当前使用情况决定是否允许新作业进入队列。

2. `allocate`：负责资源分配过程，确保分配符合队列配额限制，同时支持队列间的资源借用机制，提高资源利用率。

3. `preempt`：支持**队列内**资源抢占。高优先级作业可以抢占同队列内低优先级作业的资源，确保关键任务的及时执行。

4. `reclaim`：支持**队列间**的资源回收。当队列资源紧张时，触发资源回收机制。优先回收超出队列deserved值的资源，并结合队列/作业优先级选择合适的牺牲者。

> **注意**：
> enqueue action和reclaim/preempt action是互相冲突的，如果enqueue action判断podgroup不允许入队，则vc-controller不会创建pending状态的pod，reclaim/preempt action也不会执行。

### 队列调度插件
Volcano提供了两个核心的队列调度插件：

#### capacity插件
[capacity插件](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_capacity_plugin.md)支持通过显式配置deserverd值来设置队列资源应得量，如以下队列配置示例：
<!--目前capacity插件介绍引用的是volcano主仓库中的capicity插件使用文档，后续需要更新为官网中的capicity插件使用文档-->
```
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: capacity-queue
spec:
  deserved:
    cpu: "10"
    memory: "20Gi"
  capability:
    cpu: "20"
    memory: "40Gi"
```
capacity插件通过精确的资源配置来进行配额控制，结合[层级队列](/zh/docs/hierarchical_queue)能实现更加精细的多租资源分配，也便于大数据工作负载迁移到Kubernetes集群上

> **注意**：当使用 Cluster Autoscaler 或 Karpenter 等集群弹性伸缩组件时，集群资源总量会动态变化。此时使用 capacity 插件需要手动调整队列的 deserverd 值以适应资源变化。

#### proportion插件
与capacity插件不同的是，proportion插件通过配置队列的Weight值来自动计算队列资源应得量，无需显式配置deserverd值，如以下队列配置示例：
```
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: proportion-queue
spec:
  weight: 1
  capability:
    cpu: "20"
    memory: "40Gi"
```
当集群总资源为 `total_resource` 时，每个队列的 deserverd 值计算公式为：
```
queue_deserved = (queue_weight / total_weight) * total_resource
```

其中，`queue_weight` 表示当前队列的权重，`total_weight` 表示所有队列权重之和，`total_resource` 表示集群总资源量。

与capacity插件相比，capacity插件可直接配置队列的deserverd值，而proportion插件通过权重比例自动计算队列的deserverd值，当集群资源发生变化时（如通过 Cluster Autoscaler 或 Karpenter 扩缩容），proportion插件会自动根据权重比例重新计算各队列的 deserverd 值，无需人工干预。

> **重要说明**：实际的 deserverd 值会进行动态调整，如果计算得到的 `queue_deserved` 大于队列中待调度 PodGroup 的总资源请求量（Request），则最终的 deserverd 值会被设置为总请求量（Request），这样可以避免资源的过度预留，提高整体利用率



#### 使用样例

以下示例展示了一个典型的队列资源管理场景，通过4个步骤说明资源回收机制：

**步骤1：初始状态**

集群初始状态下，default队列可使用全部资源(4C)。

**步骤2：创建初始作业**

在default队列中创建两个作业，分别申请1C和3C资源：

```yaml
# job1.yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: job1
spec:
  queue: default
  tasks:
    - replicas: 1
      template:
        spec:
          containers:
            - name: nginx
              image: nginx
              resources:
                requests:
                  cpu: "1"
---
# job2.yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: job2
spec:
  queue: default
  tasks:
    - replicas: 1
      template:
        spec:
          containers:
            - name: nginx
              image: nginx
              resources:
                requests:
                  cpu: "3"
```

此时两个job都能正常运行，因为暂时可以使用超出deserved的资源

**步骤3：创建新队列**

创建test队列并设置资源比例。可以选择使用capacity插件或proportion插件：

```yaml
# 使用capacity插件时的队列配置
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: test
spec:
  reclaimable: true
  deserved:
    cpu: 3
```
或
```yaml
# 使用proportion插件时的队列配置
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: test
spec:
  reclaimable: true
  weight: 3    # 资源分配比例为 default:test = 1:3
```

**步骤4：触发资源回收**

在test队列创建job3并申请3C资源（配置与job2类似，只需将queue改为test）：

```yaml
# job3.yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: job3
spec:
  queue: test    # 将队列改为test
  tasks:
    - replicas: 1
      template:
        spec:
          containers:
            - name: nginx
              image: nginx
              resources:
                requests:
                  cpu: "3"
```

提交job3后，系统开始资源回收：

1. 系统回收default队列超出deserved的资源
2. job2（3C）被驱逐
3. job1（1C）保留运行
4. job3（3C）开始运行

这个场景同时适用于capacity plugin和proportion plugin：

   * capacity plugin：直接配置deserved值（default=1C, test=3C）
   * proportion plugin：配置weight值（default=1, test=3）最终计算得到相同的deserved值

> **注意**：
> capacity 插件和 proportion 插件必须二选一，不能同时使用。选择哪个插件主要取决于您是想直接设置资源量(capacity)还是通过权重自动计算(proportion)。Volcano v1.9.0版本后推荐使用capacity插件，因为它提供了更直观的资源配置方式