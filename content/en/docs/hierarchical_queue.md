+++
title = "Hierarchical Queue"

date = 2024-12-28
lastmod = 2024-12-28

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
[menu.docs]
  parent = "features"
  weight = 2
+++

## Background
In multi-tenant scenarios, queues are a core mechanism for achieving fair scheduling, resource isolation, and task priority control. However, in the current version of Volcano, queues only support a flat structure and lack hierarchical concepts. In practical applications, different queues often belong to different departments, with hierarchical relationships between departments, leading to more refined requirements for resource allocation and preemption. To address this, Volcano latest version introduces the hierarchical queue feature, significantly enhancing queue capabilities. With this feature, users can achieve finer-grained resource quota management and preemption strategies based on hierarchical queues, building a more efficient unified scheduling platform.

For users using YARN, this feature allows seamless migration of big data workloads to Kubernetes clusters using Volcano. YARN's Capacity Scheduler already supports hierarchical queues, enabling cross-level resource allocation and preemption. Volcano latest version adopts a similar hierarchical queue design, providing more flexible resource management and scheduling strategies.

## Features Support
- Supports configuring hierarchical relationships between queues.
- Supports resource sharing and reclamation between tasks in cross-level queues.
- Supports setting resource capability limits `capability` for each resource dimension, resource entitlements `deserved` (if the allocated resources of a queue exceed its `deserved` value, the queue's resources can be reclaimed), and reserved resources `guarantee` (resources reserved for the queue that cannot be shared with other queues).

## User Guide
### Scheduler Configuration
In the new version, the hierarchical queue capability is built on the `capacity` plugin. The scheduler configuration needs to enable the `capacity` plugin, set `enableHierarchy` to `true`, and enable the `reclaim` action to support resource reclamation between queues. The scheduler configuration example is as follows:

```
kind: ConfigMap
apiVersion: v1
metadata:
  name: volcano-scheduler-configmap
  namespace: volcano-system
data:
  volcano-scheduler.conf: |
    actions: "allocate, preempt, reclaim"
    tiers:
    - plugins:
      - name: priority
      - name: gang
        enablePreemptable: false
    - plugins:
      - name: drf
        enablePreemptable: false
      - name: predicates
      - name: capacity # capacity plugin must be enabled
        enableHierarchy: true # enable hierarchical queue
      - name: nodeorder
```

### Building Hierarchical Queues
A new `parent` field has been added to the Queue spec to specify the parent queue:

```
type QueueSpec struct {
    ...
	// Parent defines the parent of the queue
	// +optional
	Parent string `json:"parent,omitempty" protobuf:"bytes,8,opt,name=parent"`
    ...
}
```

Volcano Scheduler will automatically create a root queue as the root of all queues upon startup. Users can build a hierarchical queue tree based on the root queue, such as the following tree structure:

{{<figure library="1" src="hierarchical-queue-example.png" title="Figure 1: Hierarchical Queue Example" width="50%">}}

```
# The parent of child-queue-a is the root queue
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: child-queue-a
spec:
  reclaimable: true
  parent: root 
  deserved:
    cpu: 64
    memory: 128Gi
---
# The parent of child-queue-b is the root queue
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: child-queue-b
spec:
  reclaimable: true
  parent: root 
  deserved:
    cpu: 64
    memory: 128Gi
---
# The parent of subchild-queue-a1 is child-queue-a
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: subchild-queue-a1
spec:
  reclaimable: true
  parent: child-queue-a
  # You can set deserved values as needed. If the allocated resources of the queue exceed the deserved value, tasks in the queue can be reclaimed.
  deserved: 
    cpu: 32
    memory: 64Gi
---
# The parent of subchild-queue-a2 is child-queue-a
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: subchild-queue-a2
spec:
  reclaimable: true
  parent: child-queue-a 
  # You can set deserved values as needed. If the allocated resources of the queue exceed the deserved value, tasks in the queue can be reclaimed.
  deserved: 
    cpu: 32
    memory: 64Gi
---
# Submit a sample vc-job to the leaf queue subchild-queue-a1
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: job-a
spec:
  queue: subchild-queue-a1
  schedulerName: volcano
  minAvailable: 1
  tasks:
    - replicas: 1
      name: test
      template:
        spec:
          containers:
            - image: alpine
              command: ["/bin/sh", "-c", "sleep 1000"]
              imagePullPolicy: IfNotPresent
              name: alpine
              resources:
                requests:
                  cpu: "1"
                  memory: 2Gi
```

When cluster resources are insufficient for pod requirement, pod's resources can be reclaimed. For pods in different queues, they will first reclaim pods in sibling queues (if the allocated resources of the sibling queue exceed the `deserved` value). If the resources in sibling queues are still insufficient to meet the pod's requirements, the hierarchical structure of the queues (i.e., ancestor queues) will be traversed upward to find sufficient resources. For example, if job-a and job-c are submitted first and the cluster resources are insufficient for job-b, job-b will first reclaim job-a. If reclaiming job-a does not meet the resource requirements, job-c will then be considered for reclaiming.

Note that in the current version, users can only submit jobs to **leaf queues**. If tasks have already been submitted to a parent queue, child queues cannot be created under that queue. This ensures effective management of resources and tasks across different levels in the queue hierarchy. Additionally, the sum of the `deserved`/`guarantee` values of child queues cannot exceed the `deserved`/`guarantee` values configured for the parent queue. Each child queue's `capability` values cannot exceed the `capability` limits of the parent queue. If a queue does not specify the `capability` value for a certain resource dimension, it will inherit the `capability` from its parent queue. If the parent queue and all ancestor queues do not specify it, the value will finally inherit from the root queue. By default, the root queue's `capability` is set to the total available resources of that dimension in the cluster.
