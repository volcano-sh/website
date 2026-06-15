---
title: ResourceQuota
---

## 介绍

在多租户集群中，管理员通常使用 Kubernetes `ResourceQuota` 来限制每个命名空间的总资源消耗。但是，默认情况下，即使命名空间的“ResourceQuota”不足，调度程序也可能会不断尝试排队和调度 pod 组，从而导致挂起的作业和调度程序开销。

**ResourceQuota 插件** 通过确保只有命名空间中有足够的资源容量来满足 PodGroup 所需的最小资源配额时才允许 PodGroup 入队，从而解决了这个问题。

## 机制

Volcano 使用 `AddJobEnqueueableFn` 函数实现 ResourceQuota 插件。

1. **命名空间容量缓存**：该插件维护一个“RQStatus”映射来缓存每个命名空间的所有资源配额。
2. **评估**：它计算“minQuotas”——定义运行 pod 组所需的最小资源配额。
3. **入队准入**：在评估待处理的 PodGroup 时，如果命名空间的 Kubernetes `ResourceQuota` 有足够的可用容量，则该插件*仅*允许它们入队。它还考虑当前调度轮次中已允许的 PodGroup，以防止可能超出命名空间配额的竞争条件。

## 配置

要启用 ResourceQuota 插件，请将其添加到“volcano-scheduler-configmap”中。

```yaml
actions: "enqueue, allocate, backfill"
tiers:
  - plugins:
      - name: priority
      - name: gang
      - name: conformance
      - name: resourcequota  # Enable the ResourceQuota plugin
  - plugins:
      - name: overcommit
      - name: drf
      - name: predicates
      - name: proportion
      - name: nodeorder
      - name: binpack
```

启用后，Volcano 将尊重 Kubernetes 原生“ResourceQuota”配置，并防止作业在无法满足其命名空间配额的情况下排队进入调度管道。