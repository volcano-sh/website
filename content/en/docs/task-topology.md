+++
title = "Task-topology"

date = 2021-05-13
lastmod = 2025-11-11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Task-topology"
[menu.docs]
  parent = "plugins"
  weight = 9
+++

## Overview

The Task-topology algorithm computes the priority of tasks and nodes based on the affinity and anti-affinity configuration between tasks within a Job. By configuring the affinity and anti-affinity policies between tasks within the Job and using the Task-topology algorithm, tasks with affinity configurations can be scheduled to the same node first, while tasks with anti-affinity configurations are scheduled to different nodes.

## How It Works

The Task-topology plugin analyzes task relationships within a job and optimizes placement:

- **Affinity**: Tasks that benefit from being on the same node (e.g., for fast local communication)
- **Anti-affinity**: Tasks that should be on different nodes (e.g., for fault tolerance)

Key functions implemented:

- **TaskOrderFn**: Orders tasks based on topology preferences
- **NodeOrderFn**: Scores nodes based on how well they satisfy topology requirements

## Scenario

### Node Affinity

#### Deep Learning and TensorFlow

Task-topology is important for improving computational efficiency in deep learning computing scenarios. Using TensorFlow computation as an example, configure the affinity between "ps" (parameter server) and "worker". The Task-topology algorithm enables "ps" and "worker" to be scheduled to the same node as much as possible, improving the efficiency of network and data interaction between them, thus improving computing efficiency.

#### HPC and MPI

Tasks in HPC and MPI scenarios are highly synchronized and need high-speed network IO. Placing related tasks on the same node reduces network latency and improves performance.

### Anti-affinity

#### Parameter Server Distribution

In TensorFlow computation, anti-affinity between "ps" instances can ensure they are distributed across different nodes for better load distribution.

#### High Availability

E-commerce service scenarios benefit from anti-affinity for master-slave backup and data disaster tolerance, ensuring that backup jobs continue to provide service after a primary job fails.

## Configuration

Enable the Task-topology plugin in the scheduler:

```yaml
tiers:
- plugins:
  - name: priority
  - name: gang
- plugins:
  - name: predicates
  - name: nodeorder
  - name: task-topology
```

## Example

### Job with Task Affinity

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-job
spec:
  schedulerName: volcano
  minAvailable: 3
  policies:
  - event: PodEvicted
    action: RestartJob
  tasks:
  - replicas: 1
    name: ps
    policies:
    - event: TaskCompleted
      action: CompleteJob
    template:
      metadata:
        labels:
          role: ps
      spec:
        containers:
        - name: tensorflow
          image: tensorflow/tensorflow:latest
  - replicas: 2
    name: worker
    template:
      metadata:
        labels:
          role: worker
      spec:
        containers:
        - name: tensorflow
          image: tensorflow/tensorflow:latest
  plugins:
    env: []
    svc: []
  topologyPolicy:
    mode: affinity
    tiers:
    - tasks:
      - ps
      - worker
```

### Job with Task Anti-affinity

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: ha-service
spec:
  schedulerName: volcano
  minAvailable: 2
  tasks:
  - replicas: 2
    name: master
    template:
      spec:
        containers:
        - name: master
          image: my-service:latest
  topologyPolicy:
    mode: anti-affinity
    tiers:
    - tasks:
      - master
```

In this example, the two master replicas will be scheduled to different nodes to ensure high availability.
