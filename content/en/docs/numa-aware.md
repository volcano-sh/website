+++
title = "Numa-aware"

date = 2021-05-13
lastmod = 2025-11-11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Numa-aware"
[menu.docs]
  parent = "plugins"
  weight = 14
+++

## Overview

When a node runs many CPU-bound pods, the workload can move to different CPU cores depending on whether the pod is throttled and which CPU cores are available at scheduling time. Many workloads are not sensitive to this migration and work fine without any intervention. However, in workloads where CPU cache affinity and scheduling latency significantly affect workload performance, special CPU management policies are needed to determine placement preferences on the node.

## The Challenge

The CPU Manager and Topology Manager are Kubelet components that help with CPU placement. However, they have the following limitations:

1. **Scheduler Unawareness**: The scheduler is not topology-aware. This means a pod might be scheduled on a node only to fail due to the Topology Manager. This is unacceptable for TensorFlow jobs—if any worker or parameter server fails on a node, the entire job will fail.

2. **Node-level Only**: These managers operate at the node level, which results in an inability to match the best node for NUMA topology across the entire cluster.

## How Numa-aware Plugin Works

The Numa-aware plugin aims to address these limitations:

- **CPU Resource Topology Scheduling**: Supports scheduling based on CPU topology
- **Pod-level Topology Policies**: Supports topology policies at the pod level

The plugin:
1. Collects NUMA topology information from nodes
2. Evaluates CPU and memory placement requirements
3. Scores nodes based on NUMA affinity
4. Ensures tasks are placed on nodes that can satisfy their topology requirements

## Scenario

Common scenarios for NUMA-aware scheduling are computation-intensive jobs that are sensitive to CPU parameters and scheduling delays:

### Scientific Computing

High-performance scientific calculations benefit from NUMA-aware scheduling to ensure optimal memory access patterns.

### Video Processing

Video decoding workloads can achieve better performance when scheduled with NUMA awareness.

### Animation Rendering

Animation rendering jobs that are CPU-intensive benefit from optimized CPU and memory placement.

### Big Data Offline Processing

Large-scale data processing jobs can achieve better throughput with NUMA-optimized scheduling.

## Configuration

### Enable Topology Manager on Nodes

First, ensure the Kubelet is configured with topology management:

```yaml
# kubelet configuration
topologyManagerPolicy: single-numa-node
cpuManagerPolicy: static
```

### Scheduler Configuration

Enable the Numa-aware plugin:

```yaml
tiers:
- plugins:
  - name: priority
  - name: gang
- plugins:
  - name: predicates
  - name: nodeorder
  - name: numa-aware
    arguments:
      numa-aware.weight: 10
```

### Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `numa-aware.weight` | Weight of NUMA-aware scoring | 1 |

## Example

### Node with NUMA Topology

A typical NUMA node might have:
- 2 NUMA nodes
- Each with 16 CPU cores
- Each with 64GB memory

```
NUMA Node 0: CPU 0-15, 64GB Memory
NUMA Node 1: CPU 16-31, 64GB Memory
```

### Job Requiring NUMA Awareness

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: numa-aware-job
spec:
  schedulerName: volcano
  minAvailable: 1
  tasks:
  - replicas: 1
    name: compute
    template:
      metadata:
        annotations:
          volcano.sh/numa-topology-policy: single-numa-node
      spec:
        containers:
        - name: compute
          image: compute-intensive-app:latest
          resources:
            requests:
              cpu: "8"
              memory: "32Gi"
            limits:
              cpu: "8"
              memory: "32Gi"
```

In this example:
- The job requests 8 CPUs and 32GB memory
- The NUMA policy requires all resources from a single NUMA node
- The scheduler will find a node that can satisfy this requirement from a single NUMA node

### Pod with Topology Policy Annotation

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: numa-sensitive-pod
  annotations:
    volcano.sh/numa-topology-policy: best-effort
spec:
  schedulerName: volcano
  containers:
  - name: app
    image: myapp:latest
    resources:
      requests:
        cpu: "4"
        memory: "16Gi"
      limits:
        cpu: "4"
        memory: "16Gi"
```

### NUMA Topology Policies

The plugin supports several topology policies:

| Policy | Description |
|--------|-------------|
| `none` | No NUMA preference |
| `best-effort` | Try to place on optimal NUMA node, but don't fail if not possible |
| `restricted` | Only place on nodes that can satisfy the NUMA requirement |
| `single-numa-node` | All resources must come from a single NUMA node |
