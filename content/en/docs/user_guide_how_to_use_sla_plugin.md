+++
title = "SLA Plugin User Guide"
date = 2024-05-10
type = "docs"
weight = 50
url = "/en/docs/user-guide/how_to_use_sla_plugin/"
[menu.docs]
  parent = "user-guide"
+++

## Introduction

The SLA (Service Level Agreement) plugin is designed to prevent job starvation. Users can specify the maximum amount of time a job is allowed to wait in the `Pending` state. Once a job reaches its SLA timeout, the SLA plugin will boost its priority to ensure it gets scheduled as soon as possible, potentially preempting other jobs if necessary.

## Environment setup

### Update scheduler configmap

Enable the `sla` plugin in the scheduler configuration. Ensure `preempt` is in the action list so the SLA plugin can forcibly make room for starved jobs.

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: volcano-scheduler-configmap
  namespace: volcano-system
data:
  volcano-scheduler.conf: |
    actions: "enqueue, allocate, preempt, backfill"
    tiers:
    - plugins:
      - name: priority
      - name: sla
      - name: gang
```

## How to use SLA Plugin

You can define the SLA requirements directly on the Volcano `Job` using annotations.

### Example YAML

Create a file named `sla-job.yaml`:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: sla-job
  annotations:
    scheduling.volcano.sh/jobWaitingTime: "5m"
spec:
  minAvailable: 1
  schedulerName: volcano
  tasks:
    - replicas: 1
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

In this configuration, the annotation `scheduling.volcano.sh/jobWaitingTime: "5m"` tells the SLA plugin that this job should not wait in the queue for more than 5 minutes. 

## Verification

1. Fill up your cluster with low-priority, long-running jobs so there are no free resources.
2. Submit the `sla-job.yaml`.
3. Monitor the job:
   ```bash
   kubectl get vcjob sla-job
   ```
4. Initially, the job will be in the `Pending` state because the cluster is full.
5. Wait for 5 minutes.
6. Once the 5-minute `jobWaitingTime` is breached, the SLA plugin kicks in. It will boost the `sla-job`'s priority. The scheduler will then preempt (evict) a running pod from another job to free up resources, allowing `sla-job` to finally transition to `Running`.
