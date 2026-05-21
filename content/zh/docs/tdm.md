+++
title = "TDM"

date = 2021-05-13
lastmod = 2025-11-11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "TDM"
[menu.docs]
  parent = "plugins"
  weight = 13
+++

## 简介

Tdm的全称是**Time Division Multiplexing**（时分复用）。在一些场景中，一些节点既属于Kubernetes集群也属于Yarn集群。对于这些节点，Kubernetes和YARN集群可以通过时分复用来使用这些资源。

Tdm plugin需要管理员为这些节点标记为`revocable node`。Tdm plugin会在该类节点可被撤销的时间段内尝试把`preemptable task`调度给`revocable node`，并在该时间段之外清除`revocable node`上的`preemptable task`。

Tdm plugin提高了volcano在调度过程中节点资源的分时复用能力。

## 工作原理

TDM插件管理基于时间的资源共享：

1. **可撤销节点**: 标记为可撤销的节点，可以在编排系统之间共享
2. **可撤销时间窗口**: 定义节点可用于Kubernetes工作负载的时间段
3. **可抢占任务**: 当可撤销时间窗口结束时可以被驱逐的任务

关键功能：

- **PredicateFn**: 检查在当前时间窗口期间任务是否可以被调度到可撤销节点
- **PreemptableFn**: 根据时间约束确定任务是否应该被驱逐

## 场景

### ToB业务

适用于ToB业务中，云厂商为商家提供云化资源，不同的商家采取不同的容器编排框架(Kubernetes/Yarn等)，Tdm plugin提高公共节点资源的分时使用效率，进一步提升资源的利用率。

### 混合集群

同时运行Kubernetes和Hadoop/YARN工作负载的组织可以使用TDM在两个系统之间共享物理节点，基于时间的调度确保工作负载不会相互干扰。

### 成本优化

通过启用时分复用，组织可以通过在不同时间段在不同工作负载类型之间共享节点来最大化其硬件基础设施的利用率。

## 配置

### 节点标签

首先，将节点标记为可撤销：

```bash
kubectl label node <node-name> volcano.sh/revocable-node=true
kubectl annotate node <node-name> volcano.sh/revocable-zone="zone-a"
```

### 调度器配置

使用时间窗口配置启用TDM插件：

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
|------|------|------|
| `tdm.revocable-zone.<zone-name>` | 可撤销区域的时间窗口 | `<start-cron>:<end-cron>` |

时间窗口使用cron表达式指定：
- `0 8 * * *` 表示"每天上午8:00"
- `0 18 * * *` 表示"每天下午6:00"

## 示例

### 可撤销节点配置

```bash
# 将节点标记为zone-a中的可撤销节点
kubectl label node worker-node-1 volcano.sh/revocable-node=true
kubectl annotate node worker-node-1 volcano.sh/revocable-zone=zone-a
```

### 带有TDM的调度器ConfigMap

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
          # zone-a从上午8点到下午6点可用于Kubernetes
          tdm.revocable-zone.zone-a: "0 8 * * *:0 18 * * *"
      - name: nodeorder
```

### 可抢占作业

提交可以在可撤销节点上调度的作业：

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
- 它可以在配置的时间窗口期间被调度到可撤销节点
- 当时间窗口结束时将被驱逐
