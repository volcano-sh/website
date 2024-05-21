+++
title = "介绍"

date = 2024-05-21
lastmod = 2024-05-21

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
[menu.v1-9-0]
  parent = "home"
  weight = 1
+++

## 简介
Volcano是[CNCF](https://www.cncf.io/) 下首个也是唯一的基于Kubernetes的容器批量计算平台，主要用于高性能计算场景。它提供了Kubernetes目前缺
少的一套机制，这些机制通常是机器学习大数据应用、科学计算、特效渲染等多种高性能工作负载所需的。作为一个通用批处理平台，Volcano与几乎所有的主流计算框
架无缝对接，如[Spark](https://spark.apache.org/) 、[TensorFlow](https://tensorflow.google.cn/) 、[PyTorch](https://pytorch.org/) 、
[Flink](https://flink.apache.org/) 、[Argo](https://argoproj.github.io/) 、[MindSpore](https://www.mindspore.cn/) 、
[PaddlePaddle](https://www.paddlepaddle.org.cn/) 等。它还提供了包括基于各种主流架构的CPU、GPU在内的异构设备混合调度能力。Volcano的设计
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
### 丰富的调度策略
Volcano支持各种调度策略，包括：

* Gang-scheduling
* Fair-share scheduling
* Queue scheduling
* Preemption scheduling
* Topology-based scheduling
* Reclaims
* Backfill
* Resource Reservation

得益于可扩展性的架构设计，Volcano支持用户自定义plugin和action以支持更多调度算法。

### 增强型的Job管理能力
Volcano提供了增强型的Job管理能力以适配高性能计算场景。这些特性罗列如下：

* 多pod类型job
* 增强型的异常处理
* 可索引Job

### 异构设备的支持
Volcano提供了基于多种架构的计算资源的混合调度能力：

* x86
* ARM
* 鲲鹏
* 昇腾
* GPU

### 性能优化
与传统的队列调度器相比，Volcano通过一系列的优化手段有效降低调度的平均时延等。

## 生态
Volcano已经支持几乎所有的主流计算框架：

* [Spark](https://spark.apache.org/)
* [TensorFlow](https://tensorflow.google.cn/)
* [PyTorch](https://pytorch.org/)
* [Flink](https://flink.apache.org/)
* [Argo](https://argoproj.github.io/)
* [MindSpore](https://www.mindspore.cn/)
* [PaddlePaddle](https://www.paddlepaddle.org.cn/)
* [OpenMPI](https://www.open-mpi.org/)
* [Horovod](https://horovod.readthedocs.io/)
* [mxnet](https://mxnet.apache.org/)
* [Kubeflow](https://www.kubeflow.org/)
* [KubeGene](https://github.com/volcano-sh/kubegene)
* [Cromwell](https://cromwell.readthedocs.io/)

另外，Volcano已经被作为基础设施调度引擎被多个公司和组织采纳商用。