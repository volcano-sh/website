+++
title = "Unified Scheduling"
date = 2024-12-30
lastmod = 2025-05-28
draft = false
toc = true
type = "docs"

[menu.docs]
  parent = "features"
  weight = 7
+++

## 1. Overview

As the industry's leading cloud-native batch processing system scheduler, Volcano achieves support for all types of workloads through a unified scheduling system:

- Powerful batch scheduling capabilities: Perfect support for mainstream AI and big data frameworks like Ray, TensorFlow, PyTorch, MindSpore, Spark, Flink through VcJob
- Complete Kubernetes workload support: Direct scheduling of native workloads like Deployment, StatefulSet, Job, DaemonSet

This unified scheduling capability allows users to manage all types of workloads using a single scheduler, greatly simplifying cluster management complexity.

## 2. Compatible with Kubernetes Scheduling Capabilities

Volcano achieves full compatibility with Kubernetes scheduling mechanisms through the implementation of two core scheduling plugins: predicates and nodeorder. These plugins correspond to the "PreFilter/Filter" and "Score" stages in the Kubernetes scheduling framework.

### 2.1. predicates plugin
Volcano fully implements the PreFilter-Filter stages from Kube-Scheduler, including:

- Basic resource filtering: node schedulability, Pod count limits, etc.
- Affinity/Anti-affinity: node affinity, inter-Pod affinity, etc.
- Resource constraints: node ports, volume limits, etc.
- Topology distribution: Pod topology distribution constraints, etc.
- Dynamic Resource Allocation (DRA): DRA allows you to flexibly request, allocate, and share hardware resources such as GPUs in the cluster. 

> 1. For a detailed introduction to DRA, please refer to: [dynamic-resource-allocation](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/)

