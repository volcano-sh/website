---
title: "SLA"
---

## 概述

当用户向 Volcano 提交作业时，他们可能需要为作业添加特定的约束，例如最长的 Pending 时间，以防止作业饿死。这些约束可以被视为 Volcano 和用户之间商定的 **服务级别协议 (SLA)**。提供 SLA 插件来接收和实施单个作业和整个集群的 SLA 设置。

## 它是如何运作的

SLA 插件监控作业等待时间，并在违反 SLA 约束时采取措施：

- **JobWaitingTime**：作业在待处理状态下可以等待的最长时间
- **JobEnqueuedFn**：在排队之前检查作业是否满足 SLA 要求

当作业的等待时间超过配置的阈值时，调度程序可以采取纠正措施，例如确定作业的优先级或通知管理员。

## 设想

用户可以根据业务需求在自己的集群中自定义SLA相关参数：

### 实时服务

对于实时服务要求较高的集群，“JobWaitingTime”可以设置得尽可能小，以确保作业被快速调度或标记为引起注意。

### 批量计算

对于主要运行批量计算作业的集群，可以将“JobWaitingTime”设置得更大，以便随着时间的推移进行更灵活的调度。

### 多租户环境

在多租户集群中，不同的队列或命名空间可以根据其服务层具有不同的 SLA 要求。

## 配置

在调度程序 ConfigMap 中启用 SLA 插件：

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
|-----------|-------------|---------|
| `sla.JobWaitingTime` | 作业的最长等待时间 | - |

可以使用持续时间格式指定“JobWaitingTime”参数（例如“5m”、“1h”、“30s”）。

## 例子

### 集群范围的 SLA 配置

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

### 使用 SLA 注释的作业

您还可以在作业级别指定 SLA 约束：

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

在此示例中，如果作业在待处理状态下等待超过 10 分钟，SLA 插件会将其标记为优先调度或管理关注。

### 监控 SLA 违规情况

Volcano 公开了可用于监控 SLA 合规性的指标：

- 作业等待时间指标
- SLA 违规计数
- 队列级SLA统计

这些指标可以与 Prometheus 等监控系统集成，以跟踪整个集群的 SLA 合规性。