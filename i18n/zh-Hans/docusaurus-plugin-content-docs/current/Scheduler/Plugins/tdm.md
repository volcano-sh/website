---
title: "TDM"
---
## 概述

TDM 的全称是**时分复用（Time Division Multiplexing）**。在混合部署环境中，部分节点可能同时属于 Kubernetes 集群和 YARN 集群。对于这些节点，Kubernetes 和 YARN 集群可以通过时分复用的方式共享这些资源。

TDM 插件将这些节点标记为`可撤销节点`。在节点的可撤销时间窗口内，TDM 插件会尝试将`可抢占任务`调度到`可撤销节点`上。在可撤销时间窗口结束后，TDM 插件会将`可撤销节点`上的`可抢占任务`驱逐。

TDM 插件提升了 Volcano 调度过程中节点资源的时分复用能力。

## 工作原理

TDM 插件管理基于时间的资源共享：

1. **可撤销节点（Revocable Nodes）**：被标记为可撤销的节点，可在多个编排系统之间共享
2. **可撤销时间窗口（Revocable Time Windows）**：定义节点对 Kubernetes 工作负载可用的时间段
3. **可抢占任务（Preemptable Tasks）**：在可撤销时间窗口结束时可被驱逐的任务

关键函数：

- **PredicateFn**：检查任务是否可以在当前时间窗口内被调度到可撤销节点上
- **PreemptableFn**：根据时间约束判断任务是否应被驱逐

## 应用场景

### ToB 业务

在 ToB（企业对企业）场景中，云厂商为商家提供基于云的资源，不同商家采用不同的容器编排框架（Kubernetes、YARN 等）。TDM 插件提高了公共节点资源的时分复用效率，进一步提升资源利用率。

### 混合集群

同时运行 Kubernetes 和 Hadoop/YARN 工作负载的组织可以使用 TDM 在两个系统之间共享物理节点，通过基于时间的调度确保工作负载互不干扰。

### 成本优化

通过启用时分复用，组织可以在不同时间段跨不同工作负载类型共享节点，从而最大化硬件基础设施的利用率。

## 配置

### 节点标签

首先，将节点标记为可撤销：

```bash
kubectl label node <node-name> volcano.sh/revocable-node=true
kubectl annotate node <node-name> volcano.sh/revocable-zone="zone-a"
```

### 调度器配置

启用带时间窗口配置的 TDM 插件：

```yaml
tiers:
- plugins:
  - name: priority
  - name: gang
- plugins:
  - name: predicates
  - name: tdm
    arguments:
      tdm.revocable-zone.zone-a: "0 8 * * *:0 18 * * *"
      tdm.revocable-zone.zone-b: "0 20 * * *:0 6 * * *"
```

### 配置参数

| 参数 | 说明 | 格式 |
|-----------|-------------|--------|
| `tdm.revocable-zone.<zone-name>` | 可撤销区域的时间窗口 | `<start-cron>:<end-cron>` |

时间窗口使用 Cron 表达式指定：
- `0 8 * * *` 表示"每天 8:00 AM"
- `0 18 * * *` 表示"每天 6:00 PM"

## 示例

### 可撤销节点配置

```bash
# 将节点标记为 zone-a 中的可撤销节点
kubectl label node worker-node-1 volcano.sh/revocable-node=true
kubectl annotate node worker-node-1 volcano.sh/revocable-zone=zone-a
```

### 带 TDM 的调度器 ConfigMap

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
    - plugins:
      - name: predicates
      - name: tdm
        arguments:
          # zone-a 在每天 8 AM 至 6 PM 期间对 Kubernetes 可用
          tdm.revocable-zone.zone-a: "0 8 * * *:0 18 * * *"
      - name: nodeorder
```

### 可抢占作业

提交一个可被调度到可撤销节点上的作业：

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: preemptable-job
  annotations:
    volcano.sh/preemptable: "true"
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

在此示例中：
- 作业被标记为可抢占
- 在配置的时间窗口内，可被调度到可撤销节点上
- 时间窗口结束时，作业将被驱逐