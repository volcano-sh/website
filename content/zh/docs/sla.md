+++
title = "SLA"

date = 2021-05-13
lastmod = 2025-11-11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "SLA"
[menu.docs]
  parent = "plugins"
  weight = 9
+++

## 简介

SLA的全称是**Service Level Agreement**。用户向volcano提交job的时候，可能会给job增加特殊的约束，例如最长等待时间(JobWaitingTime)。这些约束条件可以视为用户与volcano之间的服务协议。SLA plugin可以为单个作业/整个集群接收或者发送SLA参数。

## 工作原理

SLA插件监控作业等待时间，并在违反SLA约束时采取行动：

- **JobWaitingTime**: 作业在pending状态下可以等待的最长时间
- **JobEnqueuedFn**: 在入队之前检查作业是否满足SLA要求

当作业的等待时间超过配置的阈值时，调度器可以采取纠正措施，如优先调度该作业或通知管理员。

## 场景

根据业务的需要用户可以在自己的集群定制SLA相关参数：

### 实时服务

例如实时性服务要求较高的集群，JobWaitingTime可以设置的尽量小，以确保作业快速被调度或标记为需要关注。

### 批量计算

批量计算作业为主的集群，JobWaitingTime可以设置较大，以允许更灵活的调度。

### 多租户环境

在多租户集群中，不同的队列或命名空间可以根据其服务层级有不同的SLA要求。

## 配置

在调度器ConfigMap中启用SLA插件：

```yaml
tiers:
- plugins:
  - name: priority
  - name: gang
  - name: sla
    arguments:
      sla.JobWaitingTime: 10m
```

### 配置参数

| 参数 | 描述 | 默认值 |
|------|------|--------|
| `sla.JobWaitingTime` | 作业的最大等待时间 | - |

`JobWaitingTime`参数可以使用持续时间格式指定（例如`5m`、`1h`、`30s`）。

## 示例

### 集群级SLA配置

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: volcano-scheduler-configmap
  namespace: volcano-system
data:
  volcano-scheduler.conf: |
    actions: "enqueue, allocate, backfill"
    tiers:
    - plugins:
      - name: priority
      - name: gang
      - name: sla
        arguments:
          sla.JobWaitingTime: 30m
    - plugins:
      - name: drf
      - name: predicates
      - name: proportion
      - name: nodeorder
```

### 具有SLA注解的作业

您还可以在作业级别指定SLA约束：

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: sla-constrained-job
  annotations:
    volcano.sh/sla-waiting-time: "10m"
spec:
  schedulerName: volcano
  minAvailable: 1
  tasks:
  - replicas: 1
    name: worker
    template:
      spec:
        containers:
        - name: worker
          image: busybox
          command: ["sleep", "3600"]
```

在此示例中，如果作业在pending状态下等待超过10分钟，SLA插件将标记它以进行优先调度或管理员关注。

### 监控SLA违规

Volcano公开了可用于监控SLA合规性的指标：

- 作业等待时间指标
- SLA违规计数
- 队列级SLA统计

这些指标可以与Prometheus等监控系统集成，以跟踪集群中的SLA合规性。
