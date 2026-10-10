+++
title = "Gang Plugin User Guide"
date = 2024-05-10
type = "docs"
weight = 50
url = "/en/docs/user-guide/how_to_use_gang_plugin/"
[menu.docs]
  parent = "user-guide"
+++

## Introduction

The Gang scheduling algorithm is one of the core scheduling plugins in Volcano. It meets the "All or nothing" scheduling requirements. This means that a group of pods (usually within a Job) will only be scheduled if the minimum required number of pods can be scheduled together. If the cluster does not have enough resources to satisfy the minimum number of running pods, none of them will be scheduled. This prevents resource deadlock where multiple jobs hold partial resources but none can complete.

## Environment setup

### Update scheduler configmap

To use the Gang plugin, ensure that the `gang` plugin is enabled in your Volcano Scheduler configuration (`volcano-scheduler-configmap`). 

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
        enablePreemptable: false
      - name: conformance
```

## How to use Gang Plugin

When you submit a `vcjob` (Volcano Job) or use a `PodGroup` with regular Pods, you can define the `minAvailable` field. The Gang plugin will check if the cluster has enough resources to satisfy this number of pods.

### Example 1: Using Volcano Job (vcjob)

Create a file named `gang-job.yaml` with the following content:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: gang-job
spec:
  minAvailable: 3
  schedulerName: volcano
  policies:
    - event: PodEvicted
      action: RestartJob
  tasks:
    - replicas: 3
      name: worker
      template:
        spec:
          containers:
            - image: nginx
              name: nginx
              resources:
                requests:
                  cpu: "1"
                  memory: "1Gi"
          restartPolicy: OnFailure
```

In this example, `minAvailable` is set to 3. The Gang plugin ensures that either all 3 workers are scheduled simultaneously, or none are.

### Example 2: Using PodGroup for generic Pods

You can also use the Gang plugin with native Kubernetes Pods by creating a `PodGroup`.

Create a file named `gang-podgroup.yaml`:

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: PodGroup
metadata:
  name: gang-pg
spec:
  minMember: 3
  queue: default
---
apiVersion: v1
kind: Pod
metadata:
  name: gang-pod-1
  labels:
    scheduling.volcano.sh/pod-group-name: gang-pg
spec:
  schedulerName: volcano
  containers:
    - name: nginx
      image: nginx
      resources:
        requests:
          cpu: "1"
---
apiVersion: v1
kind: Pod
metadata:
  name: gang-pod-2
  labels:
    scheduling.volcano.sh/pod-group-name: gang-pg
spec:
  schedulerName: volcano
  containers:
    - name: nginx
      image: nginx
      resources:
        requests:
          cpu: "1"
```

In this example, only 2 pods are submitted for a `PodGroup` that requires `minMember: 3`. The pods will remain in the `Pending` state until a 3rd pod belonging to `gang-pg` is created and enough resources are available.

## Verification

1. Apply the job to your cluster:
   ```bash
   kubectl apply -f gang-job.yaml
   ```

2. Check the status of the pods:
   ```bash
   kubectl get pods
   ```
   If the cluster has at least 3 CPUs and 3Gi of memory available, all 3 pods will transition to `Running`. If not, they will all remain in `Pending` due to the Gang scheduling constraint.
