---
title: "Task-topology"
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
    arguments:
      task-topology.weight: 10
```

## Annotations

Configure task topology through annotations on the Job. The Volcano Job controller propagates these annotations to the PodGroup, from which the plugin reads them.

| Annotation | Description |
| --- | --- |
| `volcano.sh/task-topology-affinity` | Defines task groups that prefer the same node. Separate groups with semicolons (`;`) and task names within a group with commas (`,`), for example, `"ps,worker;ps,evaluator"`. A group containing one task name defines self-affinity between replicas of that task. |
| `volcano.sh/task-topology-anti-affinity` | Defines task groups that prefer different nodes. It uses the same group format, for example, `"ps;worker,chief"`. A group containing one task name defines self-anti-affinity between replicas of that task. |
| `volcano.sh/task-topology-task-order` | Defines the task allocation priority as a comma-separated list. Earlier task names have higher priority; for example, `"ps,worker"` prioritizes `ps` before `worker`. This annotation is optional and affects tasks that participate in an affinity or anti-affinity group. |

Task names in these annotations must match tasks in the Job, and a task name must not be repeated within the same group. Invalid topology annotations are ignored for the Job. Affinity and anti-affinity are scoring preferences rather than hard scheduling constraints.

## Example

### Job with Task Affinity

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-job
  annotations:
    volcano.sh/task-topology-affinity: "ps,worker"
    volcano.sh/task-topology-task-order: "ps,worker"
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
```

The plugin prioritizes `ps` tasks before `worker` tasks and gives nodes running tasks from the same affinity group a higher score.

### Job with Task Anti-affinity

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: ha-service
  annotations:
    volcano.sh/task-topology-anti-affinity: "master"
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
```

In this example, nodes that already run a `master` replica receive a lower score, so the two replicas prefer different nodes.