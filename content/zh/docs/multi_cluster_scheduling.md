+++
title = "多集群AI作业调度"

date = 2025-01-21
lastmod = 2025-01-21

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
toc_depth = 5
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
[menu.docs]
  parent = "features"
  weight = 2
+++

## 背景

随着企业业务的快速增长，单个 Kubernetes 集群通常无法满足大规模 AI 训练和推理任务的需求。用户通常需要管理多个 Kubernetes 集群，以实现统一的AI工作负载分发、部署和管理。
目前，已经有许多用户在多个集群中使用 Volcano，并使用 [Karmada](https://github.com/karmada-io/karmada) 进行管理。为了更好地支持多集群环境中的 AI 任务，支持全局队列管理、任务优先级和公平调度等功能，Volcano 社区孵化了[Volcano Global](https://github.com/volcano-sh/volcano-global)子项目。
该项目将 Volcano 在单个集群中的强大调度能力扩展到多集群场景，为多集群 AI 任务提供统一的调度平台，支持跨集群任务分发、资源管理和优先级控制。

## 功能

Volcano Global在Karmada的基础上，提供了以下增强功能，满足多集群AI作业调度的复杂需求：

1. **支持Volcano Job的跨集群调度**
   用户可以在多集群环境中部署和调度Volcano Job，充分利用多个集群的资源，提升任务执行效率。
2. **队列优先级调度**
   支持跨集群的队列优先级管理，确保高优先级队列的任务能够优先获得资源。
3. **作业优先级调度与排队**
   在多集群环境中，支持作业级别的优先级调度和排队机制，确保关键任务能够及时执行。
4. **多租户公平调度**
   提供跨集群的多租户公平调度能力，确保不同租户之间的资源分配公平合理，避免资源争用。

## 架构

<div style="text-align: center;"> {{<figure library="1" src="./multi-cluster/volcano_global_design.svg">}}
</div>

Volcano global主要包含两个组件：

- **Volcano Webhook:** 监听ResourceBinding资源的创建事件，将ResourceBinding设置为暂停状态。
- **Volcano Controller:** 监听处于暂停状态的ResourceBinding，根据Job所在队列的优先级、Job本身的优先级，对Job进行优先级和公平调度，并运行资源准入机制，决定是否可以调度Job，准入成功后将ResourceBinding解除暂停状态，由Karmada进行资源分发。

## 使用指导

请参考: [Volcano global deploy](https://github.com/volcano-sh/volcano-global/blob/main/docs/deploy/README.md)。
