+++
title = "Binpack"

date = 2021-05-13
lastmod = 2025-11-11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Binpack"
[menu.docs]
  parent = "plugins"
  weight = 5
+++

## Overview

The goal of the Binpack scheduling algorithm is to fill existing nodes as much as possible (trying not to allocate to empty nodes). In the concrete implementation, the Binpack scheduling algorithm scores the nodes that can accommodate the task, with higher scores indicating higher resource utilization rates. The Binpack algorithm can fill up nodes as much as possible, consolidating application loads on some nodes, which is very conducive to the Kubernetes cluster's node auto-scaling functionality.

## How It Works

The Binpack algorithm is injected into the Volcano Scheduler process as a plugin and is applied during the node selection stage for Pods. When calculating the Binpack score, the Volcano Scheduler considers various resources requested by the Pod and averages them according to the weights configured for each resource.

Key characteristics:

- **Resource Weight**: Each resource type (CPU, Memory, GPU, etc.) can have a different weight in the scoring calculation, depending on the weight value configured by the administrator.
- **Plugin Weight**: Different plugins also need to be assigned different weights when calculating node scores. The scheduler also sets score weights for the Binpack plugin.
- **NodeOrderFn**: The plugin implements the NodeOrderFn to score nodes based on how efficiently they would be utilized after placing the task.

## Scenario

The Binpack algorithm is beneficial for small jobs that can fill as many nodes as possible:

### Big Data Scenarios

Single query jobs in big data processing benefit from Binpack by consolidating workloads and maximizing resource utilization on active nodes.

### E-commerce High Concurrency

Order generation in e-commerce flash sale scenarios can leverage Binpack to efficiently use available resources during peak loads.

### AI Inference

Single identification jobs in AI inference scenarios benefit from consolidated scheduling, reducing resource fragmentation.

### Internet Services

High concurrency service scenarios on the Internet benefit from Binpack by reducing fragmentation within nodes and reserving sufficient resource space on idle machines for Pods that have applied for more resource requests, maximizing the utilization of idle resources in the cluster.

## Configuration

The Binpack plugin is configured in the scheduler ConfigMap with optional weight parameters:

```yaml
tiers:
- plugins:
  - name: binpack
    arguments:
      binpack.weight: 10
      binpack.cpu: 1
      binpack.memory: 1
      binpack.resources: nvidia.com/gpu
      binpack.resources.nvidia.com/gpu: 2
```

### Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `binpack.weight` | Overall weight of the Binpack plugin score | 1 |
| `binpack.cpu` | Weight for CPU resource in scoring | 1 |
| `binpack.memory` | Weight for Memory resource in scoring | 1 |
| `binpack.resources` | Additional resources to consider | - |
| `binpack.resources.<resource>` | Weight for specific resource type | 1 |

## Example

Here's an example scheduler configuration that uses Binpack to prioritize node filling:

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
      - name: priority
      - name: gang
    - plugins:
      - name: predicates
      - name: nodeorder
      - name: binpack
        arguments:
          binpack.weight: 10
          binpack.cpu: 2
          binpack.memory: 1
```

In this configuration, the Binpack plugin is given a weight of 10, and CPU is weighted twice as much as memory in the scoring calculation.
