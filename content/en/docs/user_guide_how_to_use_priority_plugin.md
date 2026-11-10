+++
title = "Priority Plugin User Guide"
date = 2024-05-10
type = "docs"
weight = 50
url = "/en/docs/user-guide/how_to_use_priority_plugin/"
[menu.docs]
  parent = "user-guide"
+++

## Introduction

The Priority plugin allows Volcano to schedule Pods and Jobs based on their assigned priority. It introduces preemptive capabilities: if a high-priority Job is submitted and the cluster lacks sufficient resources, Volcano will preempt (evict) lower-priority Jobs to free up resources for the high-priority Job. This is essential for ensuring that critical workloads always run.

## Environment setup

### Update scheduler configmap

1. Ensure the `priority` plugin is enabled in your `volcano-scheduler-configmap`.
2. Ensure the `preempt` and `reclaim` actions are enabled if you want high-priority jobs to evict lower-priority ones.

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: volcano-scheduler-configmap
  namespace: volcano-system
data:
  volcano-scheduler.conf: |
    actions: "enqueue, allocate, preempt, reclaim, backfill"
    tiers:
    - plugins:
      - name: priority
      - name: gang
```

## How to use Priority Plugin

To use the Priority plugin, you must first create a `PriorityClass` object in Kubernetes, and then assign that `PriorityClass` to your `vcjob` or Pods.

### Step 1: Create Priority Classes

Create a file named `priority-classes.yaml`:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
globalDefault: false
description: "This priority class should be used for critical service pods only."
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 1000
globalDefault: false
description: "This priority class should be used for background data processing."
```

### Step 2: Create Jobs with Priorities

Create a file named `priority-jobs.yaml`:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: low-priority-job
spec:
  minAvailable: 1
  schedulerName: volcano
  priorityClassName: low-priority
  tasks:
    - replicas: 5
      name: worker
      template:
        spec:
          containers:
            - image: nginx
              name: nginx
              resources:
                requests:
                  cpu: "2"
          restartPolicy: OnFailure
---
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: high-priority-job
spec:
  minAvailable: 1
  schedulerName: volcano
  priorityClassName: high-priority
  tasks:
    - replicas: 2
      name: worker
      template:
        spec:
          containers:
            - image: nginx
              name: nginx
              resources:
                requests:
                  cpu: "2"
          restartPolicy: OnFailure
```

## Verification

1. Assume your cluster has exactly **10 CPUs** available.
2. Apply the PriorityClasses:
   ```bash
   kubectl apply -f priority-classes.yaml
   ```
3. Apply *only* the low priority job first:
   ```bash
   # Extract and apply the low-priority-job from priority-jobs.yaml
   kubectl apply -f priority-jobs.yaml
   ```
4. Wait for the `low-priority-job` pods to start running. They will consume all 10 CPUs (5 replicas * 2 CPUs).
5. Now, monitor the pods:
   ```bash
   kubectl get pods -w
   ```
6. The `high-priority-job` is applied. Because the cluster is full, Volcano will notice the `high-priority-job` is waiting and will trigger the `preempt` action.
7. You will observe that two `low-priority-job` pods are evicted (terminated) to free up 4 CPUs. Immediately after, the two `high-priority-job` pods will be scheduled and transition to `Running`.
