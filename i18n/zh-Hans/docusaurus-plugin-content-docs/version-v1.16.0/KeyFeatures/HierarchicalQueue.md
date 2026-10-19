---
title: "层级队列"
---

## 背景
在多租户场景中，队列是实现公平调度、资源隔离和任务优先级控制的核心机制。然而，在 Volcano 的当前版本中，队列仅支持扁平结构，缺乏层级概念。在实际应用中，不同的队列往往属于不同的部门，部门之间存在层级关系，导致对资源分配和抢占有更精细的要求。为解决这一问题，Volcano 最新版本引入了层级队列功能，显著增强了队列能力。通过该功能，用户可以基于层级队列实现更细粒度的资源配额管理和抢占策略，构建更高效的统一调度平台。

对于使用 YARN 的用户，此功能允许将大数据工作负载无缝迁移到使用 Volcano 的 Kubernetes 集群。YARN 的 Capacity Scheduler 已经支持层级队列，实现了跨层级资源分配和抢占。Volcano 最新版本采用了类似的层级队列设计，提供了更灵活的资源管理和调度策略。

## 功能支持
- 支持配置队列之间的层级关系。
- 支持跨层级队列中任务之间的资源共享和回收。
- 支持为每个资源维度设置资源能力限制 `capability`、资源应得量 `deserved`（如果队列的已分配资源超过其 `deserved` 值，则该队列的资源可以被回收）和预留资源 `guarantee`（为队列预留的资源，不能与其他队列共享）。

## 用户指南
### 调度器配置
在新版本中，层级队列能力构建在 `capacity` 插件之上。调度器配置需要启用 `capacity` 插件，将 `enableHierarchy` 设置为 `true`，并启用 `reclaim` 动作以支持队列之间的资源回收。调度器配置示例如下：

```
kind: ConfigMap
apiVersion: v1
metadata:
  name: volcano-scheduler-configmap
  namespace: volcano-system
data:
  volcano-scheduler.conf: |
    actions: "allocate, preempt, reclaim"
    tiers:
    - plugins:
      - name: priority
      - name: gang
        enablePreemptable: false
    - plugins:
      - name: drf
        enablePreemptable: false
      - name: predicates
      - name: capacity # 必须启用 capacity 插件
        enableHierarchy: true # 启用层级队列
      - name: nodeorder
```

### 构建层级队列
Queue 规范中添加了一个新的 `parent` 字段来指定父队列：

```
type QueueSpec struct {
    ...
	// Parent defines the parent of the queue
	// +optional
	Parent string `json:"parent,omitempty" protobuf:"bytes,8,opt,name=parent"`
    ...
}
```

Volcano 调度器将在启动时自动创建一个 root 队列作为所有队列的根。用户可以基于 root 队列构建层级队列树，例如以下树结构：

![Figure 1: Hierarchical Queue Example](/img/doc/hierarchical-queue-example.png)

```
# child-queue-a 的父队列是 root 队列
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: child-queue-a
spec:
  reclaimable: true
  parent: root 
  deserved:
    cpu: 64
    memory: 128Gi
---
# child-queue-b 的父队列是 root 队列
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: child-queue-b
spec:
  reclaimable: true
  parent: root 
  deserved:
    cpu: 64
    memory: 128Gi
---
# subchild-queue-a1 的父队列是 child-queue-a
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: subchild-queue-a1
spec:
  reclaimable: true
  parent: child-queue-a
  # 您可以按需设置 deserved 值。如果队列的已分配资源超过 deserved 值，队列中的任务可以被回收。
  deserved: 
    cpu: 32
    memory: 64Gi
---
# subchild-queue-a2 的父队列是 child-queue-a
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: subchild-queue-a2
spec:
  reclaimable: true
  parent: child-queue-a 
  # 您可以按需设置 deserved 值。如果队列的已分配资源超过 deserved 值，队列中的任务可以被回收。
  deserved: 
    cpu: 32
    memory: 64Gi
---
# 提交一个示例 vc-job 到叶子队列 subchild-queue-a1
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: job-a
spec:
  queue: subchild-queue-a1
  schedulerName: volcano
  minAvailable: 1
  tasks:
    - replicas: 1
      name: test
      template:
        spec:
          containers:
            - image: alpine
              command: ["/bin/sh", "-c", "sleep 1000"]
              imagePullPolicy: IfNotPresent
              name: alpine
              resources:
                requests:
                  cpu: "1"
                  memory: 2Gi
```

当集群资源不足以满足 Pod 需求时，可以回收 Pod 的资源。对于不同队列中的 Pod，它们将首先回收兄弟队列中的 Pod（如果兄弟队列的已分配资源超过 `deserved` 值）。如果兄弟队列中的资源仍然不足以满足 Pod 的需求，则会向上遍历队列的层级结构（即祖先队列）以寻找足够的资源。例如，如果 job-a 和 job-c 先提交，而集群资源不足以运行 job-b，则 job-b 将首先回收 job-a。如果回收 job-a 不能满足资源要求，则随后将考虑回收 job-c。

请注意，在当前版本中，用户只能向 **叶子队列** 提交作业。如果任务已提交给父队列，则无法在该队列下创建子队列。这确保了对队列层级结构中不同级别的资源和任务进行有效管理。此外，子队列的 `deserved`/`guarantee` 值之和不能超过为父队列配置的 `deserved`/`guarantee` 值。每个子队列的 `capability` 值不能超过父队列的 `capability` 限制。如果队列未指定某个资源维度的 `capability` 值，它将继承其父队列的 `capability`。如果父队列和所有祖先队列都未指定，则该值最终将继承自 root 队列。默认情况下，root 队列的 `capability` 设置为集群中该维度的总可用资源。