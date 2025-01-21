+++
title = "Queue Resource Management"

date = 2024-12-30
lastmod = 2024-12-30

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
toc_depth = 5
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
[menu.docs]
  parent = "features"
  weight = 5
+++

## Overview

[Queue](/en/docs/queue) is one of the core concepts in Volcano, designed to support resource allocation and task scheduling in multi-tenant scenarios. Through queues, users can implement multi-tenant resource allocation, task priority control, resource preemption and reclamation, significantly improving cluster resource utilization and task scheduling efficiency.

## Core Features

### 1. Flexible Resource Configuration

   * Supports multi-dimensional resource quota control (CPU, Memory, GPU, NPU, etc.)
   * Provides three-level resource configuration mechanism:
      * capability: Upper limit of queue resource usage
      * deserverd: Deserved resource amount (when no other queues submit jobs, jobs in this queue can exceed the deserverd value; when multiple queues submit jobs and cluster resources are insufficient, resources exceeding the deserverd value can be reclaimed by other queues)
      * guarantee: Reserved resource amount (reserved resources can only be used by this queue, other queues cannot use them)

      > Recommendations and Notes: 
      >
      > 1. When configuring three-level resources, follow: guarantee <= deserverd <= capability;
      > 2. guarantee/capability can be configured as needed, deserverd value must be configured when capacity plugin is enabled;
      > 3. deserverd configuration recommendations: In peer queue scenarios, the sum of deserverd values of all queues equals the total cluster resources; In hierarchical queue scenarios, the sum of child queues' deserverd values equals the parent queue's deserverd value, but cannot exceed it.
      > 4. capability configuration notes: In hierarchical queue scenarios, child queue's capability value cannot exceed parent queue's capability value. If child queue's capability is not set, it will inherit parent queue's capability value.

   * Supports dynamic resource quota adjustment

### 2. Hierarchical Queue Management

   * Supports [hierarchical queue](/en/docs/hierarchical_queue) structure
   * Provides resource inheritance and isolation between parent and child queues
   * Compatible with Yarn-style resource management mode, facilitating big data workload migration
   * Supports cross-level queue resource sharing and reclamation

### 3. Intelligent Resource Scheduling

   * Resource borrowing: Allows queues to use idle resources from other queues
   * Resource reclamation: Prioritizes reclaiming excess resources when resources are tight
   * Resource preemption: Ensures resource requirements for high-priority tasks

### 4. Multi-tenant Isolation

   * Strict resource quota control
   * Priority-based resource allocation
   * Prevents single tenant from over-consuming resources

## Queue Scheduling Implementation
### Queue-related Actions
Queue scheduling in Volcano involves the following core actions:

1. `enqueue`: Controls job admission into queues, decides whether to allow new jobs based on queue resource quotas and current usage.

2. `allocate`: Handles resource allocation process, ensures allocations comply with queue quota limits while supporting resource borrowing between queues to improve utilization.

3. `preempt`: Supports resource preemption **within queues**. High-priority jobs can preempt resources from lower-priority jobs in the same queue, ensuring timely execution of critical tasks.

4. `reclaim`: Supports resource reclamation **between queues**. Triggers when queue resources are tight. Prioritizes reclaiming resources exceeding queue's deserved value, considering queue/job priorities when selecting victims.

> **Note**：
> enqueue action conflicts with reclaim/preempt actions. If enqueue action determines a podgroup is not allowed to enter the queue, vc-controller won't create pods in pending state, and reclaim/preempt actions won't execute.

### Queue Scheduling Plugins
Volcano provides two core queue scheduling plugins:

#### capacity plugin
[capacity plugin](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_capacity_plugin.md) supports setting queue's deserved resource amount through explicit configuration, as shown in this example:

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: capacity-queue
spec:
  deserved:
    cpu: "10"
    memory: "20Gi"
  capability:
    cpu: "20"
    memory: "40Gi"
