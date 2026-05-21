+++
title = "Proportion"

date = 2021-05-13
lastmod = 2025-11-11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Proportion"
[menu.docs]
  parent = "plugins"
  weight = 8
+++

## Overview

The Proportion scheduling algorithm uses the concept of **Queue** to control the proportion of total resources allocated in the cluster. Each queue is allocated a certain proportion of cluster resources.

For example, if there are three teams sharing a pool of resources on a cluster:
- Team A can use up to 40% of the total cluster
- Team B can use up to 30%
- Team C can use up to 30%

If the amount of work delivered exceeds the team's maximum available resources, the jobs will be queued.

## How It Works

The Proportion plugin manages resource allocation based on queue configurations:

- **Queue Weight**: Each queue has a weight that determines its share of cluster resources
- **Capability**: Maximum resources a queue can use
- **Guarantee**: Minimum resources guaranteed to a queue
- **Deserved Resources**: Resources a queue should receive based on its weight

Key functions implemented:

- **QueueOrderFn**: Orders queues for scheduling based on their resource utilization
- **ReclaimableFn**: Determines if resources can be reclaimed from a queue
- **OverusedFn**: Checks if a queue is using more than its deserved share

## Scenario

The Proportion scheduling algorithm improves the flexibility and elasticity of cluster scheduling:

### Multi-team Resource Sharing

The most typical scenario is when multiple development teams in a company share a cluster. This scheduling algorithm handles the requirements of shared resource allocation and isolation between different departments very well.

### Multi-service Mixed Scenarios

In environments with diverse workloads:
- **Computation-intensive**: AI business
- **Network IO-intensive**: MPI and HPC business
- **Storage-intensive**: Big data business

The Proportion scheduling algorithm can allocate shared resources according to demand through matching.

## Configuration

### Queue Definition

First, create queues with appropriate resource allocations:

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: team-a-queue
spec:
  weight: 4
  capability:
    cpu: "40"
    memory: "80Gi"
---
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: team-b-queue
spec:
  weight: 3
  capability:
    cpu: "30"
    memory: "60Gi"
---
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: team-c-queue
spec:
  weight: 3
  capability:
    cpu: "30"
    memory: "60Gi"
```

### Scheduler Configuration

Enable the Proportion plugin in the scheduler:

```yaml
tiers:
- plugins:
  - name: priority
  - name: gang
- plugins:
  - name: drf
  - name: predicates
  - name: proportion
  - name: nodeorder
```

## Example

### Using Queues in VolcanoJob

Submit jobs to specific queues:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: team-a-job
spec:
  schedulerName: volcano
  queue: team-a-queue
  minAvailable: 2
  tasks:
  - replicas: 2
    name: worker
    template:
      spec:
        containers:
        - name: worker
          image: busybox
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
```

### Queue with Guarantee and Capability

Create a queue with both minimum guarantee and maximum capability:

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: production-queue
spec:
  weight: 5
  guarantee:
    resource:
      cpu: "10"
      memory: "20Gi"
  capability:
    cpu: "50"
    memory: "100Gi"
  reclaimable: true
```

In this configuration:
- The queue is guaranteed at least 10 CPUs and 20Gi memory
- It can use up to 50 CPUs and 100Gi memory when resources are available
- Resources can be reclaimed from this queue when other queues need them
