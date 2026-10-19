---
title: "Proportion"
---

## 概述

Proportion 调度算法通过**队列（Queue）**的概念来控制集群中各队列所分配的总资源比例。每个队列被分配一定比例的集群资源。

例如，如果三个团队共享一个集群的资源池：
- 团队 A 最多可使用集群总量的 40%
- 团队 B 最多可使用 30%
- 团队 C 最多可使用 30%

若提交的工作量超过团队最大可用资源，作业将进入排队状态。

## 工作原理

Proportion 插件基于队列配置管理资源分配：

- **队列权重（Queue Weight）**：每个队列具有一个权重，决定其在集群资源中的份额
- **上限（Capability）**：队列可使用的最大资源量
- **保障（Guarantee）**：保障给队列的最小资源量
- **应得资源（Deserved Resources）**：队列根据其权重应获得的资源量

实现的关键函数：

- **QueueOrderFn**：根据资源利用情况对队列进行调度排序
- **ReclaimableFn**：判断是否可以从某个队列回收资源
- **OverusedFn**：检查某个队列是否使用了超过其应得份额的资源

## 应用场景

Proportion 调度算法提高了集群调度的灵活性和弹性：

### 多团队资源共享

最典型的场景是公司内多个开发团队共享一个集群。该调度算法能够很好地处理不同部门之间共享资源分配和隔离的需求。

### 多业务混合场景

在工作负载多样化的环境中：
- **计算密集型**：AI 业务
- **网络 IO 密集型**：MPI 和 HPC 业务
- **存储密集型**：大数据业务

Proportion 调度算法可以通过匹配按需分配共享资源。

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

在调度器中启用 Proportion 插件：

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

### 在 VolcanoJob 中使用队列

将作业提交到指定队列：

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

### 带保障与上限的队列

创建同时具有最小保障和最大上限的队列：

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
- 该队列至少保障 10 个 CPU 和 20Gi 内存
- 在资源可用时，最多可使用 50 个 CPU 和 100Gi 内存
- 当其他队列需要资源时，可从该队列回收资源