```

The capacity plugin enables quota control through precise resource configuration. Combined with [hierarchical queues](/en/docs/hierarchical_queue), it can achieve more fine-grained multi-tenant resource allocation and facilitates big data workload migration to Kubernetes clusters.

> **Note**: When using cluster autoscaling components like Cluster Autoscaler or Karpenter, total cluster resources change dynamically. In this case, using capacity plugin requires manual adjustment of queue's deserverd values to adapt to resource changes.

#### proportion plugin
Unlike the capacity plugin, the proportion plugin automatically calculates queue's deserved resource amount by configuring queue Weight values, without explicitly configuring deserverd values:

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: proportion-queue
spec:
  weight: 1
  capability:
    cpu: "20"
    memory: "40Gi"
```

When total cluster resource is `total_resource`, each queue's deserverd value is calculated as:
```
queue_deserved = (queue_weight / total_weight) * total_resource
```

Where `queue_weight` represents current queue's weight, `total_weight` represents sum of all queue weights, `total_resource` represents total cluster resources.

Compared to capacity plugin, capacity plugin allows direct configuration of queue's deserverd value, while proportion plugin automatically calculates queue's deserverd value through weight ratio. When cluster resources change (e.g., through Cluster Autoscaler or Karpenter scaling), proportion plugin automatically recalculates each queue's deserverd value based on weight ratios, requiring no manual intervention.

> **Important Note**: The actual deserverd value is dynamically adjusted. If calculated `queue_deserved` is greater than total resource requests of PodGroups waiting to be scheduled in the queue, the final deserverd value will be set to the total request amount to avoid over-reservation of resources and improve overall utilization.

> **Note**: 
> 1. capacity plugin and proportion plugin must be used exclusively, they cannot be used simultaneously
> 2. The choice between plugins depends on whether you want to set resource amounts directly (capacity) or calculate automatically through weights (proportion)
> 3. After Volcano v1.9.0, capacity plugin is recommended as it provides more intuitive resource configuration

#### Usage Example

The following example demonstrates a typical queue resource management scenario through 4 steps to illustrate the resource reclamation mechanism:

**Step 1: Initial State**

In the initial cluster state, default queue can use all resources (4C).

**Step 2: Create Initial Jobs**

Create two jobs in default queue requesting 1C and 3C resources:

```yaml
# job1.yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: job1
spec:
  queue: default
  tasks:
    - replicas: 1
      template:
        spec:
          containers:
            - name: nginx
              image: nginx
              resources:
                requests:
                  cpu: "1"
---
# job2.yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: job2
spec:
  queue: default
  tasks:
    - replicas: 1
      template:
        spec:
          containers:
            - name: nginx
              image: nginx
              resources:
                requests:
                  cpu: "3"
```

At this point, both jobs can run normally as they can temporarily use resources exceeding deserved amount.

**Step 3: Create New Queue**

Create test queue and set resource ratio. You can choose either capacity plugin or proportion plugin:

```yaml
# Using capacity plugin
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: test
spec:
  reclaimable: true
  deserved:
    cpu: 3
```
or
```yaml
# Using proportion plugin
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: test
spec:
  reclaimable: true
  weight: 3    # Resource allocation ratio default:test = 1:3
```

**Step 4: Trigger Resource Reclamation**

Create job3 in test queue requesting 3C resources (configuration similar to job2, just change queue to test):

```yaml
# job3.yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: job3
spec:
  queue: test    # Change queue to test
  tasks:
    - replicas: 1
      template:
        spec:
          containers:
            - name: nginx
              image: nginx
              resources:
                requests:
                  cpu: "3"
```

After submitting job3, system starts resource reclamation:
* System reclaims resources exceeding deserved amount from default queue
* job2 (3C) is evicted
* job1 (1C) continues running
* job3 (3C) starts running

This scenario works with both capacity plugin and proportion plugin:
* capacity plugin: Directly configure deserved values (default=1C, test=3C)
* proportion plugin: Configure weight values (default=1, test=3) resulting in the same deserved values
