---
title: "Task Topology"
---

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

## Environment Setup

### Install Volcano

Refer to [Install Guide](https://github.com/volcano-sh/volcano/blob/master/installer/README.md) to install volcano.

### Update Scheduler Configmap

After installed, update the scheduler configuration:

```shell
kubectl edit configmap -n volcano-system volcano-scheduler-configmap
```

Register `task-topology` plugin in configmap:

```yaml
kind: ConfigMap
apiVersion: v1
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
      - name: conformance
    - plugins:
      - name: drf
      - name: predicates
      - name: task-topology
        arguments:
          task-topology.weight: 10
      - name: proportion
      - name: nodeorder
      - name: binpack
```

## Annotation-based Configuration

You can configure task topology using annotations on your Volcano Job or TensorFlow Job:

1. `volcano.sh/task-topology-affinity` — indicates that tasks have connections between each other, so they should be set on same nodes.
2. `volcano.sh/task-topology-anti-affinity` — indicates that tasks do not have connections between each other, so they should be set on different nodes.
3. `volcano.sh/task-topology-task-order` — indicates the order that tasks should be allocated. **This annotation is optional.**

```yaml
volcano.sh/task-topology-affinity: "ps,worker;ps,evaluator"
volcano.sh/task-topology-anti-affinity: "ps;worker,chief;chief,evaluator"
volcano.sh/task-topology-task-order: "ps,worker,chief,evaluator"
```

## Examples

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

## Legacy Annotation Usage

In older versions (or when using specific operators like `kubeflow/tf-operator`), Task Topology can also be configured using annotations on the Job or Pod.

### Update scheduler configmap

Register the `task-topology` plugin and configure the weight:

```yaml
    - plugins:
      - name: task-topology
        arguments:
          task-topology.weight: 10
```

### Configure via Annotations

Take tensorflow job as a sample:

1. Add annotations in the volcano job or tensorflow job in the format below:
   1. `affinity` annotation indicates that tasks have connections between each other, so they should be set on same nodes;
   2. `anti-affinity` annotation indicates that tasks do not have connections between each other, so they should be set on different nodes;
   3. `task-order` annotation indicates the order that tasks should be allocated. For example, `ps,worker` means scheduler should schedule `ps` tasks first. After all `ps` tasks are allocated, the scheduler starts to schedule `worker` tasks. **This annotation is not a required field.**

```yaml
    volcano.sh/task-topology-affinity: "ps,worker;ps,evaluator"
    volcano.sh/task-topology-anti-affinity: "ps;worker,chief;chief,evaluator"
    volcano.sh/task-topology-task-order: "ps,worker,chief,evaluator"
```