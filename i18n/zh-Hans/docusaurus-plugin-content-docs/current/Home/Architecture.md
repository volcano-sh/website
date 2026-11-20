---
title: "架构"
sidebar_position: 2
---

## 架构概览

Volcano 为 Kubernetes 集群提供统一调度和资源管理，支持 AI 训练、推理、数据处理和 Agent 等场景，并已对接多种云原生框架和 Operator。从单个 Pod 到需要多个 Pod 协同运行的分布式应用，都可以使用 Volcano 调度。通过丰富的调度插件，以及队列管理、抢占和资源回收机制，Volcano 既能满足 Gang 调度、网络拓扑感知等需求，也能协调不同任务之间的资源分配。

[![Volcano 支持的工作负载、调度能力和生态集成](/img/doc/volcano-overview.svg)](/img/doc/volcano-overview.svg)

## 组件说明

[![Volcano 控制器、调度器、准入服务和工作节点通过 Kubernetes API Server 协作](/img/doc/volcano-components.svg)](/img/doc/volcano-components.svg)

### Volcano Scheduler

Volcano Scheduler 主要负责批量作业调度，通过 PodGroup 描述一组相关 Pod 的调度要求。它采用插件化架构，支持 Gang 调度、网络拓扑感知调度、队列内抢占、跨队列资源回收等多种策略。用户可以根据任务特点组合插件，也可以扩展自己的调度策略。

详见[调度器概述](../Scheduler/Overview.md)和[配置指南](../UserGuide/user_guide_how_to_configure_scheduler.md)。

### Agent Scheduler

Agent Scheduler 面向对 Pod 调度延迟敏感的任务，例如频繁创建、运行时间较短的 Agent 任务。多个 Worker 并行选择节点，由 Binder 检查冲突并完成 Pod 绑定。Pod 通过 `spec.schedulerName` 指定使用该调度器。

Agent Scheduler 可以与 Volcano Scheduler 在同一集群中运行，通过 NodeShard 协调各自使用的节点。详见 [Agent Scheduler 设计](https://github.com/volcano-sh/volcano/blob/master/docs/design/agent-scheduler.md)。

### Volcano Controllers

Volcano Controllers 负责管理作业、工作流、PodGroup 和队列。其中，Job Controller 为 VolcanoJob 创建 Pod 和 PodGroup，并处理任务完成、失败等事件。其他控制器分别负责定时作业、工作流、队列状态，以及混部配置和资源清理等工作。HyperNode Controller 和 Sharding Controller 则为调度器维护网络拓扑和节点分配信息。

外部 Operator 也可以自行管理工作负载，通过 PodGroup 接入 Volcano 调度。

### Admission

Admission Webhook 负责校验资源配置、填充默认值。用户或控制器创建、更新资源时，Kubernetes API Server 会调用相应的 Webhook，在控制器和调度器处理之前拦截不合法的作业或队列配置。

### HyperNode Controller

HyperNode Controller 从节点标签或外部拓扑服务获取网络拓扑信息，并据此维护 HyperNode 树。每个 HyperNode 表示一个拓扑域，例如连接到同一交换机的一组节点。调度器根据这棵树，为任务选择满足网络要求的节点。

该控制器默认与其他 Volcano Controllers 一起运行，也可以独立部署。详见[网络拓扑感知调度](../KeyFeatures/NetworkTopologyAware.md)和 [HyperNode 自动发现](../UserGuide/user_guide_how_to_use_hypernode_auto_discovery.md)。

### Sharding Controller

Sharding Controller 通过 NodeShard 动态调整各个调度器使用的节点范围。分片策略可以根据资源分配率选择节点、优先使用已标记的预热节点，并限制分片大小。这里的资源分配率根据 Pod 的资源请求和节点容量计算。

调度器内部的 Coordinator 监听 NodeShard 变化，在调度周期之间协调节点交接。节点范围的调整只影响后续调度，不会迁移已经运行的 Pod。

详见[分片设计](https://github.com/volcano-sh/volcano/blob/master/docs/design/sharding_controller.md)和[调度器协同机制](https://github.com/volcano-sh/volcano/blob/master/docs/design/agent-scheduler.md#coordinate)。

### Volcano Agent

Volcano Agent 以 DaemonSet 部署在工作节点上，负责混部和资源超卖。在线服务负载较低时，它让离线任务利用空闲资源。在线服务负载突增时，则通过压制离线任务的资源使用、必要时驱逐离线 Pod，为在线服务腾出资源。

详见[云原生混部](../KeyFeatures/cloudNativeColocation.md)。

### vcctl

[vcctl](../CLI/Commandline.md) 是管理 Volcano 作业和队列的命令行工具，与 `kubectl`、工作负载 Operator 一样，通过 Kubernetes API 操作 Volcano 资源。