> 2. For detailed steps on how to enable DRA in Volcano, please refer to the [**2.1.2. Enable DRA (Dynamic Resource Allocation) in Volcano**](#2-1-2-enable-dra-dynamic-resource-allocation-in-volcano) section later in this document.

In addition to being compatible with most of the filters in kube-scheduler, Volcano also provides the `Node Filtering Result Cache` enhancement feature:

#### 2.1.1. Node Filtering Result Cache (PredicateWithCache)
When the scheduler selects nodes for Pods, it needs to perform a series of checks (such as resource availability, affinity requirements, etc.). These check results can be cached. If a Pod with identical configuration needs to be scheduled shortly after, previous check results can be reused, avoiding repeated node filtering calculations and significantly improving scheduling performance when creating Pods in batch.

##### 2.1.1.1. Configuration
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

##### 2.1.1.2. Use Cases
1. Creating multiple Pods with identical configuration
   - Example: Creating multiple identical TensorFlow training tasks
   - After the first Pod completes node filtering, subsequent Pods can use cached results

2. Large-scale cluster scheduling optimization

> **Note**:
>
> - Only static check results are cached (like node labels, taints)
> - Dynamic resource-related checks (like CPU, memory usage) are recalculated each time
> - Related cache is automatically invalidated when node status changes

#### 2.1.2. Enable DRA(Dynamic Resource Allocation) in Volcano
There are some steps required to enable Dynamic Resource Allocation (DRA) support in the Volcano scheduler.

##### 2.1.2.1 Prerequisites
Before proceeding with the configuration steps, ensure your cluster meets the following prerequisites:

###### 2.1.2.1.1. Configure Cluster Nodes (Containerd)
For nodes running containerd as the container runtime, you must enable the Container Device Interface (CDI) feature. 
This is crucial for containerd to properly interact with DRA drivers and inject dynamic resources into Pods.

Modify the containerd configuration file on each node (typically /etc/containerd/config.toml) to ensure the following setting is present:
```toml
# Enable CDI as described in
# https://tags.cncf.io/container-device-interface#containerd-configuration
[plugins."io.containerd.grpc.v1.cri"]
  enable_cdi = true
  cdi_spec_dirs = ["/etc/cdi", "/var/run/cdi"]
```
After modifying the configuration, restart the containerd service on each node for the changes to take effect. For example: `sudo systemctl restart containerd`

> If you are using other container runtimes, please refer to: [how-to-configure-cdi](https://github.com/cncf-tags/container-device-interface?tab=readme-ov-file#how-to-configure-cdi)

##### 2.1.2.2. Configure Kube-apiserver
DRA-related APIs are k8s built-in resources instead of CRD resources, and these resources are not registered by default in v1.32, 
so you need to set the startup parameters of kube-apiserver to manually register DRA-related APIs, add or ensure the following flag is present in your kube-apiserver manifest or configuration:
```yaml
--runtime-config=resource.k8s.io/v1beta1=true
```

##### 2.1.2.3. Install Volcano With DRA feature gates enabled
When installing Volcano, you need to enable the DRA related feature gates, e.g., `DynamicResourceAllocation` must be enabled when you need to use DRA, 
you can also choose to enable the `DRAAdminAccess` feature gate to manage devices as your need.

When you are using helm to install Volcano, you can use following command to install Volcano with DRA feature gates enabled:
```bash
helm install volcano volcano/volcano --namespace volcano-system --create-namespace \
  --set custom.scheduler_feature_gates="DynamicResourceAllocation=true" \
  # Add other necessary Helm values for your installation
```

When you directly use `kubectl apply -f` to install Volcano, you need to add or ensure the following flag is present in your volcano-scheduler manifest:
```yaml
--feature-gates=DynamicResourceAllocation=true
```

##### 2.1.2.4. Configure Volcano Scheduler Plugins
After installing Volcano, you need to configure the Volcano scheduler's plugin configuration to enable the DRA plugin within the predicates plugin arguments.

Locate your Volcano scheduler configuration (A ConfigMap contains the configuration). Find the predicates plugin configuration and add or modify its arguments to enable DRA plugin.

An example snippet of the scheduler configuration (within the volcano-scheduler.conf key of the ConfigMap) might look like this:
```yaml
actions: "enqueue, allocate, backfill"
tiers:
- plugins:
  - name: priority
  - name: gang
- plugins:
  - name: drf
  - name: predicates
    arguments:
      predicate.DynamicResourceAllocationEnable: true
  - name: proportion
  - name: nodeorder
  - name: binpack
```

##### 2.1.2.5. Deploy a DRA Driver
To utilize Dynamic Resource Allocation, you need to deploy a DRA driver in your cluster. The driver is responsible for managing the lifecycle of dynamic resources.
For example, you can refer to the [kubernetes-sigs/dra-example-driver](https://github.com/kubernetes-sigs/dra-example-driver) to deploy a example DRA driver for testing.

For some DRA Drivers which have already been used in actual production, you can refer to:

- [NVIDIA/k8s-dra-driver-gpu](https://github.com/NVIDIA/k8s-dra-driver-gpu)
- [intel/intel-resource-drivers-for-kubernetes](https://github.com/intel/intel-resource-drivers-for-kubernetes)

### 2.2. nodeorder plugin
Volcano is fully compatible with Kubernetes default scoring mechanism and implements a configurable weight system for more flexible node selection strategies. Additionally, Volcano implements parallel scoring processing, significantly improving scheduling efficiency in large-scale clusters, particularly suitable for AI training and other batch processing scenarios.

#### 2.2.1 Supported Scoring Dimensions
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

#### 2.2.2 Configuration Example
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

## 3. Advantages of Unified Scheduling

As a general-purpose batch computing system, Volcano extends Kubernetes native scheduling capabilities with the following key advantages:

### 3.1. Rich Ecosystem Support
* **Complete Framework Support**
  - Supports mainstream AI training frameworks including Ray, TensorFlow, PyTorch, MindSpore
  - Supports big data processing frameworks like Spark, Flink
  - Supports high-performance computing frameworks like MPI

* **Heterogeneous Device Support**
  - Supports GPU (CUDA/MIG) scheduling
  - Supports NPU scheduling

### 3.2. Enhanced Scheduling Capabilities
* **Gang Scheduling**
  - Supports job-level scheduling
  - Prevents resource fragmentation
  - Suitable for distributed training scenarios

* **Queue Resource Management**
  - Supports multi-tenant resource isolation
  - Supports resource borrowing and reclamation between queues
  - Supports resource quota management

### 3.3. Unified Resource Management
* **Unified Resource View**
  - Unified management of CPU, memory, GPU/NPU and other heterogeneous resources
  - Implements resource sharing and isolation
  - Improves overall resource utilization 