+++
title = "Introduction"

date = 2019-01-28
lastmod = 2020-08-27

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
[menu.v1-11-0]
  parent = "home"
  weight = 1
+++

## What is Volcano
Volcano is a cloud native system for high-performance workloads, which has been accepted by [Cloud Native Computing Foundation 
(CNCF)](https://www.cncf.io/) as its first and only official container batch scheduling project. Volcano supports popular computing 
frameworks such as [Spark](https://spark.apache.org/), [TensorFlow](https://www.tensorflow.org/), [PyTorch](https://pytorch.org/), 
[Flink](https://flink.apache.org/), [Argo](https://argoproj.github.io/), [MindSpore](https://www.mindspore.cn/en), 
[PaddlePaddle](https://www.paddlepaddle.org.cn/) and [Ray](https://www.ray.io/). Volcano also provides various scheduling capabilities including heterogeneous device scheduling, network topology-aware scheduling, multi-cluster scheduling, online-offline workloads colocation and so on.

## Why Volcano
Job scheduling and management become increasingly complex and critical for high-performance batch computing. Common requirements are as follows:

* Support for diverse scheduling algorithms
* More efficient scheduling
* Non-intrusive support for mainstream computing frameworks
* Support for multi-architecture computing

Volcano is designed to cater to these requirements. In addition, Volcano inherits the design of Kubernetes APIs, allowing you to easily run applications that require high-performance computing on Kubernetes.
## Features
### [Unified Scheduling](/en/docs/unified_scheduling/)
* Support native Kubernetes workload scheduling
* Provide complete support for frameworks like PyTorch, TensorFlow, Spark, Flink, Ray through VolcanoJob
* Unified scheduling for both online microservices and offline batch jobs to improve cluster resource utilization

### Rich Scheduling Policies
* **Gang Scheduling**: Ensure all tasks of a job start simultaneously, suitable for distributed training and big data scenarios
* **Binpack Scheduling**: Optimize resource utilization through compact task allocation
* **Heterogeneous Device Scheduling**: Efficiently share GPU resources, support both CUDA and MIG modes for GPU scheduling, and NPU scheduling
* **Proportion/Capacity Scheduling**: Resource sharing/preemption/reclaim based on queue quotas
* **NodeGroup Scheduling**: Support node group affinity scheduling, implementing binding between queues and node groups
* **DRF Scheduling**: Support fair scheduling of multi-dimensional resources
* **SLA Scheduling**: Scheduling guarantee based on service quality
* **Task-topology Scheduling**: Support task topology-aware scheduling, optimizing performance for communication-intensive applications
* **NUMA Aware Scheduling**: Supports scheduling for NUMA architecture, optimizing resource allocation for tasks on multi-core processors, enhancing memory access efficiency and computational performance.
* ...

Volcano supports custom plugins and actions to implement more scheduling algorithms.

### [Queue Resource Management](/en/docs/queue_resource_management/)
* Support multi-dimensional resource quota control (CPU, Memory, GPU, etc.)
* Provide multi-level queue structure and resource inheritance
* Support resource borrowing, reclaiming and preemption between queues
* Implement multi-tenant resource isolation and priority control

### Multi-architecture computing
Volcano can schedule computing resources from multiple architectures:

* x86
* Arm
* Kunpeng
* Ascend
* GPU

### Network Topology-aware Scheduling
* Supports network topology-aware scheduling, fully considering the network bandwidth characteristics between nodes. In AI scenarios, this network topology-aware scheduling effectively optimizes data transmission for communication-intensive distributed training tasks, significantly reducing communication overhead and improving model training speed and overall efficiency.

### Online and Offline Workloads Colocation
* Supports online and offline workloads colocation, enhancing resource utilization while ensuring online worloads QoS through unified scheduling, dynamic resource overcommitment, CPU burst, and resource isolation.

### Multi-cluster Scheduling
* Support cross-cluster job scheduling for larger-scale resource pool management and load balancing

> For more details about multi-cluster scheduling, see: [volcano-global](https://github.com/volcano-sh/volcano-global)

### Descheduling
* Support dynamic descheduling to optimize cluster load distribution and improve system stability

> For more details about descheduling, see: [descheduler](https://github.com/volcano-sh/descheduler)

### Monitoring and Observability
* Complete logging system
* Rich monitoring metrics
* Provides a dashboard, facilitating graphical interface operations for users.

> For more details about dashboard, see: [dashboard](https://github.com/volcano-sh/dashboard)
>
> For more details about volcano metrics, see: [metrics](https://github.com/volcano-sh/volcano/blob/master/docs/design/metrics.md)

## Ecosystem
Volcano has become the de facto standard in batch computing scenarios and is widely used in the following high-performance computing frameworks:

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

Additionally, Volcano has been widely adopted by various enterprises and organizations in the fields of AI and big data. With its powerful resource management capabilities, efficient job management mechanisms, and rich scheduling strategies (such as Gang scheduling, heterogeneous device scheduling, and topology-aware scheduling), it effectively meets the complex demands of distributed training and data analysis tasks. At the same time, Volcano enhances scheduling performance while ensuring the flexibility and reliability of task scheduling, providing strong support for enterprises to build an efficient resource utilization system.

## Future Outlook
Volcano will continue to expand its functional boundaries through community collaboration and technical innovation, becoming a leader in high-performance computing and cloud-native batch scheduling.