+++
title = "Predicates Plugin User Guide"
date = 2024-05-10
type = "docs"
weight = 50
url = "/en/docs/user-guide/how_to_use_predicates_plugin/"
[menu.docs]
  parent = "user-guide"
+++

## Introduction

The Predicates plugin is the primary filtering engine for Volcano. It evaluates each node against the requirements of a pod to filter out nodes that are fundamentally incapable of running the pod. This includes checking if a node has enough CPU/Memory available, evaluating node selectors, matching node affinities, and checking if the node has the requested GPUs.

## Environment setup

### Update scheduler configmap

The `predicates` plugin is a fundamental plugin and should almost always be enabled in your `volcano-scheduler-configmap`.

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
      - name: predicates
      - name: gang
```

## How to use Predicates Plugin

You do not need to do anything special to "trigger" the Predicates plugin. It automatically evaluates standard Kubernetes pod constraints.

### Example YAML (Filtering by NodeSelector)

Create a file named `predicates-job.yaml`:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: predicates-job
spec:
  minAvailable: 1
  schedulerName: volcano
  tasks:
    - replicas: 1
      name: worker
      template:
        spec:
          nodeSelector:
            accelerator: nvidia-tesla-v100
          containers:
            - image: nginx
              name: nginx
              resources:
                requests:
                  cpu: "1"
          restartPolicy: OnFailure
```

In this example, the `nodeSelector` requires a node with the label `accelerator=nvidia-tesla-v100`. The Predicates plugin will filter out all nodes in the cluster that do not have this exact label.

## Verification

1. Apply the job:
   ```bash
   kubectl apply -f predicates-job.yaml
   ```

2. If you do not have any nodes labeled with `accelerator=nvidia-tesla-v100`, the pod will remain in the `Pending` state.

3. Describe the pod to see the Predicates plugin at work:
   ```bash
   kubectl describe pod -l volcano.sh/job-name=predicates-job
   ```
   You will see an event from the Volcano scheduler stating that 0 nodes were available because none matched the node selector.

4. Label a node to satisfy the predicate:
   ```bash
   kubectl label nodes <your-node-name> accelerator=nvidia-tesla-v100
   ```
   The Predicates plugin will now allow this node to pass the filter, and the pod will be scheduled.
