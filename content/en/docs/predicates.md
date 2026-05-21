+++
title = "Predicates"

date = 2021-05-13
lastmod = 2025-11-11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Predicates"
[menu.docs]
  parent = "plugins"
  weight = 10
+++

## Overview

The Predicates plugin determines whether a task can be bound to a node by using a series of evaluation algorithms. It filters out nodes that cannot accommodate the task based on various criteria including resource availability, node conditions, and special requirements like GPU resources.

## How It Works

The Predicates plugin calls various predicate functions with the pod and nodeInfo as parameters to evaluate and pre-select nodes for scheduling. It implements:

- **PredicateFn**: A function that returns true if a node can accommodate a task, false otherwise

The plugin evaluates multiple criteria:
- Node resources (CPU, Memory, etc.)
- Node conditions and taints
- Pod affinity and anti-affinity rules
- Volume constraints
- GPU and other accelerator availability

## Scenario

### AI Workloads with GPU Requirements

In AI scenarios where GPU resources are required, the Predicates plugin can quickly filter out nodes that have the required GPU resources for centralized scheduling.

### Resource Filtering

The plugin ensures that only nodes with sufficient resources are considered for task placement, preventing scheduling failures due to resource constraints.

### Node Condition Filtering

Nodes with conditions that prevent scheduling (e.g., NotReady, MemoryPressure, DiskPressure) are filtered out.

## Configuration

The Predicates plugin is enabled in the scheduler ConfigMap:

```yaml
tiers:
- plugins:
  - name: priority
  - name: gang
- plugins:
  - name: predicates
  - name: nodeorder
  - name: binpack
```

### Configuration Parameters

The Predicates plugin supports several configuration options:

```yaml
tiers:
- plugins:
  - name: predicates
    arguments:
      predicate.GPUSharingEnable: true
      predicate.CacheEnable: true
      predicate.ProportionalEnable: true
      predicate.resources: nvidia.com/gpu
      predicate.resources.nvidia.com/gpu.weight: 100
```

| Parameter | Description | Default |
|-----------|-------------|---------|
| `predicate.GPUSharingEnable` | Enable GPU sharing predicate | false |
| `predicate.CacheEnable` | Enable predicate caching for performance | true |
| `predicate.ProportionalEnable` | Enable proportional resource predicate | false |

## Example

### Job Requiring GPU Resources

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: gpu-training-job
spec:
  schedulerName: volcano
  minAvailable: 1
  tasks:
  - replicas: 1
    name: trainer
    template:
      spec:
        containers:
        - name: tensorflow
          image: tensorflow/tensorflow:latest-gpu
          resources:
            requests:
              nvidia.com/gpu: "1"
            limits:
              nvidia.com/gpu: "1"
```

The Predicates plugin will filter nodes to only include those with available GPU resources.

### Job with Node Affinity

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: zone-specific-job
spec:
  schedulerName: volcano
  minAvailable: 1
  tasks:
  - replicas: 1
    name: worker
    template:
      spec:
        affinity:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              nodeSelectorTerms:
              - matchExpressions:
                - key: topology.kubernetes.io/zone
                  operator: In
                  values:
                  - us-west-2a
        containers:
        - name: worker
          image: busybox
```

The Predicates plugin will ensure the job is only scheduled to nodes in the specified zone.
