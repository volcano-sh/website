+++
title = "DRF Plugin User Guide"
date = 2024-05-10
type = "docs"
weight = 50
url = "/en/docs/user-guide/how_to_use_drf_plugin/"
[menu.docs]
  parent = "user-guide"
+++

## Introduction

The DRF (Dominant Resource Fairness) scheduling plugin allocates resources based on the dominant resource requested by a job. The dominant resource is the resource type (e.g., CPU or Memory) that takes up the largest percentage of the total cluster capacity. The DRF algorithm calculates the dominant resource share for each job and prioritizes jobs with the lowest share, ensuring fairness across multiple resource types.

This is highly effective in mixed workloads where some jobs are CPU-intensive and others are memory-intensive.

## Environment setup

### Update scheduler configmap

Ensure the `drf` plugin is enabled in the `volcano-scheduler-configmap` under the `tiers` section.

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
      - name: drf
```

## How to use DRF Plugin

DRF works automatically out of the box when enabled. To see DRF in action, we can create two jobs in the same queue: one that is CPU-intensive and another that is Memory-intensive.

### Example YAML

Create a file named `drf-jobs.yaml`:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: cpu-heavy-job
spec:
  minAvailable: 1
  schedulerName: volcano
  queue: default
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
                  memory: "500Mi"
          restartPolicy: OnFailure
---
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: mem-heavy-job
spec:
  minAvailable: 1
  schedulerName: volcano
  queue: default
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
                  cpu: "500m"
                  memory: "4Gi"
          restartPolicy: OnFailure
```

### How DRF Balances Resources

If the total cluster capacity is 10 CPUs and 20Gi Memory:
- `cpu-heavy-job` requests 2 CPUs (20% of cluster CPU) and 500Mi Memory (2.5% of cluster Memory) per pod. Its dominant resource is CPU.
- `mem-heavy-job` requests 500m CPUs (5% of cluster CPU) and 4Gi Memory (20% of cluster Memory) per pod. Its dominant resource is Memory.

As Volcano schedules pods, the DRF plugin constantly recalculates the dominant resource share for both jobs. If `cpu-heavy-job` has 2 pods running (40% CPU share) and `mem-heavy-job` has 1 pod running (20% Memory share), DRF will prioritize the next pod from `mem-heavy-job` because its dominant resource share is currently lower.

## Verification

1. Submit both jobs simultaneously:
   ```bash
   kubectl apply -f drf-jobs.yaml
   ```

2. Monitor the scheduling order:
   ```bash
   kubectl get pods -w
   ```

3. You will observe that Volcano interleaves the scheduling of pods from both jobs to keep their dominant resource shares roughly equal, rather than starving one job entirely while the other finishes.
