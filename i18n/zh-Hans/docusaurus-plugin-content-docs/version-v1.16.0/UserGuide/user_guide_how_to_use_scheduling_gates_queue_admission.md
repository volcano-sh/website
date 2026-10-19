---
title: "Scheduling Gates Queue Admission 用户指南"
---

## 概述

本文介绍如何启用并使用 `SchedulingGatesQueueAdmission` 特性，避免当 Pod 仅因 Volcano 队列容量受限而等待时，集群自动扩缩容组件（如 [Cluster Autoscaler](https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler) 或 [Karpenter](https://karpenter.sh/)）触发不必要的扩容。

## 问题背景

Volcano 会将 Pod 标记为 `Unschedulable` 以表示任意分配失败，无论原因是集群资源不足（适合扩缩容）还是队列容量限制（无需扩缩容）。集群自动扩缩容器无法区分这两种情况，导致不必要的节点扩容。

详细说明见[设计文档](https://github.com/volcano-sh/volcano/blob/master/docs/design/scheduling-gates-queue-admission.md)。

## 解决方案

本特性使用 Kubernetes [`schedulingGates`](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-scheduling-readiness/) 在队列有容量前暂挂 Pod。处于 gate 状态时，Pod 对自动扩缩容器不可见。仅当队列容量检查通过后才会移除 gate；若之后仍因缺少节点而无法调度，则标记为 `Unschedulable`，自动扩缩容器即可正确响应。

## 前置条件

- Volcano v1.15+，并启用 `SchedulingGatesQueueAdmission` Feature Gate。
- 调度器中已配置 `capacity` 插件（该特性在 capacity 插件中实现，[后续将集成到 `proportion`](https://github.com/volcano-sh/volcano/issues/5271)）。

## 1. 启用 Feature Gate

该特性为 Alpha，默认关闭。需在 **scheduler** 与 **webhook-manager** 上同时启用。

### 使用 Helm

```bash
helm install volcano volcano/volcano --namespace volcano-system --create-namespace \
  --set custom.scheduler_feature_gates="SchedulingGatesQueueAdmission=true" \
  --set custom.admission_feature_gates="SchedulingGatesQueueAdmission=true"
```

### 使用 kubectl apply

在 `volcano-scheduler` 与 `volcano-admission` Deployment 中添加：

```yaml
--feature-gates=SchedulingGatesQueueAdmission=true
```

可选：配置异步 gate 移除 worker 数量（默认 `5`）：

```yaml
--gate-removal-worker-num=10
```

这些 worker 异步处理 gate 移除：每个 worker 处理一个已通过队列容量检查的 Pod 并移除其 scheduling gate，使其进入调度流程。并发 ungate 较多时可适当增大该值以提升吞吐。

## 2. 配置 Capacity 插件

确保调度器配置中已启用 `capacity` 插件。gate 移除与 Pod 分配之间的竞态防护由该插件中的预留资源跟踪实现。

调度器配置示例：

```yaml
actions: "enqueue, allocate, backfill"
tiers:
- plugins:
  - name: priority
  - name: gang
- plugins:
  - name: predicates
  - name: capacity
  - name: nodeorder
```

## 3. Pod 按需启用

该特性按 Pod 启用。**在需要 gate 控制队列准入的 Pod 上添加以下注解即可：**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
  annotations:
    # 启用注解
    scheduling.volcano.sh/queue-allocation-gate: "true"
spec:
  schedulerName: volcano
  containers:
  - name: worker
    image: nginx
    resources:
      requests:
        cpu: "1"
        memory: "1Gi"
```

Pod 创建后流程如下：

1. Volcano webhook 注入 `scheduling.volcano.sh/queue-allocation-gate` scheduling gate。
2. Pod 保持 gated（对自动扩缩容器不可见），直至队列有容量。
3. 队列有容量后，调度器移除 gate。
4. 若可调度到节点，则正常完成调度。
5. 若无匹配节点（例如需要特定节点类型），则标记为 `Unschedulable`，正确触发自动扩缩容。

## 4. 验证特性是否生效

创建已启用注解的 Pod 后，通过 mutation webhook 验证 gate 是否已注入：

```bash
kubectl get pod my-pod -o jsonpath='{.spec.schedulingGates}'
```

等待队列容量时的预期输出：

```json
[{"name":"scheduling.volcano.sh/queue-allocation-gate"}]
```

队列有容量且调度器移除 gate 后，该字段为空：

```bash
kubectl get pod my-pod -o jsonpath='{.spec.schedulingGates}'
# 无输出
```

## 与其他 Scheduling Gate 的交互

若 Pod 还有其他控制器注入的 scheduling gate（*例如* `example.com/my-gate`），Volcano 仅在 Pod **仅剩 Volcano gate** 时才会移除。这样可避免干扰其他 gate 控制器，并避免为仍被外部依赖阻塞的 Pod 预留队列容量。

## 限制

- Pod 的 gate 移除后即预留队列容量，直至调度成功或 Pod 删除。若 Pod 仍不可调度（*例如* 等待自动扩缩容添加节点），会持续占用队列容量，可能阻塞其他 Pod。此外，当前**未实现**预留容量的超时。运维需注意：已 ungate 但仍不可调度的 Pod 可能无限期占用队列容量。
- 该特性**仅在 `capacity` 插件中实现**。使用 `proportion` 管理队列资源的用户仍可能遇到错误的自动扩缩容，因 scheduling gate 尚未与 `proportion` 集成。跟踪 issue：[#5271](https://github.com/volcano-sh/volcano/issues/5271)。

## 相关链接

- [设计文档](https://github.com/volcano-sh/volcano/blob/master/docs/design/scheduling-gates-queue-admission.md)
- [Kubernetes Pod 调度就绪](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-scheduling-readiness/)
