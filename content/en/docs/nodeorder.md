+++
title = "Nodeorder"

date = 2021-05-13
lastmod = 2025-11-11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Nodeorder"
[menu.docs]
  parent = "plugins"
  weight = 11
+++

## Overview

The Nodeorder plugin is a scheduling optimization strategy that scores nodes from various dimensions through simulated assignments to find the node that is best suited for the current task. The scoring parameters are configured by the user.

## How It Works

The Nodeorder plugin implements the **NodeOrderFn** to score all nodes for a task using a series of scoring algorithms. The node with the highest score is considered to be the most suitable node for the task.

Scoring dimensions include:
- **Affinity**: Node and pod affinity/anti-affinity scores
- **LeastRequestedResource**: Prefers nodes with more available resources
- **MostRequestedResource**: Prefers nodes with fewer available resources (consolidation)
- **BalancedResourceAllocation**: Prefers nodes with balanced resource usage
- **ImageLocality**: Prefers nodes that already have the container images

## Scenario

The Nodeorder plugin provides scoring criteria across multiple dimensions for scheduling. The combination of different dimensions enables users to flexibly configure appropriate scheduling policies according to their own needs.

### Workload Distribution

By adjusting weights for different scoring dimensions, you can control how workloads are distributed across the cluster:
- Use **LeastRequestedResource** to spread workloads evenly
- Use **MostRequestedResource** to consolidate workloads (similar to Binpack)

### Image Locality Optimization

For large container images, using **ImageLocality** scoring can reduce pod startup time by preferring nodes that already have the required images.

### Affinity Optimization

The **Affinity** dimension ensures that pods are placed according to their affinity and anti-affinity rules.

## Configuration

The Nodeorder plugin is enabled in the scheduler ConfigMap with configurable weights:

```yaml
tiers:
- plugins:
  - name: predicates
  - name: nodeorder
    arguments:
      nodeorder.weight: 10
      nodeorder.leastrequested.enable: true
      nodeorder.mostrequested.enable: false
      nodeorder.nodeaffinity.enable: true
      nodeorder.podaffinity.enable: true
      nodeorder.balancedresource.enable: true
      nodeorder.imagelocality.enable: true
```

### Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `nodeorder.weight` | Overall weight of the Nodeorder plugin | 1 |
| `nodeorder.leastrequested.enable` | Enable least requested resource scoring | true |
| `nodeorder.mostrequested.enable` | Enable most requested resource scoring | false |
| `nodeorder.nodeaffinity.enable` | Enable node affinity scoring | true |
| `nodeorder.podaffinity.enable` | Enable pod affinity scoring | true |
| `nodeorder.balancedresource.enable` | Enable balanced resource scoring | true |
| `nodeorder.imagelocality.enable` | Enable image locality scoring | true |
| `nodeorder.leastrequested.weight` | Weight for least requested scoring | 1 |
| `nodeorder.mostrequested.weight` | Weight for most requested scoring | 1 |
| `nodeorder.nodeaffinity.weight` | Weight for node affinity scoring | 1 |
| `nodeorder.podaffinity.weight` | Weight for pod affinity scoring | 1 |
| `nodeorder.balancedresource.weight` | Weight for balanced resource scoring | 1 |
| `nodeorder.imagelocality.weight` | Weight for image locality scoring | 1 |

## Example

### Configuration for Spreading Workloads

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
        arguments:
          nodeorder.leastrequested.enable: true
          nodeorder.leastrequested.weight: 2
          nodeorder.balancedresource.enable: true
```

### Configuration for Consolidating Workloads

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
        arguments:
          nodeorder.mostrequested.enable: true
          nodeorder.mostrequested.weight: 2
          nodeorder.leastrequested.enable: false
```

### Job with Pod Affinity

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: affinity-job
spec:
  schedulerName: volcano
  minAvailable: 2
  tasks:
  - replicas: 2
    name: worker
    template:
      spec:
        affinity:
          podAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: cache
                topologyKey: kubernetes.io/hostname
        containers:
        - name: worker
          image: busybox
```

The Nodeorder plugin will score nodes higher if they already have pods matching the affinity rules.
