+++
title = "GPU Scheduling and Resource Management"
linktitle = "GPU Scheduling"
date = 2026-02-11
publishdate = 2026-02-11
lastmod = 2026-02-11
draft = false
toc = true
type = "docs"

[menu.docs]
  parent = "tutorial-series"
  weight = 30
+++

This tutorial covers how to efficiently manage GPU resources using Volcano, including fractional GPU sharing (vGPU) and hardware-based isolation (MIG).

## Background

GPUs are high-performance but expensive resources. In standard Kubernetes, a physical GPU is typically treated as an indivisible unit—one GPU can only be assigned to one container. This often leads to significant underutilization, especially for smaller workloads like model inference or development tasks that don't require the full compute power or memory of a modern GPU.

Volcano addresses this by providing robust **vGPU (virtual GPU) scheduling**. This allows you to:

- **Fractional Sharing**: Slice a single physical GPU into multiple virtual GPUs (vGPUs).
- **Resource Isolation**: Enforce specific compute (cores) and memory limits for each container sharing the physical hardware.
- **Multiple Modes**: Support both software based slicing (via VCUDA) and hardware based isolation (via NVIDIA MIG).

## Scenario

Suppose you have a cluster where multiple users need to run lightweight inference tasks. Instead of dedicating one physical GPU to each user, you can partition each GPU to support multiple users simultaneously.

In this tutorial, you will deploy a Volcano Job that requests a fractional share of a GPU: **20% of the compute power** and **2000MiB of memory**.

## Prerequisites

Before you begin, ensure you have:
- A Kubernetes cluster with nodes equipped with NVIDIA GPUs.
- The [NVIDIA Container Toolkit](https://github.com/NVIDIA/nvidia-container-toolkit) installed on your nodes.
- Volcano installed and the `volcano-vgpu-device-plugin` deployed.

## Deployment Step-by-Step

### 1. Create the GPU Sharing Manifest

Create a file named `gpu-sharing-job.yaml` with the following content:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: gpu-sharing-tutorial
spec:
  minAvailable: 1
  schedulerName: volcano
  tasks:
    - name: gpu-task
      replicas: 1
      template:
        spec:
          containers:
            - name: gpu-container
              image: nvidia/cuda:11.0-base
              command: ["sh", "-c", "nvidia-smi && sleep 3600"]
              resources:
                limits:
                  volcano.sh/vgpu-number: 1    # Request 1 virtual GPU
                  volcano.sh/vgpu-memory: 2000 # Limit to 2000MiB of GPU memory
                  volcano.sh/vgpu-cores: 20    # Limit to 20% of GPU compute
          restartPolicy: Never
```

### 2. Apply the Manifest

Run the following command to deploy the job:

```bash
kubectl apply -f gpu-sharing-job.yaml
```

## Verification

### Check Resource Allocation

Verify that your pod has been scheduled to a node with available vGPU resources:

```bash
kubectl get pods -l volcano.sh/job-name=gpu-sharing-tutorial
```

### Inspect the Container

Check the logs to verify that the container correctly detects the GPU environment via `nvidia-smi`:

```bash
kubectl logs gpu-sharing-tutorial-completion-task-0
```

Even though it is a shared physical GPU, the `volcano-vgpu-device-plugin` ensures the container only utilizes the allocated memory and compute slices.

## Notes

- **Insufficient Resources**: If pods remain `Pending` with "insufficient volcano.sh/vgpu-number", check if your nodes are correctly labeled and the `volcano-vgpu-device-plugin` is healthy.
- **Memory Limits**: If your application fails with Out of Memory (OOM) on the GPU, ensure the `vgpu-memory` limit is large enough for your specific model requirements.
- **Hardware Isolation**: For mission critical workloads requiring strict hardware level isolation, consider using **Dynamic MIG** mode if your hardware supports it (e.g., A100/H100).

## Tutorial Series

- **[Distributed TensorFlow](/en/docs/tutorial-tensorflow/)**: Orchestrate high-performance ML training jobs with parameter servers and workers.
- **[Apache Spark](/en/docs/tutorial-spark/)**: Prevent resource starvation in big data processing pipelines.
- **[Multi-tenancy](/en/docs/tutorial-multi-tenancy/)**: Configure fair share scheduling and hierarchical queues for different teams.
- **[Argo Workflows](/en/docs/tutorial-argo-workflows/)**: Integrate Volcano's advanced scheduling into your CI/CD and data pipelines.

Back to basics? Check out our **[Quick Start](/en/docs/tutorials/)** 