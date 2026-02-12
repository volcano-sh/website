<<<<<<< HEAD
+++ 
=======
+++
>>>>>>> 21db252 (fix/refactor: Introduce HyperJob multi-cluster job splitting concept with comparison table, real-world use cases, and complete YAML examples from design doc. Removed architecture overview to keep focus on user-facing concepts)
title = "HyperJob"
description = "Multi-cluster job splitting and high-level scheduling with HyperJob"
date = 2026-02-05
lastmod = 2026-02-05

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "HyperJob"
[menu.docs]
  parent = "concepts"
  weight = 4
+++

## Overview

HyperJob is a high-level scheduling abstraction built on top of Volcano Job for **multi-cluster AI workloads**.
Instead of submitting and managing multiple Volcano Jobs in different clusters, users submit a single HyperJob,
and the system automatically **splits**, **dispatches**, and **tracks** the underlying jobs across clusters.

HyperJob is designed for scenarios where:

- A single Kubernetes cluster **does not have enough resources** for a large AI/ML training job.
- You want to **combine capacity from multiple clusters** (for example, across regions or environments).
- You need a **unified control plane and status view** for a job that actually runs in many clusters.

HyperJob leverages Volcano Job as the basic execution unit and works together with **Volcano Global** and
**Karmada** to make multi-cluster job orchestration as simple as running a single job in one cluster.

## Key Features and Advantages

- **Automatic Job Splitting**
  - Splits a large logical job into multiple child jobs that can be scheduled to different clusters.
  - Splitting can be based on replicas, resources, or other policies defined in HyperJob.

- **Unified Status Management**
  - HyperJob exposes **one high-level status** that aggregates the states of all underlying jobs.
  - Users can start, stop, and observe the entire multi-cluster workload from a single resource.

- **Simplified Multi-Cluster Usage**
  - Users no longer need to manually create and manage jobs per cluster.
  - Cluster selection and placement policies are handled by the HyperJob control plane plus Volcano Global.

- **High-Level Scheduling**
  - Acts as a **meta-scheduler** on top of Volcano Job.
  - Decides how many replicas go to which cluster, and then lets Volcano Job handle in-cluster scheduling
    (gang scheduling, fair sharing, queue priority, and so on).

- **Resource Optimization Across Clusters**
  - Makes it easier to **utilize fragmented or heterogeneous capacity** across multiple clusters.
  - Can spread load to avoid hot spots and improve overall throughput for large AI/ML workloads.

## HyperJob vs. Standard Volcano Job

HyperJob is built on top of Volcano Job, not as a replacement. It extends Volcano's capabilities to multi-cluster scenarios while preserving all the features of Volcano Job within each cluster.

| Aspect | Volcano Job | HyperJob |
|--------|-------------|----------|
| **Scope** | Single cluster | Multiple clusters |
| **Abstraction Level** | Cluster-level primitive (manages Pods) | Meta-level primitive (manages Volcano Jobs) |
| **Primary Use Case** | Batch workload scheduling | Large-scale training across heterogeneous clusters |
| **Job Composition** | Single job with multiple tasks | Composition of multiple Volcano Jobs |
| **Status Tracking** | Tracks pods within a single job | Aggregates status from multiple Volcano Jobs across clusters |

HyperJob is designed for scenarios where training requirements exceed single cluster capacity or need to leverage heterogeneous accelerator resources across different clusters.

**When to use Volcano Job**

- You only run in a single cluster.
- The workload size fits within that cluster's resource capacity.
- You want straightforward integration with existing controllers or pipelines that already speak Volcano Job.

**When to use HyperJob**

- Your AI/ML workload (for example, LLM pre-training or fine-tuning) needs **aggregate resources from multiple clusters**.
- You want a **single submission and control interface** for a distributed training or inference job.
- You need to **combine heterogeneous resources** (different GPU models, zones, or hardware generations) while
  letting the system choose where each part of the job runs.

