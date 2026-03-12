---
title: 简介
sidebar_position: 1
---

# 什么是 Volcano
Volcano 是一个用于高性能工作负载的云原生系统，已被 [Cloud Native Computing Foundation (CNCF)](https://www.cncf.io/) 接纳为首个也是目前唯一一个官方容器批量调度项目。Volcano 支持主流的计算框架，如 [Spark](https://spark.apache.org/)、[TensorFlow](https://www.tensorflow.org/)、[PyTorch](https://pytorch.org/)、[Flink](https://flink.apache.org/)、[Argo](https://argoproj.github.io/)、[MindSpore](https://www.mindspore.cn/en)、[PaddlePaddle](https://www.paddlepaddle.org.cn/) 和 [Ray](https://www.ray.io/)。Volcano 还提供多种调度能力，包括异构设备调度、网络拓扑感知调度、多集群调度、在离线业务混部等。

## 为什么选择 Volcano
随着高性能批量计算的 job 调度和管理变得日益复杂和关键，常见的需求如下：

* 支持多样化的调度算法
* 更高效的调度
* 对主流计算框架的无侵入支持
* 支持多架构计算

Volcano 旨在满足这些需求。此外，Volcano 继承了 Kubernetes API 的设计，使您可以轻松地在 Kubernetes 上运行需要高性能计算的应用程序。

## 功能特性
### [统一调度](/zh-Hans/docs/unified_scheduling/)
* 支持原生 Kubernetes 工作负载调度
* 通过 VolcanoJob 为 PyTorch、TensorFlow、Spark、Flink、Ray 等框架提供完整支持
* 统一调度在线微服务和离线批处理作业，提高集群资源利用率

### 丰富的调度策略
* **Gang Scheduling (Gang 调度)**：确保作业的所有任务同时启动，适用于分布式训练和大数据场景
* **Binpack Scheduling (装箱调度)**：通过紧凑的任务分配优化资源利用率
* **Heterogeneous Device Scheduling (异构设备调度)**：高效共享 GPU 资源，支持 GPU 调度的 CUDA 和 MIG 模式，以及 NPU 调度
* **Proportion/Capacity Scheduling (比例/容量调度)**：基于队列配额的资源共享/抢占/回收
* **NodeGroup Scheduling (节点组调度)**：支持节点组亲和性调度，实现队列与节点组之间的绑定
* **DRF Scheduling (DRF 调度)**：支持多维资源的公平调度
* **SLA Scheduling (SLA 调度)**：基于服务质量的调度保证
* **Task-topology Scheduling (任务拓扑调度)**：支持任务拓扑感知调度，为通信密集型应用优化性能
* **NUMA Aware Scheduling (NUMA 感知调度)**：支持 NUMA 架构的调度，优化多核处理器上任务的资源分配，提升内存访问效率和计算性能
* ...

Volcano 支持自定义插件和动作以实现更多调度算法。

### [队列资源管理](/zh-Hans/docs/queue_resource_management/)
* 支持多维资源配额控制（CPU、内存、GPU 等）
* 提供多级队列结构和资源继承
* 支持队列间的资源借用、回收和抢占
* 实现多租户资源隔离和优先级控制

### 多架构计算
Volcano 可以调度来自多种架构的计算资源：

* x86
* Arm
* Kunpeng
* Ascend
* GPU: 支持多种 [GPU 虚拟化](/zh-Hans/docs/gpu_virtualization/) 技术，实现灵活的资源管理
  * **Dynamic MIG Support (动态 MIG 支持)**：支持 NVIDIA 多实例 GPU (MIG) 的动态分区，提供硬件级隔离，将物理 GPU 分割成多个独立实例
  * **vCUDA Virtualization (vCUDA 虚拟化)**：在软件层面将物理 GPU 虚拟化为多个 vGPU 设备，实现资源共享和隔离
  * **Fine-Grained Resource Control (细粒度资源控制)**：为每个 GPU 实例提供专用的内存和计算分配
  * **Multi-Container Sharing (多容器共享)**：支持多个容器安全地共享单个 GPU，最大化利用率
  * **Unified Monitoring (统一监控)**：为所有 GPU 实例提供统一的监控和指标收集

### 网络拓扑感知调度
* 支持网络拓扑感知调度，充分考虑节点间的网络带宽特性。在 AI 场景中，这种网络拓扑感知调度有效地优化了通信密集型分布式训练任务的数据传输，显著降低通信开销，提高模型训练速度和整体效率。

### 在离线业务混部
* 支持在离线业务混部，通过统一调度、动态资源超卖、CPU 爆发和资源隔离，在保证在线业务 QoS 的同时提高资源利用率。

### 多集群调度
* 支持跨集群作业调度，用于更大规模的资源池管理和负载均衡

> 更多关于多集群调度的详情，请参阅：[volcano-global](https://github.com/volcano-sh/volcano-global)

### 重调度
* 支持动态重调度以优化集群负载分布并提高系统稳定性

> 更多关于重调度的详情，请参阅：[descheduler](https://github.com/volcano-sh/descheduler)

### 监控与运维
* 完整的日志系统
* 丰富的监控指标
* 提供仪表板，方便用户进行图形界面操作

> 更多关于仪表板的详情，请参阅：[dashboard](https://github.com/volcano-sh/dashboard)
>
> 更多关于 Volcano 指标的详情，请参阅：[metrics](https://github.com/volcano-sh/volcano/blob/master/docs/design/metrics.md)

## 生态系统
Volcano 已成为批量计算场景中的事实标准，并广泛应用于以下高性能计算框架：

* [Spark](https://spark.apache.org/)
* [TensorFlow](https://www.tensorflow.org/)
* [PyTorch](https://pytorch.org/)
* [Flink](https://flink.apache.org/)
* [Argo](https://argoproj.github.io/)
* [Ray](https://www.ray.io/)
* [MindSpore](https://www.mindspore.cn/)
* [PaddlePaddle](https://www.paddlepaddle.org.cn/)
* [OpenMPI](https://www.open-mpi.org/)
* [Horovod](https://horovod.readthedocs.io/)
* [MXNet](https://mxnet.apache.org/)
* [Kubeflow](https://www.kubeflow.org/)
* [KubeGene](https://github.com/volcano-sh/kubegene)
* [Cromwell](https://cromwell.readthedocs.io/)

此外，Volcano 已被 AI 和大数据领域的众多企业和组织广泛采用。凭借其强大的资源管理能力、高效的作业管理机制以及丰富的调度策略（如 Gang 调度、异构设备调度和拓扑感知调度），它有效地满足了分布式训练和数据分析任务的复杂需求。同时，Volcano 在增强调度性能的同时，保证了任务调度的灵活性和可靠性，为企业构建高效的资源利用体系提供了强有力的支持。

## 未来展望
Volcano 将继续通过社区合作和技术创新拓展其功能边界，成为高性能计算和云原生批量调度的领导者。
