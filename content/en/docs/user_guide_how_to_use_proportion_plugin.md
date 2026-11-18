+++
title = "Proportion Plugin User Guide"
date = 2024-05-10
type = "docs"
weight = 50
url = "/en/docs/user-guide/how_to_use_proportion_plugin/"
[menu.docs]
  parent = "user-guide"
+++

## Introduction

The Proportion scheduling plugin ensures fair resource sharing across different queues based on their configured weights. It dynamically controls the maximum resources a queue can consume, preventing a single team or workload from starving others in a multi-tenant cluster. When the cluster is under heavy load, the plugin allocates resources proportionally to each queue's weight.

## Environment setup

### Update scheduler configmap

1. Ensure the `proportion` plugin is enabled in the `volcano-scheduler-configmap`.
2. Define multiple `Queue` resources with different weights.

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
      - name: proportion
      - name: gang
```

## How to use Proportion Plugin

First, create the Queues with specific weights. The weight represents the relative share of the cluster's resources that the queue is entitled to.

### Step 1: Create Queues

Create a file named `queues.yaml`:

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: team-a-queue
spec:
  weight: 2
  capability:
    cpu: "10"
    memory: "20Gi"
---
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: team-b-queue
spec:
  weight: 1
  capability:
    cpu: "10"
    memory: "20Gi"
```
In this scenario, `team-a-queue` is entitled to twice as many resources as `team-b-queue` when there is resource contention.

### Step 2: Submit Jobs to the Queues

Create a file named `proportion-jobs.yaml`:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: job-team-a
spec:
  queue: team-a-queue
  schedulerName: volcano
  tasks:
    - replicas: 10
      name: worker
      template:
        spec:
          containers:
            - image: nginx
              name: nginx
              resources:
                requests:
                  cpu: "1"
          restartPolicy: OnFailure
---
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: job-team-b
spec:
  queue: team-b-queue
  schedulerName: volcano
  tasks:
    - replicas: 10
      name: worker
      template:
        spec:
          containers:
            - image: nginx
              name: nginx
              resources:
                requests:
                  cpu: "1"
          restartPolicy: OnFailure
```

## Verification

1. Apply the Queues and the Jobs:
   ```bash
   kubectl apply -f queues.yaml
   kubectl apply -f proportion-jobs.yaml
   ```

2. If your cluster has exactly 9 available CPUs, Volcano will schedule pods proportionally according to the queue weights (2:1).
   - `team-a-queue` (Weight 2) will get roughly 6 pods running.
   - `team-b-queue` (Weight 1) will get roughly 3 pods running.
   
3. You can verify this by checking the number of running pods for each job:
   ```bash
   kubectl get pods -l volcano.sh/job-name=job-team-a
   kubectl get pods -l volcano.sh/job-name=job-team-b
   ```
