---
title: "Introduction"
date: 2019-01-28
lastmod: 2020-08-27
draft: false
toc: true
type: "docs"

# Add menu entry to sidebar
sidebar_position: 1
sidebar_label: "Introduction"
---

## What is Volcano

Volcano is a cloud native system for high-performance workloads, which has been accepted by [Cloud Native Computing Foundation (CNCF)](https://www.cncf.io/) as its first and only official container batch scheduling project. Volcano supports popular computing frameworks such as:

- [Spark](https://spark.apache.org/)
- [TensorFlow](https://www.tensorflow.org/) 
- [PyTorch](https://pytorch.org/)
- [Flink](https://flink.apache.org/)
- [Argo](https://argoproj.github.io/)
- [MindSpore](https://www.mindspore.cn/en)
- [PaddlePaddle](https://www.paddlepaddle.org.cn/)
- [Ray](https://www.ray.io/)

Volcano also provides various scheduling capabilities including heterogeneous device scheduling, network topology-aware scheduling, multi-cluster scheduling, online-offline workloads colocation and more.

## Why Volcano

Job scheduling and management become increasingly complex and critical for high-performance batch computing. Common requirements are as follows:

- Support for diverse scheduling algorithms
- More efficient scheduling
- Non-intrusive support for mainstream computing frameworks  
- Support for multi-architecture computing

Volcano is designed to cater to these requirements. In addition, Volcano inherits the design of Kubernetes APIs, allowing you to easily run applications that require high-performance computing on Kubernetes.

## Features

### Unified Scheduling

- Support native Kubernetes workload scheduling
- Provide complete support for frameworks like PyTorch, TensorFlow, Spark, Flink, Ray through VolcanoJob  
- Unified scheduling for both online microservices and offline batch jobs to improve cluster resource utilization

### Rich Scheduling Policies

- **Gang Scheduling**: Ensure all tasks of a job start simultaneously
- **Binpack Scheduling**: Optimize resource utilization through compact task allocation
- **Heterogeneous Device Scheduling**: Efficient GPU sharing (CUDA/MIG modes) and NPU scheduling
- **Proportion/Capacity Scheduling**: Resource sharing/preemption/reclaim based on queue quotas
- **NodeGroup Scheduling**: Support node group affinity scheduling
- **DRF Scheduling**: Support fair scheduling of multi-dimensional resources  
- **SLA Scheduling**: Scheduling guarantee based on service quality
- **Task-topology Scheduling**: Optimize performance for communication-intensive applications
- **NUMA Aware Scheduling**: Optimize resource allocation for multi-core processors

Volcano supports custom plugins and actions to implement more scheduling algorithms.

### Queue Resource Management

- Support multi-dimensional resource quota control (CPU, Memory, GPU, etc.)
- Provide multi-level queue structure and resource inheritance
- Support resource borrowing, reclaiming and preemption between queues
- Implement multi-tenant resource isolation and priority control

### Multi-architecture computing

Volcano can schedule computing resources from multiple architectures:

- x86
- Arm  
- Kunpeng
- Ascend
- GPU

### Network Topology-aware Scheduling

Supports network topology-aware scheduling to optimize data transmission for distributed training tasks, reducing communication overhead and improving training speed.

### Online and Offline Workloads Colocation

Enhances resource utilization while ensuring QoS through:

- Unified scheduling  
- Dynamic resource overcommitment
- CPU burst
- Resource isolation

### Multi-cluster Scheduling

Support cross-cluster job scheduling for larger-scale resource pool management.

> For details: [volcano-global](https://github.com/volcano-sh/volcano-global)

### Descheduling

Support dynamic descheduling to optimize cluster load distribution.

> For details: [descheduler](https://github.com/volcano-sh/descheduler)  

### Monitoring and Observability

- Complete logging system
- Rich monitoring metrics
- Dashboard for graphical interface

> Dashboard: [dashboard](https://github.com/volcano-sh/dashboard)  
> Metrics: [metrics](https://github.com/volcano-sh/volcano/blob/master/docs/design/metrics.md)

## Ecosystem

Volcano integrates with these high-performance computing frameworks:

- [Spark](https://spark.apache.org/)
- [TensorFlow](https://www.tensorflow.org/)
- [PyTorch](https://pytorch.org/)  
- [Flink](https://flink.apache.org/)
- [Argo](https://argoproj.github.io/)
- [Ray](https://www.ray.io/)
- [MindSpore](https://www.mindspore.cn/)
- [PaddlePaddle](https://www.paddlepaddle.org.cn/)
- [OpenMPI](https://www.open-mpi.org/)
- [Horovod](https://horovod.readthedocs.io/)
- [MXNet](https://mxnet.apache.org/)
- [Kubeflow](https://www.kubeflow.org/)
- [KubeGene](https://github.com/volcano-sh/kubegene)
- [Cromwell](https://cromwell.readthedocs.io/)

## Future Outlook

Volcano will continue to expand its functional boundaries through community collaboration and technical innovation, becoming a leader in high-performance computing and cloud-native batch scheduling.