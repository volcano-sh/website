+++
title = "介绍"

date = 2019-01-28
lastmod = 2025-01-09

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
[menu.docs]
  parent = "home"
  weight = 1
+++

## 简介
Volcano是[CNCF](https://www.cncf.io/) 下首个也是唯一的基于Kubernetes的容器批量计算平台，主要用于高性能计算场景。它提供了Kubernetes目前缺
少的一套机制，这些机制通常是机器学习大数据应用、科学计算、特效渲染等多种高性能工作负载所需的。作为一个通用批处理平台，Volcano与几乎所有的主流计算框
架无缝对接，如[Spark](https://spark.apache.org/) 、[TensorFlow](https://tensorflow.google.cn/) 、[PyTorch](https://pytorch.org/) 、
[Flink](https://flink.apache.org/) 、[Argo](https://argoproj.github.io/) 、[MindSpore](https://www.mindspore.cn/) 、
[PaddlePaddle](https://www.paddlepaddle.org.cn/)，[Ray](https://www.ray.io/)等。它还提供了包括异构设备调度，网络拓扑感知调度，多集群调度，在离线混部调度等多种调度能力。Volcano的设计
理念建立在15年来多种系统和平台大规模运行各种高性能工作负载的使用经验之上，并结合来自开源社区的最佳思想和实践。

## 由来
随着各种新兴高性能计算需求的持续增长，Job的调度和管理能力变得必要和复杂。下面罗列了一些共性需求：

* 调度算法的多样性
* 调度性能的高效性
* 无缝对接主流计算框架
* 对异构设备的支持

Volcano正是针对这些需求应运而生的。同时，Volcano继承了Kubernetes接口的设计风格和核心概念。您可以在充分享受Volcano的高效性和便利性的同时不用改
变任何以前使用Kubernetes的习惯。
## 特性

### [统一调度](/zh/docs/unified_scheduling/)
* 支持Kubernetes原生负载调度
* 支持使用VolcanoJob来进行PyTorch、TensorFlow、Spark、Flink、Ray等框架的一体化作业调度
* 将在线微服务和离线批处理作业统一调度，提升集群资源利用率

### 丰富的调度策略
* **Gang Scheduling**：确保作业的所有任务同时启动，适用于分布式训练、大数据等场景
* **Binpack Scheduling**：通过任务紧凑分配优化资源利用率
* **Heterogeneous device scheduling**：高效共享GPU异构资源，支持CUDA和MIG两种模式的GPU调度，支持NPU调度
* **Proportion/Capacity Scheduling**：基于队列配额进行资源的共享/抢占/回收
* **NodeGroup Scheduling**：支持节点分组亲和性调度，实现队列与节点组的绑定关系
* **DRF Scheduling**：支持多维度资源的公平调度
* **SLA Scheduling**：基于服务质量的调度保障
* **Task-topology Scheduling**：支持任务拓扑感知调度，优化通信密集型应用性能
* **NUMA Aware Scheduling**：支持NUMA架构的调度，优化任务在多核处理器上的资源分配，提升内存访问效率和计算性能
* ...

得益于可扩展性的架构设计，Volcano支持用户自定义plugin和action以支持更多调度算法。

### [队列资源管理](/zh/docs/queue_resource_management/)
* 支持多维度资源配额控制(CPU、内存、GPU等)
* 提供多层级队列结构和资源继承
* 支持队列间资源借用、回收与抢占
* 实现多租户资源隔离和优先级控制

### 异构设备的支持
Volcano提供了基于多种架构的计算资源的混合调度能力：

* x86
* ARM
* 鲲鹏
* 昇腾
* GPU

### 网络拓扑感知调度
* 支持基于网络拓扑的感知调度，充分考虑节点间的网络带宽特性。在AI场景中，针对分布式训练任务的通信密集型特点，拓扑感知调度能够有效优化数据传输，显著减少通信开销，从而提升模型训练速度和整体效率。

### 在离线混部
* 支持在线和离线业务混合部署，通过统一调度，动态资源超卖，CPU Burst，资源隔离等能力，提升资源利用率的同时保障在线业务QoS

### 多集群调度
* 支持作业跨集群调度，将VolcanoJob的能力扩展到多集群，实现更大规模的资源池管理

> Volcano多集群调度仓库详见：[volcano-global](https://github.com/volcano-sh/volcano-global)

### 重调度
* 支持动态重调度，优化集群负载分布，提升系统稳定性

> Volcano重调度仓库详见：[descheduler](https://github.com/volcano-sh/descheduler)

### 监控与可观测性
* 完整的日志系统
* 丰富的监控指标
* 提供可视化的Dashboard，便于用户进行图形化界面操作

> Volcano Dashboard详见：[dashboard](https://github.com/volcano-sh/dashboard)
> 
> Volcano指标详见: [metrics](https://github.com/volcano-sh/volcano/blob/master/docs/design/metrics.md)

## 生态
Volcano已经成为业界批量计算场景中的事实标准，并被广泛应用于以下高性能计算框架中：

* [Spark](https://spark.apache.org/)
* [TensorFlow](https://tensorflow.google.cn/)
* [PyTorch](https://pytorch.org/)
* [Flink](https://flink.apache.org/)
* [Argo](https://argoproj.github.io/)
* [Ray](https://www.ray.io/)
* [MindSpore](https://www.mindspore.cn/)
* [PaddlePaddle](https://www.paddlepaddle.org.cn/)
* [OpenMPI](https://www.open-mpi.org/)
* [Horovod](https://horovod.readthedocs.io/)
* [mxnet](https://mxnet.apache.org/)
* [Kubeflow](https://www.kubeflow.org/)
* [Cromwell](https://cromwell.readthedocs.io/)

此外，Volcano已被多个企业和组织广泛应用于AI和大数据领域。它通过强大的资源管理能力、高效的Job管理机制，以及丰富的调度策略（如Gang调度、异构设备调度、拓扑感知调度等），有效满足了分布式训练、数据分析等任务的复杂需求。同时，Volcano在提升调度性能的基础上，兼顾了任务调度的灵活性和可靠性，为企业打造高效的资源利用体系提供了有力支持。

## 未来展望
Volcano将继续通过社区协作和技术创新，扩展其功能边界，成为高性能计算和云原生批量调度的引领者。

