+++
title = "Plugins"

date = 2021-05-13
lastmod = 2025-11-11

draft = false
toc = true
type = "docs"

linktitle = "Plugins"
[menu.docs]
  name = "Plugins"
  parent = "scheduler"
  weight = 3
  identifier = "plugins"
+++

## 概述

插件是Volcano调度器的核心组件，提供特定的调度算法和策略。它们与[Actions](/zh/docs/actions/)配合工作来实现调度逻辑。Actions定义每个调度步骤应该做什么，而插件提供具体的算法来实现。

## 插件工作原理

插件在调度器中注册，并在Actions执行期间被调用。每个插件可以实现以下一个或多个功能：

- **JobOrderFn**: 确定调度队列中作业的顺序
- **TaskOrderFn**: 确定作业中任务的顺序
- **PredicateFn**: 过滤无法容纳任务的节点
- **NodeOrderFn**: 为节点评分以找到最适合任务的节点
- **PreemptableFn**: 识别可以被抢占的任务
- **ReclaimableFn**: 识别可以被回收的任务
- **JobReadyFn**: 检查作业是否准备好被调度
- **JobPipelinedFn**: 检查作业是否可以进行流水线处理

## 可用插件

Volcano提供以下插件：

| 插件 | 描述 |
|------|------|
| [Gang](/zh/docs/gang/) | 确保作业的所有任务一起调度（全有或全无） |
| [Binpack](/zh/docs/binpack/) | 将任务打包到节点上以最大化资源利用率 |
| [Priority](/zh/docs/priority/) | 根据优先级对作业和任务进行排序 |
| [DRF](/zh/docs/drf/) | 主导资源公平性，实现公平资源分配 |
| [Proportion](/zh/docs/proportion/) | 基于队列的资源分配，按比例共享 |
| [Task-topology](/zh/docs/task-topology/) | 考虑作业内任务的亲和性和反亲和性 |
| [Predicates](/zh/docs/predicates/) | 基于预选条件（包括GPU需求）过滤节点 |
| [Nodeorder](/zh/docs/nodeorder/) | 使用多个维度为节点评分 |
| [SLA](/zh/docs/sla/) | 作业的服务级别协议约束 |
| [TDM](/zh/docs/tdm/) | 共享节点资源的时分复用 |
| [Numa-aware](/zh/docs/numa-aware/) | CPU密集型工作负载的NUMA拓扑感知调度 |

## 插件配置

插件在Volcano调度器的ConfigMap中配置。以下是一个示例配置：

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
      - name: conformance
    - plugins:
      - name: drf
      - name: predicates
      - name: proportion
      - name: nodeorder
      - name: binpack
```

插件被组织成层级（tiers），较高层级（首先列出）的插件会在较低层级的插件之前被评估。这允许您创建调度策略的层次结构。

## 自定义插件

Volcano的插件架构是可扩展的。您可以通过遵循插件接口并将其注册到调度器来实现自定义插件。有关开发自定义插件的更多信息，请参阅[Volcano贡献指南](/zh/docs/contribution/)。
