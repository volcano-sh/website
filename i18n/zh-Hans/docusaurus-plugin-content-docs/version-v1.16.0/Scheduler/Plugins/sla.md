---
title: "SLA"
---

## 概述

当用户向 Volcano 提交作业时，可能需要为作业添加特定约束，例如最长 Pending 时间以防止作业饥饿。这些约束可视为 Volcano 与用户之间约定的**服务级别协议（SLA）**。SLA 插件用于接收并执行针对单个作业和整个集群的 SLA 设置。

## 工作原理

SLA 插件监控作业的等待时间，并在 SLA 约束被违反时采取相应措施：

- **JobWaitingTime**：作业在 Pending 状态下允许等待的最长时间
- **JobEnqueuedFn**：在作业入队前检查是否满足 SLA 要求

当作业的等待时间超过配置的阈值时，调度器可采取纠正措施，例如提升作业优先级或通知管理员。

## 应用场景

用户可根据业务需求在自己的集群中自定义 SLA 相关参数：

### 实时服务

对于有高实时性要求的集群，可将 `JobWaitingTime` 设置得尽量小，以确保作业被快速调度或被标记为需关注。

### 批量计算

对于主要运行批量计算作业的集群，可将 `JobWaitingTime` 设置得较大，以允许更灵活的时间窗口内进行调度。

### 多租户环境

在多租户集群中，不同队列或命名空间可以根据其服务等级设置不同的 SLA 要求。

## 配置

在调度器 ConfigMap 中启用 SLA 插件：

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

| 参数 | 说明 | 默认值 |
|-----------|-------------|---------| 
| `sla.JobWaitingTime` | 作业的最长等待时间 | - |

`JobWaitingTime` 参数使用时长格式指定（例如 `5m`、`1h`、`30s`）。

## 示例

### 集群级 SLA 配置

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

### 带 SLA 注解的作业

也可以在作业级别指定 SLA 约束：

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

在此示例中，若作业在 Pending 状态下等待超过 10 分钟，SLA 插件将其标记为需优先调度或提醒管理员关注。

### 监控 SLA 违规

Volcano 暴露的指标可用于监控 SLA 合规情况：

- 作业等待时间指标
- SLA 违规计数
- 队列级 SLA 统计数据

这些指标可与 Prometheus 等监控系统集成，以跟踪整个集群的 SLA 合规状态。