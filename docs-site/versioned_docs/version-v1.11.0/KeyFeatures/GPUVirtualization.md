---
title: "GPU Virtualization"
---

## Background Knowledge of GPU Sharing Modes in Volcano

As AI applications proliferate, the demand for GPUs has surged due to their critical role in training complex models and executing high-performance inference. However, the high cost of GPUs necessitates maximizing their utilization in cloud-native environments. A common challenge is inefficient provisioning: a single GPU may be over-provisioned for smaller workloads or underutilized by larger ones that don't fully saturate its capacity.


Volcano addresses this by providing robust virtual GPU (vGPU) scheduling capabilities, facilitating efficient sharing of physical GPUs among multiple containers and jobs. This significantly improves GPU utilization, reduces operational costs, and offers greater flexibility for diverse AI/ML workloads.


Volcano simplifies GPU virtualization, enabling users to leverage advanced sharing mechanisms with minimal effort. Users simply define the desired GPU resources within their pod or job specifications, and Volcano manages the underlying orchestration.

### HAMI-core (Software-based vGPU)

**Description**:
Leverages **VCUDA**, a CUDA API hijacking technique to enforce GPU core and memory usage limits, enabling **software-level virtual GPU slicing**.

**Use case**:
Ideal for environments requiring **fine-grained GPU sharing**. Compatible with all GPU types.

> GPU Sharing is a node configuration. See [volcano-vgpu-device-plugin](https://github.com/Project-HAMi/volcano-vgpu-device-plugin) for configuration and details.

## Installation

To enable vGPU scheduling, the following components must be set up based on the selected mode:

### Common Requirements

**Prerequisites**:

  * NVIDIA driver > 440
  * nvidia-docker > 2.0
  * Docker configured with `nvidia` as the default runtime
  * Kubernetes >= 1.16
  * Volcano >= 1.9

- **Install Volcano**:

  * Follow instructions in [Volcano Installer Guide](https://github.com/volcano-sh/volcano?tab=readme-ov-file#quick-start-guide)

- **Install Device Plugin**:

  * Deploy [`volcano-vgpu-device-plugin`](https://github.com/Project-HAMi/volcano-vgpu-device-plugin)

  **Note:** the [vgpu device plugin yaml](https://github.com/Project-HAMi/volcano-vgpu-device-plugin/blob/main/volcano-vgpu-device-plugin.yml) also includes the ***Node GPU mode*** and the ***MIG geometry*** configuration. Please refer to the [vgpu device plugin config](https://github.com/Project-HAMi/volcano-vgpu-device-plugin/blob/main/doc/config.md).

- **Validate Setup**:
  Ensure node allocatable resources include:

<pre><code class="language-yaml">
  volcano.sh/vgpu-memory: "89424"
  volcano.sh/vgpu-number: "8"
</code></pre>

- **Scheduler Config Update**:

<pre><code class="language-yaml">
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
      - name: predicates
      - name: deviceshare
        arguments:
          deviceshare.VGPUEnable: true   # enable vgpu plugin
          deviceshare.SchedulePolicy: binpack  # scheduling policy. binpack / spread
</code></pre>

Check with:

```bash
kubectl get node {node-name} -o yaml
```

### HAMI-core Usage

**Pod Spec**:

<pre><code class="language-yaml">
metadata:
  name: hami-pod
  annotations:
    volcano.sh/vgpu-mode: "hami-core"
spec:
  schedulerName: volcano
  containers:
  - name: cuda-container
    image: nvidia/cuda:9.0-devel
    resources:
      limits:
        volcano.sh/vgpu-number: 1    # requesting 1 gpu cards
        volcano.sh/vgpu-cores: 50    # (optional)each vGPU uses 50%
        volcano.sh/vgpu-memory: 3000 # (optional)each vGPU uses 3G GPU memory
</code></pre>

