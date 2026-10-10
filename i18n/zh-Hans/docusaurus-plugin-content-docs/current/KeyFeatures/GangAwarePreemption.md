---
title: "Gang-Aware 抢占与资源回收"
---

## 概述

Volcano v1.15 为分布式工作负载引入 Gang-aware 抢占与资源回收能力，将驱逐决策从 Pod 粒度提升到 Job/Gang 粒度。该能力适用于必须有一定数量成员同时运行才能继续执行的工作负载，例如分布式训练和 HPC 作业。

原有的 `preempt` 和 `reclaim` action 以单个 Task 为单位选择被驱逐对象。资源紧张时，这种方式可能分别驱逐多个运行中作业的一个 Pod，却仍然无法为待调度作业形成可行放置。多个工作负载受到影响后，抢占方仍可能达不到 `minAvailable`。

Gang-aware 驱逐会同时评估决策的两侧：

- 被驱逐对象按 Job/Gang 分组，调度器可以计算每次驱逐对运行中工作负载造成的影响。
- 抢占方按完整 Gang 评估。只有放置模拟确认待调度 Gang 可以运行后，才提交驱逐操作。

该特性在 v1.15 中为 Alpha。

## 调度流程

![Gang-aware 抢占与资源回收流程](/img/doc/gang-aware-eviction-flow.svg)

<!-- PPT 流程图定稿后替换上面的 SVG。 -->

### 被驱逐对象评估

Volcano 根据候选 Job 的有效可用目标，将 Task 分为两类：

| 类型 | 含义 | 选择顺序 |
|------|------|----------|
| 冗余 Task | 超出可用目标的副本，驱逐后不会立即破坏被抢占 Gang。 | 优先选择。 |
| 关键 Task | 维持被抢占 Gang 可用所必需的副本。 | 冗余 Task 不足时再考虑。 |

调度器在选择对象前，先使用已配置的插件过滤候选集合。对于需要整体驱逐的 Gang，只有完整 Bundle 均通过过滤时才保留；部分 Task 通过过滤的 Whole Bundle 不会成为有效候选。

### 抢占方放置

调度器按顺序逐步加入 Victim Bundle。当当前空闲资源与候选释放资源之和可以覆盖抢占方的总请求时，Volcano 在预期资源视图上执行放置模拟。

如果所有必需的抢占方 Task 都能完成放置，Victim 驱逐和目标节点提名会作为同一个调度决策提交。如果模拟失败，调度器继续加入下一个 Victim Bundle 并重试。完整 Gang 无法放置时不会提交驱逐。

启用网络拓扑感知调度后，Victim 搜索和放置模拟在选定的 HyperNode 范围内执行，避免释放的资源位于无法承载待调度 Gang 的拓扑域。

## Action 配置

Gang-aware 驱逐由两个独立的调度 Action 实现，原有 Action 的行为保持不变。

| Action | 范围 | 排序规则 |
|--------|------|----------|
| `gangPreempt` | 基于优先级的抢占。 | 先选择低优先级 Victim，驱逐效率作为次级排序条件。 |
| `gangReclaim` | 跨队列资源回收。 | 先判断队列公平性、超额使用和可回收性，再执行 Job 级排序。 |

在 `volcano-scheduler-configmap` 中启用 Action：

```yaml
actions: "enqueue, allocate, backfill, gangPreempt, gangReclaim"
tiers:
  - plugins:
      - name: priority
      - name: gang
      - name: drf
      - name: predicates
      - name: nodeorder
      - name: binpack
```

:::warning

不要在同一个 Action 列表中同时配置 `gangPreempt`/`gangReclaim` 和原有的 `preempt`/`reclaim`。两类 Action 使用不同的 Victim 选择流程，不应在同一个调度周期内共同运行。

:::

## 工作负载要求

待调度工作负载需要通过 Volcano Job 或 PodGroup 提供 Gang 语义。Volcano Job 使用 `minAvailable`，PodGroup 使用 `minMember` 定义工作负载运行所需的最少成员数：

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: PodGroup
metadata:
  name: distributed-training
spec:
  minMember: 8
```

调度器还会评估待调度 Gang 的总资源请求和放置约束。仅满足成员数量并不足以完成放置，候选节点还必须满足资源、亲和性、设备和拓扑约束。

使用 `gangReclaim` 时，Victim Queue 还必须符合队列插件定义的可回收条件。队列的 `guarantee` 和 `deserved` 资源继续限制可回收范围。

## 运维注意事项

- 生产环境引入时应按 Alpha 特性处理，并使用具有代表性的 Queue、Priority、PodGroup 和拓扑配置验证 Action 链及 Victim 行为。
- 启用后应监控 Pod 驱逐事件和 Pending PodGroup 状态。Victim 搜索成功不会跳过常规 Predicate 或拓扑检查。
- 该机制减少不必要的扰动，但不保证完全无扰动。当冗余副本不足且策略允许时，关键副本仍可能被选择。
- 只有显式配置新 Action 的集群才会使用 Gang-aware 驱逐；已有配置仍保持 Task 粒度行为。

## 参考资料

- [Volcano v1.15.0 Release Notes](https://github.com/volcano-sh/volcano/releases/tag/v1.15.0)
- [Gang-aware Eviction 设计文档](https://github.com/volcano-sh/volcano/blob/v1.15.0/docs/design/gang-aware-eviction-design.md)
- [Gang-aware Eviction 的 EvictableFn 演进设计](https://github.com/volcano-sh/volcano/blob/v1.15.0/docs/design/evictablefn-evolution-for-gang-eviction.md)
- [Scheduler Action](../Scheduler/Actions.md)
