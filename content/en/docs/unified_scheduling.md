+++
title = "Unified Scheduling"
date = 2024-12-30
lastmod = 2024-12-30
draft = false
toc = true
type = "docs"

[menu.docs]
  parent = "features"
  weight = 3
+++

## Overview

As the industry's leading cloud-native batch processing system scheduler, Volcano achieves support for all types of workloads through a unified scheduling system:

- Powerful batch scheduling capabilities: Perfect support for mainstream AI and big data frameworks like Ray, TensorFlow, PyTorch, MindSpore, Spark, Flink through VcJob
- Complete Kubernetes workload support: Direct scheduling of native workloads like Deployment, StatefulSet, Job, DaemonSet

This unified scheduling capability allows users to manage all types of workloads using a single scheduler, greatly simplifying cluster management complexity.

## Compatible with Kubernetes Scheduling Capabilities

Volcano achieves full compatibility with Kubernetes scheduling mechanisms through the implementation of two core scheduling plugins: predicates and nodeorder. These plugins correspond to the "PreFilter/Filter" and "Score" stages in the Kubernetes scheduling framework.

### 1. predicates plugin
Volcano fully implements the PreFilter-Filter stages from Kube-Scheduler, including:

- Basic resource filtering: node schedulability, Pod count limits, etc.
- Affinity/Anti-affinity: node affinity, inter-Pod affinity, etc.
- Resource constraints: node ports, volume limits, etc.
- Topology distribution: Pod topology distribution constraints, etc.

In addition to compatible Kubernetes filters, Volcano provides the following enhanced features:

#### Node Filtering Result Cache (PredicateWithCache)
When the scheduler selects nodes for Pods, it needs to perform a series of checks (such as resource availability, affinity requirements, etc.). These check results can be cached. If a Pod with identical configuration needs to be scheduled shortly after, previous check results can be reused, avoiding repeated node filtering calculations and significantly improving scheduling performance when creating Pods in batch.

##### Configuration
Enable caching in volcano-scheduler-configmap:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: volcano-scheduler-configmap
  namespace: volcano-system
data:
  volcano-scheduler.conf: |
    actions: "enqueue, allocate, backfill"
    tiers:
    - plugins:
      - name: predicates
        arguments:
          predicate.CacheEnable: true        # Enable node filtering result cache
```

##### Use Cases
1. Creating multiple Pods with identical configuration
   - Example: Creating multiple identical TensorFlow training tasks
   - After the first Pod completes node filtering, subsequent Pods can use cached results

2. Large-scale cluster scheduling optimization

> **Note**:
>
> - Only static check results are cached (like node labels, taints)
> - Dynamic resource-related checks (like CPU, memory usage) are recalculated each time
> - Related cache is automatically invalidated when node status changes

### 2. nodeorder plugin
Volcano is fully compatible with Kubernetes default scoring mechanism and implements a configurable weight system for more flexible node selection strategies. Additionally, Volcano implements parallel scoring processing, significantly improving scheduling efficiency in large-scale clusters, particularly suitable for AI training and other batch processing scenarios.

#### Supported Scoring Dimensions
1. **Resource Dimension**
   - `leastrequested`: Prefer nodes with fewer resource requests, suitable for resource spreading
   - `mostrequested`: Prefer nodes with more resource requests, suitable for resource packing
   - `balancedresource`: Seek balance between CPU, memory and other resources, avoid single resource bottlenecks

2. **Affinity Dimension**
   - `nodeaffinity`: Score based on node affinity rules
   - `podaffinity`: Score based on inter-Pod affinity rules
   - `tainttoleration`: Score based on node taints and Pod tolerations

3. **Other Dimensions**
   - `imagelocality`: Prefer nodes that already have required container images
   - `podtopologyspread`: Ensure Pods are evenly distributed across different topology domains

#### Configuration Example
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: volcano-scheduler-configmap
data:
  volcano-scheduler.conf: |
    actions: "enqueue, allocate, backfill"
    tiers:
    - plugins:
      - name: nodeorder
        arguments:
          # Resource dimension weights
          leastrequested.weight: 1      # Default weight is 1
          mostrequested.weight: 0       # Default weight is 0 (disabled by default)
          balancedresource.weight: 1    # Default weight is 1
          
          # Affinity dimension weights
          nodeaffinity.weight: 2        # Default weight is 2
          podaffinity.weight: 2         # Default weight is 2
          tainttoleration.weight: 3     # Default weight is 3
          
          # Other dimension weights
          imagelocality.weight: 1       # Default weight is 1
          podtopologyspread.weight: 2   # Default weight is 2
```

### Advantages of Unified Scheduling

As a general-purpose batch computing system, Volcano extends Kubernetes native scheduling capabilities with the following key advantages:

#### 1. Rich Ecosystem Support
* **Complete Framework Support**
  - Supports mainstream AI training frameworks including Ray, TensorFlow, PyTorch, MindSpore
  - Supports big data processing frameworks like Spark, Flink
  - Supports high-performance computing frameworks like MPI

* **Heterogeneous Device Support**
  - Supports GPU (CUDA/MIG) scheduling
  - Supports NPU scheduling

#### 2. Enhanced Scheduling Capabilities
* **Gang Scheduling**
  - Supports job-level scheduling
  - Prevents resource fragmentation
  - Suitable for distributed training scenarios

* **Queue Resource Management**
  - Supports multi-tenant resource isolation
  - Supports resource borrowing and reclamation between queues
  - Supports resource quota management

#### 3. Unified Resource Management
* **Unified Resource View**
  - Unified management of CPU, memory, GPU/NPU and other heterogeneous resources
  - Implements resource sharing and isolation
  - Improves overall resource utilization 