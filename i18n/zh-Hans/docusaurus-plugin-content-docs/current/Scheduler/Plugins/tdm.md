---
title: "TDM"
---
## 概述

TDM 的全称是**时分复用**。在共置环境中，某些节点可能同时属于 Kubernetes 集群和 YARN 集群。对于这些节点，Kubernetes和YARN集群可以通过分时复用的方式使用这些资源。

TDM 插件将这些节点标记为“可撤销节点”。在节点的可撤销时间窗口内，TDM插件将尝试将“可抢占任务”分派给“可撤销节点”。在可撤销时间窗口之外，TDM 插件会从“可撤销节点”中逐出“可抢占任务”。

TDM插件提高了Volcano调度过程中节点资源的时分复用能力。

## 它是如何运作的

TDM 插件管理基于时间的资源共享：

1. **可撤销节点**：标记为可撤销的节点，可以在编排系统之间共享
2. **可撤销时间窗口**：定义节点可用于 Kubernetes 工作负载的时间段
3. **Preemptable Tasks**：可撤销时间窗口结束时可以被驱逐的任务

主要功能：

- **PredicateFn**：检查当前时间窗口内是否可以在可撤销节点上调度任务
- **PreemptableFn**：确定是否应根据时间限制驱逐任务

## 设想

### ToB业务

在ToB（Business-to-Business）场景中，云厂商为商户提供基于云的资源，不同商户采用不同的容器编排框架（Kubernetes、YARN等）。 TDM插件提高了普通节点资源的分时效率，进一步提高了资源利用率。

### 混合集群

同时运行 Kubernetes 和 Hadoop/YARN 工作负载的组织可以使用 TDM 在两个系统之间共享物理节点，并通过基于时间的调度确保工作负载不会相互干扰。

### 成本优化

通过启用时分复用，组织可以在不同时间段内跨不同工作负载类型共享节点，从而最大限度地利用其硬件基础设施。

## 配置

### 节点标签

首先，将节点标记为可撤销：

```bash
kubectl label node <node-name> volcano.sh/revocable-node=true
kubectl annotate node <node-name> volcano.sh/revocable-zone="zone-a"
```

### 调度程序配置

启用具有时间窗口配置的 TDM 插件：

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

| 参数 | 描述 | 格式 |
|-----------|-------------|--------|
| `tdm.revocable-zone.<zone-name>` | 可撤销区域的时间窗口 | `<start-cron>:<end-cron>` |

时间窗口使用 cron 表达式指定：
- `0 8 * * *` 表示“每天上午 8:00”
- `0 18 * * *` 表示“每天下午 6:00”

## 例子

### 可撤销节点配置

```bash
# Mark a node as revocable in zone-a
kubectl label node worker-node-1 volcano.sh/revocable-node=true
kubectl annotate node worker-node-1 volcano.sh/revocable-zone=zone-a
```

### 带有 TDM 的调度程序 ConfigMap

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
          # zone-a is available for Kubernetes from 8 AM to 6 PM
          tdm.revocable-zone.zone-a: "0 8 * * *:0 18 * * *"
      - name: nodeorder
```

### 可抢占作业

提交一个可以在可撤销节点上调度的作业：

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

在这个例子中：
- 该作业被标记为可抢占
- 可以在配置的时间窗口内将其安排在可撤销节点上
- 时间窗口结束后将被驱逐