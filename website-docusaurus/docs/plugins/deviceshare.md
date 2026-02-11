---
title: "Device Share Plugin"
sidebar_position: 3
---

### Device Share

#### Overview

The Device Share plugin manages the sharing and allocation of device resources such as GPUs, NPUs, and other accelerators. It supports multiple device types including NVIDIA GPUs (both GPU sharing and vGPU), Ascend NPUs, and provides flexible scheduling policies for device allocation. The plugin enables efficient utilization of expensive accelerator resources through sharing capabilities.

#### Features

- **GPU Sharing**: Enable sharing of GPU resources among multiple pods
- **GPU Number**: Schedule based on the number of GPUs requested
- **vGPU Support**: Support for virtual GPU (vGPU) allocation
- **Ascend NPU Support**: Support for Ascend NPU devices including MindCluster VNPU and HAMi VNPU
- **Node Locking**: Optional node-level locking to prevent concurrent device allocations
- **Flexible Scheduling Policies**: Configurable scoring policies for device allocation
- **Batch Node Scoring**: Support for batch scoring of nodes for NPU devices

#### Configuration

The Device Share plugin can be configured with the following arguments:

```yaml
actions: "allocate, backfill"
tiers:
- plugins:
  - name: deviceshare
    arguments:
      deviceshare.GPUSharingEnable: true
      deviceshare.GPUNumberEnable: false
      deviceshare.VGPUEnable: false
      deviceshare.NodeLockEnable: false
      deviceshare.SchedulePolicy: "binpack"
      deviceshare.ScheduleWeight: 10
      deviceshare.AscendMindClusterVNPUEnable: false
      deviceshare.AscendHAMiVNPUEnable: false
      deviceshare.KnownGeometriesCMName: "volcano-vgpu-device-config"
      deviceshare.KnownGeometriesCMNamespace: "kube-system"
```

##### Configuration Parameters

- **deviceshare.GPUSharingEnable** (bool): Enable GPU sharing mode
- **deviceshare.GPUNumberEnable** (bool): Enable GPU number-based scheduling (mutually exclusive with GPUSharingEnable)
- **deviceshare.VGPUEnable** (bool): Enable vGPU support (mutually exclusive with GPU sharing)
- **deviceshare.NodeLockEnable** (bool): Enable node-level locking for device allocation
- **deviceshare.SchedulePolicy** (string): Scheduling policy for device scoring (e.g., "binpack", "spread")
- **deviceshare.ScheduleWeight** (int): Weight for device scoring in node ordering
- **deviceshare.AscendMindClusterVNPUEnable** (bool): Enable Ascend MindCluster VNPU support
- **deviceshare.AscendHAMiVNPUEnable** (bool): Enable Ascend HAMi VNPU support
- **deviceshare.KnownGeometriesCMName** (string): ConfigMap name for vGPU geometries
- **deviceshare.KnownGeometriesCMNamespace** (string): Namespace for vGPU geometries ConfigMap

#### Device Types

##### NVIDIA GPU Sharing

Enable GPU sharing to allow multiple pods to share a single GPU:

```yaml
- name: deviceshare
  arguments:
    deviceshare.GPUSharingEnable: true
    deviceshare.ScheduleWeight: 10
```

Pods request GPU resources using:

```yaml
resources:
  requests:
    nvidia.com/gpu: 2  # Request 2 GPU units (out of 100 per GPU)
  limits:
    nvidia.com/gpu: 2
```

##### NVIDIA GPU Number

Schedule based on the number of physical GPUs:

```yaml
- name: deviceshare
  arguments:
    deviceshare.GPUNumberEnable: true
    deviceshare.ScheduleWeight: 10
```

Pods request whole GPUs:

```yaml
resources:
  requests:
    nvidia.com/gpu: 1  # Request 1 whole GPU
  limits:
    nvidia.com/gpu: 1
```

##### vGPU

Enable virtual GPU support:

```yaml
- name: deviceshare
  arguments:
    deviceshare.VGPUEnable: true
    deviceshare.ScheduleWeight: 10
    deviceshare.KnownGeometriesCMName: "volcano-vgpu-device-config"
    deviceshare.KnownGeometriesCMNamespace: "kube-system"
```

##### Ascend NPU

Enable Ascend NPU support:

```yaml
- name: deviceshare
  arguments:
    deviceshare.AscendMindClusterVNPUEnable: true
    # or
    deviceshare.AscendHAMiVNPUEnable: true
    deviceshare.ScheduleWeight: 10
```

#### Scenario

The Device Share plugin is suitable for:

- **GPU Clusters**: Clusters with NVIDIA GPU resources requiring efficient sharing
- **AI Training**: Machine learning training workloads requiring GPU acceleration
- **Multi-tenant GPU Sharing**: Environments where multiple users need access to GPU resources
- **NPU Workloads**: Workloads running on Ascend NPU devices
- **Cost Optimization**: Maximizing utilization of expensive accelerator hardware

#### Examples

##### Example 1: GPU Sharing for Small Workloads

Configure GPU sharing for workloads that don't require full GPU resources:

```yaml
- name: deviceshare
  arguments:
    deviceshare.GPUSharingEnable: true
    deviceshare.SchedulePolicy: "binpack"
    deviceshare.ScheduleWeight: 10
```

##### Example 2: Whole GPU Allocation

Configure for workloads requiring full GPU resources:

```yaml
- name: deviceshare
  arguments:
    deviceshare.GPUNumberEnable: true
    deviceshare.SchedulePolicy: "spread"
    deviceshare.ScheduleWeight: 10
```

##### Example 3: vGPU with Custom ConfigMap

Configure vGPU with custom geometry configuration:

```yaml
- name: deviceshare
  arguments:
    deviceshare.VGPUEnable: true
    deviceshare.ScheduleWeight: 10
    deviceshare.KnownGeometriesCMName: "custom-vgpu-config"
    deviceshare.KnownGeometriesCMNamespace: "gpu-system"
```

#### Notes

- GPU sharing and GPU number modes are mutually exclusive
- GPU sharing and vGPU cannot be enabled simultaneously
- Node locking prevents race conditions in device allocation
- The plugin automatically registers supported devices based on configuration
- Batch scoring is used for NPU devices to optimize allocation decisions
