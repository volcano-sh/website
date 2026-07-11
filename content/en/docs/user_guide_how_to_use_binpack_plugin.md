+++
title = "Binpack Plugin User Guide"
date = 2024-05-10
type = "docs"
weight = 50
url = "/en/docs/user-guide/how_to_use_binpack_plugin/"
[menu.docs]
  parent = "user-guide"
+++

## Introduction

The Binpack plugin attempts to pack as many pods as possible onto a single node before moving on to the next. This minimizes the fragmentation of cluster resources and leaves larger, empty nodes available for future workloads that may require massive amounts of contiguous resources. By heavily utilizing a subset of nodes, it is also beneficial for cluster autoscalers to downscale completely empty nodes.

## Environment setup

### Update scheduler configmap

Ensure the `binpack` plugin is enabled and configured with weights for different resources in the `volcano-scheduler-configmap`.

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
      - name: binpack
        arguments:
          binpack.weight: 10
          binpack.cpu: 5
          binpack.memory: 5
```

The arguments dictate the relative importance of binpacking by CPU vs Memory.

## How to use Binpack Plugin

When you submit a workload to Volcano, the Binpack plugin automatically influences the node scoring phase.

### Example YAML

Create a file named `binpack-job.yaml`:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: binpack-job
spec:
  minAvailable: 1
  schedulerName: volcano
  queue: default
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
                  cpu: "500m"
                  memory: "500Mi"
          restartPolicy: OnFailure
```

## Verification

1. Apply the job to your cluster:
   ```bash
   kubectl apply -f binpack-job.yaml
   ```

2. Check the node assignment of the pods:
   ```bash
   kubectl get pods -o wide | grep binpack-job
   ```

3. **Expected Result**: Without Binpack (using standard Kubernetes spreading), the scheduler usually distributes pods evenly across all available nodes. With the Binpack plugin, you will observe that Volcano schedules pods densely onto `Node A` until it is completely full, and only then starts placing pods on `Node B`.