## Typical Use Cases

- **Multi-Cluster LLM Training**
  - Train a large language model where a single cluster cannot provide enough GPUs or network bandwidth.
  - HyperJob splits replicas across multiple clusters while presenting a single logical job to the user.

- **Heterogeneous Resource Scheduling**
  - Combine clusters with different GPU types (for example, A100, H100, or other accelerators).
  - HyperJob can assign subtasks to the most suitable cluster based on resource type and availability.

- **Resource Overflow and Bursting**
  - When a primary cluster is close to saturation, HyperJob can place additional replicas into other clusters
    without changing user-facing APIs.

- **Geographically Distributed Training**
  - Distribute parts of a workload across clusters in different regions or data centers.
  - Useful for latency-sensitive scenarios or to comply with data locality requirements.

## Example: HyperJob YAML

### Case 1: Large-scale Training Job Splitting

A research team wants to train a large language model that requires 256 GPUs, but their largest cluster only has 128 GPUs. Using HyperJob, they can split the training job into two sub-jobs, each with 128 GPUs, and run them across two clusters.

```yaml
apiVersion: training.volcano.sh/v1alpha1
kind: HyperJob
metadata:
  name: llm-training
spec:
  minAvailable: 2
  maxDomains: 2
  replicatedJobs:
  - name: trainer
    replicas: 2
    templateSpec:
      tasks:
      - name: worker
        replicas: 128
        template:
          spec:
            containers:
            - name: trainer
              image: training-image:v1
              resources:
                requests:
                  nvidia.com/gpu: 1
```

### Case 2: Heterogeneous Clusters

An organization has multiple clusters with different generations of accelerators (e.g., Ascend NPU 910B and 910C). They need to run a training job across these heterogeneous clusters.

```yaml
apiVersion: training.volcano.sh/v1alpha1
kind: HyperJob
metadata:
  name: ascend-heterogeneous-training
spec:
  minAvailable: 2
  replicatedJobs:
  - name: trainer-910b
    replicas: 1
    clusterNames: ["cluster-ascend-910b-1", "cluster-ascend-910b-2"]
    templateSpec:
      tasks:
      - name: worker
        replicas: 64
        template:
          spec:
            affinity:
              nodeAffinity:
                requiredDuringSchedulingIgnoredDuringExecution:
                  nodeSelectorTerms:
                  - matchExpressions:
                    - key: hardware-type
                      operator: In
                      values:
                      - Ascend910B
            containers:
            - name: trainer
              image: training-image:v1
              resources:
                requests:
                  ascend910c: 1
                limits:
                  ascend910c: 1
  - name: trainer-910c
    replicas: 1
    clusterNames: ["cluster-ascend-910c-1"]
    templateSpec:
      tasks:
      - name: worker
        replicas: 64
        template:
          spec:
            affinity:
              nodeAffinity:
                requiredDuringSchedulingIgnoredDuringExecution:
                  nodeSelectorTerms:
                  - matchExpressions:
                    - key: hardware-type
                      operator: In
                      values:
                      - Ascend910C
            containers:
            - name: trainer
              image: training-image:v1
              resources:
                requests:
                  ascend910c: 1
                limits:
                  ascend910c: 1
```

## Related Concepts and References

- **Volcano Job**: The core batch job abstraction in a single cluster.
  See [VolcanoJob](/en/docs/vcjob/) for details.
- **Queue**: Controls resource sharing and priority.
  See [Queue](/en/docs/queue/) and [Queue Resource Management](/en/docs/queue_resource_management/).
- **Multi-Cluster AI Job Scheduling**:
  See [Multi-Cluster AI Job Scheduling](/en/docs/multi_cluster_scheduling/) for Volcano Global architecture
  and usage patterns.
- **HyperJob Design Document**:
  See the detailed design:  
  `https://github.com/volcano-sh/volcano/blob/master/docs/design/hyperjob-multi-cluster-job-splitting.md`

