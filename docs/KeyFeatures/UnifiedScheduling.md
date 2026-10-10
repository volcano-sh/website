---
title: "Unified Scheduling"
sidebar_position: 7
---
## 1. Overview

Volcano provides unified scheduling at the platform level. Starting with v1.14, it can run two coordinated scheduling paths in one Kubernetes cluster:

- The Volcano Batch Scheduler handles batch and elastic workloads that need job-level semantics, queues, fairness, Gang Scheduling, topology constraints, preemption, or resource reclamation.
- The Agent Scheduler provides a fast path for latency-sensitive, short-lived Pods. It uses a simplified scheduling pipeline and multiple workers to reduce queueing and scheduling latency.

The Sharding Controller coordinates the two schedulers. It calculates a candidate node set for each scheduler and publishes the result through `NodeShard` resources. This avoids placing all workload types in one scheduling loop while retaining a shared cluster resource pool.

The Agent Scheduler, Sharding Controller, and `NodeShard` API are Alpha features in v1.15. Their APIs and configuration may change in later releases.

## 2. Dual-Path Scheduling Architecture

![Volcano dual-path scheduling architecture](/img/doc/unified-scheduling-dual-path.svg)

<!-- Replace the SVG above with the project presentation diagram when the final artwork is available. -->

| Component | Responsibility |
|-----------|----------------|
| Volcano Batch Scheduler | Runs session-based scheduling for AI training, HPC, big-data, and other batch or elastic workloads. |
| Agent Scheduler | Schedules latency-sensitive Pods through a fast-path queue and concurrent workers. |
| Sharding Controller | Evaluates sharding policies and reconciles the desired node set for each scheduler. |
| `NodeShard` | Records the desired, in-use, pending-addition, and pending-removal node sets for a scheduler. |
| Sharding Coordinator | Synchronizes `NodeShard` changes into each scheduler at a safe scheduling-cycle boundary. |

### 2.1. Selecting a Scheduling Path

Workloads select a path through `spec.schedulerName`. Use the Batch Scheduler when the workload depends on Volcano's job and queue semantics. Use the Agent Scheduler when individual Pod scheduling latency is the primary requirement.

```yaml
# Batch path
spec:
  schedulerName: volcano
```

```yaml
# Fast path
spec:
  schedulerName: agent-scheduler
```

The Agent Scheduler is disabled by default in the v1.15 Helm chart. Enabling it does not automatically move existing workloads to the fast path; their `schedulerName` must target the Agent Scheduler.

### 2.2. Sharding Modes

Both schedulers can consume the node sets published by the Sharding Controller. The scheduling scope is controlled independently for each scheduler.

| Mode | Behavior |
|------|----------|
| `none` | Sharding is disabled. The scheduler considers all cluster nodes. This is the default. |
| `soft` | Nodes in the scheduler's shard are preferred. Other nodes remain available as a fallback. |
| `hard` | Only nodes in the scheduler's shard are considered. This prevents cross-scheduler node conflicts at the cost of a smaller scheduling scope. |

Configure the mode with `--scheduler-sharding-mode`. By default, a scheduler reads the `NodeShard` whose name matches the scheduler name. Use `--scheduler-sharding-name` only when the resource name must differ.

### 2.3. Configuring Node Shards

In v1.15, the Sharding Controller reads a live-reloadable ConfigMap. Each scheduler has an ordered policy chain. The controller runs all filters, combines weighted scores, and then applies selectors:

```text
filter -> sort -> select
```

The following example assigns lower-utilization nodes to the Batch Scheduler and higher-utilization nodes to the Agent Scheduler. The values are examples; production thresholds should be derived from workload measurements.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: volcano-sharding-configmap
  namespace: volcano-system
data:
  sharding.yaml: |
    schedulerConfigs:
      - name: volcano
        type: volcano
        policies:
          - name: allocation-rate
            weight: 1
            arguments:
              minCPUUtil: 0.0
              maxCPUUtil: 0.6
          - name: node-limit
            arguments:
              minNodes: 2
              maxNodes: 100

      - name: agent-scheduler
        type: agent
        policies:
          - name: allocation-rate
            weight: 1
            arguments:
              minCPUUtil: 0.7
              maxCPUUtil: 1.0
          - name: warmup
            weight: 5
            arguments:
              warmupLabel: node.volcano.sh/warmup
              warmupLabelValue: "true"
          - name: node-limit
            arguments:
              minNodes: 2
              maxNodes: 50

    shardSyncPeriod: 60s
    enableNodeEventTrigger: true
