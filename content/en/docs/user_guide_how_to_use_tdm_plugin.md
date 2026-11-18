+++
title = "TDM Plugin User Guide"
date = 2024-05-10
type = "docs"
weight = 50
url = "/en/docs/user-guide/how_to_use_tdm_plugin/"
[menu.docs]
  parent = "user-guide"
+++

## Introduction

TDM (Time Division Multiplexing) is a plugin designed for co-located environments where a single set of nodes is shared across different orchestration frameworks (like Kubernetes and Hadoop YARN). The TDM plugin enables time-sharing by marking certain nodes as "revocable". Preemptable workloads can be scheduled on these nodes during specific time windows. When the time window ends, Volcano evicts these workloads to return the resources to the primary framework.

## Environment setup

### Update scheduler configmap

1. Enable the `tdm` plugin in the `volcano-scheduler-configmap`.
2. Ensure you have nodes that you intend to share.

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
      - name: tdm
      - name: gang
```

## How to use TDM Plugin

You must configure the nodes and the workloads to interact with the TDM plugin.

### Step 1: Label the Nodes

Label the nodes that you want to share with the TDM revocable label:
```bash
kubectl label nodes <your-shared-node> volcano.sh/revocable-zone=true
```

You must also annotate the node with the specific time window during which Volcano is allowed to use it. For example, to allow Volcano to use the node between 00:00 (midnight) and 08:00 AM:
```bash
kubectl annotate nodes <your-shared-node> volcano.sh/revocable-zone.time-window="00:00-08:00"
```

### Step 2: Create a Preemptable Job

Create a file named `tdm-job.yaml`:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tdm-batch-job
  annotations:
    volcano.sh/preemptable: "true"
spec:
  minAvailable: 1
  schedulerName: volcano
  tasks:
    - replicas: 2
      name: worker
      template:
        spec:
          containers:
            - image: nginx
              name: nginx
          restartPolicy: OnFailure
```

The annotation `volcano.sh/preemptable: "true"` signals to the TDM plugin that this workload is non-critical and can be scheduled on revocable nodes.

## Verification

1. Ensure the current system time is *within* the `time-window` you annotated on the node.
2. Apply the job:
   ```bash
   kubectl apply -f tdm-job.yaml
   ```
3. The pods will be successfully scheduled onto the revocable node.
4. **The Eviction Phase**: When the system clock passes the end of the time window (e.g., it turns 08:01 AM), the TDM plugin will actively evict the pods running on that node, returning the resources to the cluster so the other framework (e.g., YARN) can use them.
