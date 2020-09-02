+++
title = "Introduction"

date = 2019-01-28
lastmod = 2020-08-27

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
[menu.docs]
  parent = "home"
  weight = 1
+++

## What is Volcano
Volcano is a Kubernetes native system for high performance workload, which has been accepted by [Cloud Native Computing Foundation (CNCF)](https://www.cncf.io/) 
as the first and unique container batch calculation project. It provides a suite of mechanisms currently missing from 
Kubernetes that are commonly required by many categories of high performance workload such as machine learning / big data 
application / scientific computing / special effects rendering, etc. As a general batch computing platform, Volcano integrates 
with almost all mainstream computing frameworks such as [Spark](http://spark.apache.org/) / [TensorFlow](https://tensorflow.google.cn/) / 
[PyTorch](https://pytorch.org/) / [Flink](https://flink.apache.org/) / [Argo](https://argoproj.github.io/) / [MindSpore](https://www.mindspore.cn/) / 
[PaddlePaddle](https://www.paddlepaddle.org.cn/), etc. It can also provide powerful hybrid scheduling capabilities for 
heterogeneous devices include CPU / GPU of various mainstream architectures. Volcano builds upon a decade and a half of 
experience running a wide variety of high performance workloads at scale using several systems and platforms, combined 
with best-of-breed ideas and practices from the open source community.
 
## Why is Volcano
Since the growing requirement of high performance workload from lots of new scenes, job scheduling and management tends 
to be necessary and complex. Common requirements are listed as follows:

* diversity of scheduling algorithm
* more efficient scheduling performance
* no intrusive support for mainstream computing frameworks
* support for heterogeneous devices

Volcano is designed according to these demands. Besides, Volcano inherits the interface style and design concept of 
kubernetes. So you can enjoy the efficiency and convenience of Volcano without changing any habits of using Kubernetes.
## Feature
### Rich scheduling strategy
Volcano supports various scheduling strategy including:

* Co-scheduling
* Fair-share scheduling
* Queue scheduling
* Preemption scheduling
* Topology-based scheduling
* Reclaims
* Backfill
* Resource Reservation

Benefit from extensible framework, Volcano allows users to implement custom plugins and actions to support more scheduling
algorithms.
### Enhanced job management 
Volcano provides enhanced job type to adapt to high performance computing scenarios. The features are as follows:

* Multi-pod job
* Improved error handling
* Indexed job

### Support for heterogeneous devices and architectures
Volcano can provide hybrid scheduling capability of computing resources based on multiple architectures:

* x86
* ARM
* Kunpeng
* Ascends
* GPU

### Performance optimization
Comparing traditional queue scheduler, Volcano improves the average scheduling delay by a series of optimization measures.

## Ecology
Volcano has already support almost all mainstream computing frameworks:

* [Spark](http://spark.apache.org/)
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
* [KubeGene](https://kubegene.io/)
* [Cromwell](https://cromwell.readthedocs.io/)

In addition, Volcano has been used as infrastructure base by several companies and organizations.