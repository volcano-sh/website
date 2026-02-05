++
title = "如何配置调度器"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_configure_scheduler/"
[menu.docs]
  parent = "user-guide"
++

## 要求
* 在阅读本指南之前，请先了解 `action`、`plugin`、`session`、`tier`、`volcano job`、`podgroup`、`queue` 等基本概念。如果这些概念还比较陌生，请参考 [Volcano 文档](https://volcano.sh/en/docs/) 获取更多背景说明。
* 在阅读本指南之前，请确保已经对 Volcano 的整体调度流程有一个大致理解。

## 背景
为了在不同业务场景下调整调度流程和调度算法，Volcano 允许用户为调度器配置一系列 `actions` 和 `plugins`。调度流水线由若干 `action` 顺序组成，各种调度算法通过插件（plugin）实现，并在调度周期中以 session 回调函数的形式被 `action` 调用。在配置项 `volcano-scheduler-configmap` 中，可以看到插件默认被划分为两个 tier；这在第一次接触时可能会让人困惑，因此本指南将介绍如何配置 Volcano 调度器。

## 关键点
* 所有调度相关配置都集中在命名空间 `volcano-system` 下的 ConfigMap `volcano-scheduler-configmap` 中。
* 配置主要由两部分组成：`actions` 和 `tiers`。
* `actions` 定义了调度流水线中各个阶段的执行顺序，在每个 session 中会按顺序依次执行。
* `tiers` 用来对插件进行分组。每次打开一个 session 时，会根据 tier 加载并注册对应插件中的回调函数，在执行各个 action 时按 tier 顺序调用。
* 在某些场景下，不同插件可能会注册同名的函数，此时具体如何组合这些函数的行为取决于业务需求，这也是需要 `tier` 概念的原因。

## Actions
* `Action` 实现调度的主逻辑。
* Volcano 支持用户自定义 action。
* 截至 2022 年 4 月，Volcano 内置了 7 个 action，如下表所示。

| ID  | 名称      | 必须 | 描述 |
|-----|-----------|------|------|
| 1   | enqueue   | Y    | 判断当前集群空闲资源是否能够满足某个工作负载的基础需求；如果可以，则将其 PodGroup 状态置为 `inqueue`，否则保持为 `pending`。注意参数 `overcommit-factor` 默认值为 `1.2`。 |
| 2   | allocate  | Y    | 为 PodGroup 状态为 `inqueue` 的工作负载尝试分配资源。 |
| 3   | backfill  | N    | 为 `BestEffort` 类型 Pod 所在的工作负载尝试做“回填”式资源分配。 |
| 4   | preempt   | N    | 识别高优先级工作负载，尝试驱逐低优先级 Pod，将资源让给高优先级工作负载。 |
| 5   | reclaim   | N    | 找出资源被其他队列借用的队列，并尝试收回其“应得资源”。 |
| 6   | elect     | N    | 选择满足特定条件的目标工作负载，配合资源预留功能使用，后续版本中将被废弃。 |
| 7   | reserve   | N    | 选择一组节点并为目标工作负载预留资源，同样用于资源预留场景，后续版本中将被废弃。 |

## Tiers 与插件
* `Plugin` 通过注册一系列回调函数来实现调度算法的具体细节，这些函数会在对应的 `action` 阶段被调用。
* 一般来说，一个插件至少包含三个核心函数：`Name`、`OnSessionOpen`、`OnSessionClose`。其中：
  * `Name` 返回插件名称；
  * `OnSessionOpen` 在 session 启动时执行，用于注册调度相关的回调函数；
  * `OnSessionClose` 在 session 结束时执行，用于清理资源。
* 部分插件提供参数，用于适配不同业务场景。
* 不同插件可能会注册相同的回调函数名，但实现逻辑不同；配置时需要确保它们协同工作不会产生冲突。
* 截至 2022 年 4 月，Volcano 提供了 15 个内置插件，简要如下（与英文文档保持一致）：

| ID  | 名称           | 参数（节选） | 注册的函数（节选） | 描述（简要） |
|-----|----------------|-------------|--------------------|-------------|
| 1   | binpack        | `binpack.weight` 等 | `nodeOrderFn` | 倾向将 Pod 调度到资源利用率更高的节点，减少碎片。 |
| 2   | conformance    | /           | `preemptableFn`、`reclaimableFn` | 跳过关键 Pod，避免对其进行驱逐。 |
| 3   | drf            | /           | `queueOrderFn`、`jobOrderFn` 等 | 按队列公平分配资源（DRF）。 |
| 4   | extender       | 多个 `extender.*` 参数 | `predicateFn`、`batchNodeOrderFn` 等 | 通过 HTTP 扩展外部调度逻辑。 |
| 5   | gang           | /           | `jobValidFn`、`jobPipelineFn` 等 | 按 Gang 语义考虑作业的最小资源/成员数需求。 |
| 6   | nodeorder      | 多个权重参数 | `nodeOrderFn`、`batchNodeOrderFn` | 自定义节点排序策略。 |
| 7   | numaaware      | `weight`    | `predicateFn`、`batchNodeOrderFn` | 将 CPU NUMA 拓扑作为调度的重要因子。 |
| 8   | overcommit     | `overcommit-factor` | `jobEnqueueableFn` 等 | 以一定比例“超卖”集群可用资源。 |
| 9   | predicate      | 多个 `predicate.*` 参数 | `predicateFn` | 自定义节点过滤逻辑。 |
| 10  | priority       | /           | `taskOrderFn`、`jobOrderFn` 等 | 按优先级对工作负载排序。 |
| 11  | proportion     | /           | `queueOrderFn`、`overusedFn` 等 | 按队列配置按比例划分集群总资源。 |
| 12  | reservation    | /           | `targetJobFn`、`reservedNodesFn` | 为目标作业预留部分节点资源。 |
| 13  | sla            | `sla-waiting-time` | `jobOrderFn` 等 | 按 SLA 相关配置对作业进行排序和准入控制。 |
| 14  | task-topology  | /           | `taskOrderFn`、`nodeOrderFn` | 按任务拓扑将不同角色的 Pod 绑定到合适节点。 |
| 15  | tdm            | 多个 `tdm.*` 参数 | `predicateFn`、`victimTasksFn` 等 | 支持部分节点在不同时段交由 K8s 与其他集群“分时”管理。 |

## 示例
```yaml
# 调度器默认配置示例
actions: "enqueue, allocate, backfill"
tiers:
- plugins:
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

## 说明
* 按上述默认配置，在一个 session 中调度流程会按如下流水线周期性运行（默认周期为 `1s`）：

```mermaid
graph LR
    1(Start) --> 2(OpenSession) --> 3(enqueue) --> 4(allocate) --> 5(backfill) --> 6(CloseSession) --> 7(End)
```

* 在执行 `OpenSession` 时，会注册所有已配置插件中的回调函数；在执行各个 `action` 时再调用这些函数。例如，在 `enqueue` 阶段会调用 `overcommit` 插件中注册的 `jobEnqueueableFn` 来判断当前空闲资源是否满足某个工作负载的最小需求。
* 当 `overcommit` 与 `proportion` 插件同时启用时，它们都注册了 `jobEnqueueableFn`。在 `JobEnqueueable` 的具体实现中，会按 tier 和插件顺序依次调用这些函数；一旦某个 `jobEnqueueableFn` 返回值小于 0，就会立刻终止后续插件的同名函数调用并返回 `false`。例如，如果 `overcommit` 中的 `jobEnqueueableFn` 返回值小于 0，则不会再调用 `proportion` 中的对应函数。

## 常见问题（FAQ）
* **如何划分插件的 tier？需要配置多少个 tier？**  
  在大部分场景中，用户无需过度关注插件应该如何划分到不同 tier，将所有插件放在同一个 tier 通常也是可行的。只有当场景与“驱逐（eviction）”相关时，才需要更细致地考虑 tier 划分。例如，当启用 `reclaim` action 时，调度器会尝试选择一批受害者 Pod；为了尽量减少对业务的影响，可以将“驱逐代价较小”的插件放在第一层 tier，把其他涉及驱逐的插件放到第二层 tier。如果第一层已经能找到足够的受害者，就不会再调用第二层中的相关函数。 

