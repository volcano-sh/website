+++
title = "Binpack Plugin User Guide"
date = 2026-03-30
type = "docs"
weight = 50
url = "/en/docs/user-guide/how_to_use_binpack_plugin/"
[menu.docs]
  parent = "user-guide"
+++

## Introduction

The binpack plugin implements a best-fit bin packing scheduling strategy in Volcano. Instead of spreading pods evenly across nodes (as the default Kubernetes scheduler tends to do), binpack scores nodes higher when they are already more utilized — preferring to fill up nodes before using new ones. This reduces resource fragmentation across the cluster and leaves fully free nodes available for large jobs that require them.

The plugin registers a `nodeOrderFn` and scores each node based on a weighted combination of CPU, memory, and optional extended resources (e.g. GPUs). The weight of each resource dimension is configurable, allowing administrators to tune the scoring to their workload profile.

Binpack is well suited for:
- **AI inference workloads** — single-task jobs that should be compacted to free up whole nodes for large training jobs
- **Big data pipelines** — short-lived query jobs in e-commerce or analytics that benefit from tight packing
- **GPU clusters** — preventing partial GPU node occupancy by consolidating workloads onto fewer nodes

For more detail on the scheduling algorithm, please see the [Plugins Introduction](../plugins/).

## Environment Setup

### Install Volcano

Refer to the [Install Guide](https://github.com/volcano-sh/volcano/blob/master/installer/README.md) to install Volcano.

After installation, update the scheduler configuration:

```shell
kubectl edit cm -n volcano-system volcano-scheduler-configmap
```

Make sure the `binpack` plugin is enabled under the second tier of plugins. It is included in the default Volcano scheduler config, but without custom arguments. Below is a minimal working configuration with binpack arguments explicitly set:

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
      - name: proportion
      - name: nodeorder
      - name: binpack
        arguments:
          binpack.weight: 10       # Overall weight of the binpack plugin in node scoring
          binpack.cpu: 5           # Weight assigned to CPU resource dimension
          binpack.memory: 1        # Weight assigned to memory resource dimension
```

### Plugin Arguments Reference

| Argument | Type | Default | Description |
|---|---|---|---|
| `binpack.weight` | int | 1 | Overall weight of the binpack plugin relative to other scoring plugins |
| `binpack.cpu` | int | 1 | Weight of CPU resource in binpack score calculation |
| `binpack.memory` | int | 1 | Weight of memory resource in binpack score calculation |
| `binpack.resources` | string | - | Comma-separated list of extended resource names (e.g. `nvidia.com/gpu`) |
| `binpack.resources.<name>` | int | 1 | Weight for a specific extended resource |

## Verify the Plugin is Active

After editing the ConfigMap, restart the Volcano scheduler to apply changes:

```shell
kubectl rollout restart deployment volcano-scheduler -n volcano-system
```

Confirm the scheduler picked up the new config:

```shell
kubectl logs -n volcano-system -l app=volcano-scheduler --tail=20
```

You should see a log line confirming the binpack plugin is registered.

## Example: Basic CPU and Memory Bin Packing

This example demonstrates binpack behavior using a 2-node cluster where each node has 4 CPU and 8Gi memory.

### Configure the Scheduler

Apply the following ConfigMap with binpack weights that heavily favor CPU packing:

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
      - name: proportion
      - name: nodeorder
      - name: binpack
        arguments:
          binpack.weight: 10
          binpack.cpu: 5
          binpack.memory: 1
```

### Submit a VcJob

Submit a VcJob with 4 tasks, each requesting 1 CPU and 1Gi memory:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: binpack-demo
spec:
  minAvailable: 4
  schedulerName: volcano
  queue: default
  tasks:
  - replicas: 4
    name: worker
    template:
      spec:
        containers:
        - name: nginx
          image: nginx:1.14.2
          resources:
            requests:
              cpu: "1"
              memory: "1Gi"
        restartPolicy: Never
```

### Expected Result

Without binpack, the 4 pods may be spread 2+2 across both nodes. With binpack enabled and a high CPU weight, the scheduler will pack pods onto node-1 first before spilling onto node-2.

```shell
$ kubectl get pods -o wide
NAME                    READY   STATUS    NODE
binpack-demo-worker-0   1/1     Running   node-1
binpack-demo-worker-1   1/1     Running   node-1
binpack-demo-worker-2   1/1     Running   node-1
binpack-demo-worker-3   1/1     Running   node-1
```

node-2 remains fully free, available for a large job requiring its full capacity.

## Example: GPU Bin Packing

For GPU clusters, it is critical to avoid fragmented GPU allocation where multiple nodes are partially occupied and neither can satisfy a large training job. Configure binpack with a high GPU weight:

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
    - plugins:
      - name: drf
      - name: predicates
      - name: proportion
      - name: nodeorder
      - name: binpack
        arguments:
          binpack.weight: 10
          binpack.cpu: 2
          binpack.memory: 2
          binpack.resources: "nvidia.com/gpu"
          binpack.resources.nvidia.com/gpu: 8   # GPU has the highest weight
```

Submit a GPU job:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: gpu-binpack-demo
spec:
  minAvailable: 2
  schedulerName: volcano
  queue: default
  tasks:
  - replicas: 2
    name: gpu-worker
    template:
      spec:
        containers:
        - name: cuda-container
          image: nvidia/cuda:11.0-base
          resources:
            requests:
              nvidia.com/gpu: "1"
            limits:
              nvidia.com/gpu: "1"
        restartPolicy: Never
```

### Expected Result

With high GPU weight, both GPU pods are scheduled onto the same node if possible, keeping the second GPU node fully free:

```shell
$ kubectl get pods -o wide
NAME                       READY   STATUS    NODE
gpu-binpack-demo-worker-0  1/1     Running   gpu-node-1
gpu-binpack-demo-worker-1  1/1     Running   gpu-node-1
```

## Notes

- Binpack works at the **scoring stage** — it does not filter nodes, only ranks them. All nodes that pass the predicates filter are still candidates; binpack only affects which gets the highest score.
- Binpack and `nodeorder` both register `nodeOrderFn`. When used together (the default), their scores are combined. The relative influence of each is controlled by `binpack.weight` and the `nodeorder` weights respectively.
- Setting `binpack.weight` to `0` effectively disables the plugin's influence without removing it from config.
- For AI training clusters, a high `binpack.resources.nvidia.com/gpu` weight (e.g. `8`) is recommended to prevent GPU fragmentation. See [NVIDIA's case study](https://developer.nvidia.com/blog/practical-tips-for-preventing-gpu-fragmentation-for-volcano-scheduler/) for a real-world example achieving ~90% GPU occupancy using this approach.