```

ConfigMap updates are validated and applied without restarting the controller. If an update is invalid, the controller logs the error and keeps the previous valid configuration. Deleting the ConfigMap also retains the last known configuration.

Node assignments can change while scheduling is in progress. Each scheduler's Sharding Coordinator delays cache changes until its active workers or scheduling session reach a safe boundary. This keeps the scheduler cache and `NodeShard` state consistent during a shard transition.

## 3. Compatible with Kubernetes Scheduling Capabilities

Volcano achieves full compatibility with Kubernetes scheduling mechanisms through the implementation of two core scheduling plugins: predicates and nodeorder. These plugins correspond to the "PreFilter/Filter" and "Score" stages in the Kubernetes scheduling framework.

### 3.1. predicates plugin
Volcano fully implements the PreFilter-Filter stages from Kube-Scheduler, including:

- Basic resource filtering: node schedulability, Pod count limits, etc.
- Affinity/Anti-affinity: node affinity, inter-Pod affinity, etc.
- Resource constraints: node ports, volume limits, etc.
- Topology distribution: Pod topology distribution constraints, etc.
- Dynamic Resource Allocation (DRA): DRA allows you to flexibly request, allocate, and share hardware resources such as GPUs in the cluster. 

> 1. For a detailed introduction to DRA, please refer to: [dynamic-resource-allocation](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/)

> 2. For detailed steps on how to enable DRA in Volcano, please refer to the [**3.1.2. Enable DRA (Dynamic Resource Allocation) in Volcano**](#312-enable-dra-dynamic-resource-allocation-in-volcano) section later in this document.

In addition to being compatible with most of the filters in kube-scheduler, Volcano also provides the `Node Filtering Result Cache` enhancement feature:

#### 3.1.1. Node Filtering Result Cache (PredicateWithCache)
When the scheduler selects nodes for Pods, it needs to perform a series of checks (such as resource availability, affinity requirements, etc.). These check results can be cached. If a Pod with identical configuration needs to be scheduled shortly after, previous check results can be reused, avoiding repeated node filtering calculations and significantly improving scheduling performance when creating Pods in batch.

##### 3.1.1.1. Configuration
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

##### 3.1.1.2. Use Cases
1. Creating multiple Pods with identical configuration
   - Example: Creating multiple identical TensorFlow training tasks
   - After the first Pod completes node filtering, subsequent Pods can use cached results

2. Large-scale cluster scheduling optimization

> **Note**:
>
> - Only static check results are cached (like node labels, taints)
> - Dynamic resource-related checks (like CPU, memory usage) are recalculated each time
> - Related cache is automatically invalidated when node status changes

#### 3.1.2. Enable DRA (Dynamic Resource Allocation) in Volcano
There are some steps required to enable Dynamic Resource Allocation (DRA) support in the Volcano scheduler.

##### 3.1.2.1 Prerequisites
Before proceeding with the configuration steps, ensure your cluster meets the following prerequisites:

###### 3.1.2.1.1. Configure Cluster Nodes (Containerd)
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

##### 3.1.2.2. Configure Kube-apiserver
DRA-related APIs are k8s built-in resources instead of CRD resources, and these resources are not registered by default in v1.32, 
so you need to set the startup parameters of kube-apiserver to manually register DRA-related APIs, add or ensure the following flag is present in your kube-apiserver manifest or configuration:
```yaml
--runtime-config=resource.k8s.io/v1beta1=true
```

##### 3.1.2.3. Install Volcano With DRA feature gates enabled
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

##### 3.1.2.4. Configure Volcano Scheduler Plugins
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

##### 3.1.2.5. Deploy a DRA Driver
To utilize Dynamic Resource Allocation, you need to deploy a DRA driver in your cluster. The driver is responsible for managing the lifecycle of dynamic resources.
For example, you can refer to the [kubernetes-sigs/dra-example-driver](https://github.com/kubernetes-sigs/dra-example-driver) to deploy a example DRA driver for testing.

For some DRA Drivers which have already been used in actual production, you can refer to:

- [NVIDIA/k8s-dra-driver-gpu](https://github.com/NVIDIA/k8s-dra-driver-gpu)
- [intel/intel-resource-drivers-for-kubernetes](https://github.com/intel/intel-resource-drivers-for-kubernetes)

### 3.2. nodeorder plugin
Volcano is fully compatible with Kubernetes default scoring mechanism and implements a configurable weight system for more flexible node selection strategies. Additionally, Volcano implements parallel scoring processing, significantly improving scheduling efficiency in large-scale clusters, particularly suitable for AI training and other batch processing scenarios.

#### 3.2.1 Supported Scoring Dimensions
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

#### 3.2.2 Configuration Example
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

## 4. Advantages of Unified Scheduling

As a general-purpose batch computing system, Volcano extends Kubernetes native scheduling capabilities with the following key advantages:

### 4.1. Rich Ecosystem Support
* **Complete Framework Support**
  - Supports mainstream AI training frameworks including Ray, TensorFlow, PyTorch, MindSpore
  - Supports big data processing frameworks like Spark, Flink
  - Supports high-performance computing frameworks like MPI

* **Heterogeneous Device Support**
  - Supports GPU (CUDA/MIG) scheduling
  - Supports NPU scheduling

### 4.2. Enhanced Scheduling Capabilities
* **Gang Scheduling**
  - Supports job-level scheduling
  - Prevents resource fragmentation
  - Suitable for distributed training scenarios

* **Queue Resource Management**
  - Supports multi-tenant resource isolation
  - Supports resource borrowing and reclamation between queues
  - Supports resource quota management

### 4.3. Unified Resource Management
* **Unified Resource View**
  - Unified management of CPU, memory, GPU/NPU and other heterogeneous resources
  - Implements resource sharing and isolation
  - Improves overall resource utilization

## 5. References

- [Volcano v1.14.0 release notes](https://github.com/volcano-sh/volcano/releases/tag/v1.14.0)
- [Volcano v1.15.0 release notes](https://github.com/volcano-sh/volcano/releases/tag/v1.15.0)
- [Agent Scheduler design](https://github.com/volcano-sh/volcano/blob/v1.15.0/docs/design/agent-scheduler.md)
- [Sharding Controller design](https://github.com/volcano-sh/volcano/blob/v1.15.0/docs/design/sharding_controller.md)
- [Sharding ConfigMap user guide](https://github.com/volcano-sh/volcano/blob/v1.15.0/docs/user-guide/how_to_configure_sharding_configmap.md)
