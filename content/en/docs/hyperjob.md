++ 
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

Both HyperJob and Volcano Job are part of the same ecosystem, but they focus on different scopes:

| Aspect                        | Volcano Job                                             | HyperJob                                                                 |
|-------------------------------|--------------------------------------------------------|--------------------------------------------------------------------------|
| Scope                         | Single cluster                                         | Multiple clusters                                                        |
| Execution unit                | One `Job` in one cluster                               | One logical HyperJob mapped to **multiple** underlying Volcano Jobs      |
| Multi-cluster awareness       | Not aware                                              | Native multi-cluster abstraction                                        |
| Job splitting                 | Not provided                                           | **Built-in automatic job splitting**                                    |
| Status view                   | Per cluster, per job                                   | **Unified status** across clusters and child jobs                       |
| When to use                   | Cluster is big enough; single-cluster scheduling only | Workloads need more capacity than one cluster or must span many clusters |

**When to use Volcano Job**

- You only run in a single cluster.
- The workload size fits within that cluster’s resource capacity.
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

## Architecture Overview

At a high level, HyperJob works as follows (conceptual view):

1. **User submits a HyperJob** to a control-plane cluster.
2. The HyperJob controller:
   - Interprets the desired replicas and resources.
   - Applies **splitting policies** (for example, per-cluster replica counts or resource quotas).
3. For each target cluster, the controller creates one or more **underlying Volcano Jobs**.
4. **Volcano Global** and **Karmada** handle:
   - Multi-cluster scheduling and `ResourceBinding` management.
   - Cross-cluster queue and priority handling.
   - Fair sharing and admission control across clusters.
5. HyperJob continuously watches the state of all child jobs and **aggregates status** back to the HyperJob resource.

In this architecture:

- HyperJob focuses on **job-level abstraction and splitting**.
- Volcano Job focuses on **in-cluster batch scheduling**.
- Volcano Global + Karmada focus on **multi-cluster coordination and placement**.

For more details on the multi-cluster layer, see
[Multi-Cluster AI Job Scheduling](/en/docs/multi_cluster_scheduling/) and the
[Volcano Global](https://github.com/volcano-sh/volcano-global) project.

## Example: HyperJob YAML (Conceptual)

The exact HyperJob API is defined in the Volcano design and implementation.
The following example is a **simplified conceptual** manifest to illustrate how a HyperJob can describe
a logical job and its split across clusters. For the authoritative API, always refer to the
[HyperJob design document](https://github.com/volcano-sh/volcano/blob/master/docs/design/hyperjob-multi-cluster-job-splitting.md)
and the corresponding CRD definition in the Volcano repository.

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: HyperJob
metadata:
  name: llm-train-hyperjob
spec:
  # High-level description of the logical job
  template:
    apiVersion: batch.volcano.sh/v1alpha1
    kind: Job
    spec:
      minAvailable: 64
      schedulerName: volcano
      queue: global-ai
      tasks:
        - name: trainer
          replicas: 64
          template:
            spec:
              containers:
                - name: trainer
                  image: example.com/llm-train:latest
                  resources:
                    requests:
                      cpu: "8"
                      memory: "64Gi"
                      nvidia.com/gpu: "1"
              restartPolicy: OnFailure

  # Conceptual splitting policy (names and fields are illustrative)
  splitPolicy:
    strategy: ByCluster
    clusters:
      - name: cluster-a
        replicas: 32
      - name: cluster-b
        replicas: 32
```

In practice, the real HyperJob spec may include:

- More detailed **cluster selection** and **constraints**.
- Fields to describe how to **map HyperJob status** from child jobs.
- Policies for **retry, rollback, and cleanup** across clusters.

Always check the latest Volcano documentation and code for the exact API.

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

