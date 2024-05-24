+++
title = "Introduction"

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

## What is Volcano
Volcano is a cloud native system for high-performance workloads, which has been accepted by [Cloud Native Computing Foundation (CNCF)](https://www.cncf.io/) as its first and only official container batch scheduling project. Volcano supports popular computing frameworks such as [Spark](https://spark.apache.org/), [TensorFlow](https://www.tensorflow.org/), [PyTorch](https://pytorch.org/), [Flink](https://flink.apache.org/), [Argo](https://argoproj.github.io/), [MindSpore](https://www.mindspore.cn/en), and [PaddlePaddle](https://www.paddlepaddle.org.cn/). Volcano also supports scheduling of computing resources on different architecture, such as x86, Arm, and Kunpeng.
 
## Why Volcano
Job scheduling and management become increasingly complex and critical for high-performance batch computing. Common requirements are as follows:

* Support for diverse scheduling algorithms
* More efficient scheduling
* Non-intrusive support for mainstream computing frameworks
* Support for multi-architecture computing

Volcano is designed to cater to these requirements. In addition, Volcano inherits the design of Kubernetes APIs, allowing you to easily run applications that require high-performance computing on Kubernetes.
## Features
### Rich scheduling policies
Volcano supports a variety of scheduling policies:

* Gang scheduling
* Fair-share scheduling
* Queue scheduling
* Preemption scheduling
* Topology-based scheduling
* Reclaim
* Backfill
* Resource reservation

You can also configure plug-ins and actions to use custom scheduling policies.
### Enhanced job management 
You can use enhanced job features of Volcano for high-performance computing:

* Multi-pod jobs
* Improved error handling
* Indexed jobs

### Multi-architecture computing
Volcano can schedule computing resources from multiple architectures:

* x86
* Arm
* Kunpeng
* Ascend
* GPU

### Faster scheduling
Compared with existing queue schedulers, Volcano shortens the average scheduling delay through a series of optimizations.

## Ecosystem
Volcano allows you to use mainstream computing frameworks:

* [Spark](https://spark.apache.org/)
* [TensorFlow](https://www.tensorflow.org/)
* [PyTorch](https://pytorch.org/)
* [Flink](https://flink.apache.org/)
* [Argo](https://argoproj.github.io/)
* [MindSpore](https://www.mindspore.cn/en)
* [PaddlePaddle](https://www.paddlepaddle.org.cn/)
* [Open MPI](https://www.open-mpi.org/)
* [Horovod](https://horovod.readthedocs.io/)
* [MXNet](https://mxnet.apache.org/)
* [Kubeflow](https://www.kubeflow.org/)
* [KubeGene](https://github.com/volcano-sh/kubegene)
* [Cromwell](https://cromwell.readthedocs.io/)

Volcano has been commercially used as the infrastructure scheduling engine by companies and organizations.