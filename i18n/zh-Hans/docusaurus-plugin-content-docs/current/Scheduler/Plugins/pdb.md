---
title: PDB
---

## 介绍

当用户在 Volcano 上部署高可用作业或应用程序时，他们通常需要限制可以同时驱逐或销毁的 pod 副本数量，以避免停机。此约束通过 Kubernetes **PodDisruptionBudget (PDB)** 资源进行管理。

**PDB 插件** 确保 Volcano 在调度过程中尊重用户定义的 PDB 约束，特别是在“回收”、“抢占”和“洗牌”等驱逐操作期间。

## 先决条件

- 您的 Kubernetes 版本必须是 1.21 或更高版本。
- 您必须为您的工作负载创建有效的“PodDisruptionBudget”资源。

## 机制

PDB 插件在“reclaim”、“preempt”和“shuffle”操作下注册了多个函数（“ReclaimableFn”、“PreemptableFn”和“VictimTasksFn”）。它使用“v1.PodDisruptionBudgetLister”维护 PDB 缓存。

在驱逐场景中，插件会过滤掉其驱逐将违反配置的 PDB 约束的任务。它计算“DisruptedPods”（已处理驱逐但尚未被 PDB 控制器观察到的 Pod）并确保剩余的可用副本满足预算。

## 配置

要启用 PDB 插件，请更新“volcano-scheduler-configmap”以在配置层中包含“pdb”插件。

```yaml
actions: "reclaim, preempt, shuffle"
tiers:
- plugins:
  - name: pdb    # Enable the PDB plugin
  - name: priority
  - name: gang
  - name: conformance
- plugins:
  - name: overcommit
  - name: drf
  - name: predicates
  - name: proportion
  - name: nodeorder
  - name: binpack
```

*注意：当调度程序工作流程中执行“reclaim”、“preempt”或“shuffle”等操作时，将主动调用 PDB 插件。*