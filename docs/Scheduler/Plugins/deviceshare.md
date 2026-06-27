---
title: DeviceShare
---

## Introduction

The **DeviceShare Plugin** is an advanced resource scheduling plugin in Volcano that provides a common framework for sharing specialized hardware devices (like GPUs, NPUs, FPGAs) across multiple pods. 

Rather than implementing fragmented logic for each new hardware accelerator, Volcano exposes a unified `Devices` interface. The `deviceshare` plugin leverages this interface to perform robust allocation, node filtering, and resource tracking for shared devices.

## Mechanism

The DeviceShare plugin works in conjunction with device-specific implementations. It exposes standard scheduling operations such as `Predicate` (filtering nodes based on available device capacity) and `Allocate`/`Release` (assigning portions of a device to specific pods).

Currently, the `deviceshare` plugin serves as the underlying engine powering features like:
- **GPU Sharing**: Allowing multiple pods to request fractions of a single physical GPU's memory.
- **vGPU and vNPU**: Virtualizing accelerator slices.
- **GPU Exclusive**: Restricting a pod to exclusively own a GPU to avoid contention.

## Configuration and Usage

The `deviceshare` plugin is typically enabled implicitly when you enable device sharing predicates in the Volcano scheduler config map. However, if you are developing custom device sharing logic or need to explicitly declare it, it can be configured in your `volcano-scheduler-configmap`:

```yaml
actions: "enqueue, allocate, backfill"
tiers:
  - plugins:
      - name: priority
      - name: gang
      - name: conformance
      - name: deviceshare   # Enable the device share framework plugin
        arguments:
          deviceshare.GPUSharingEnable: true
          deviceshare.VGPUEnable: true
  - plugins:
      - name: overcommit
      - name: drf
      - name: predicates
      - name: proportion
      - name: nodeorder
      - name: binpack
```

## Arguments

The `deviceshare` plugin supports several arguments to configure specific hardware accelerator behaviors and scheduling policies:

| Argument | Type | Default | Description |
| --- | --- | --- | --- |
| `deviceshare.GPUSharingEnable` | bool | false | Enables GPU sharing, allowing multiple pods to request fractions of a single physical GPU. |
| `deviceshare.GPUNumberEnable` | bool | false | Enables GPU number scheduling, allowing pods to request a specific number of exclusive GPUs. |
| `deviceshare.VGPUEnable` | bool | false | Enables vGPU (Virtual GPU) scheduling. |
| `deviceshare.AscendHAMiVNPUEnable` | bool | false | Enables Ascend vNPU scheduling via the HAMi (Heterogeneous AI Computing Virtualization Middleware) mode. |
| `deviceshare.AscendMindClusterVNPUEnable` | bool | false | Enables Ascend vNPU scheduling via the official MindCluster mode. |
| `deviceshare.SchedulePolicy` | string | `binpack` | Defines the node scoring policy for shared devices. Supports `binpack` (pack workloads densely onto devices) and `spread` (distribute workloads evenly across devices). |
| `deviceshare.ScheduleWeight` | int | 1 | The weight multiplier applied to the `SchedulePolicy` score during the NodeOrder scoring phase. |
| `deviceshare.KnownGeometriesCMName` | string | `hami-scheduler-device` | Specifies the ConfigMap name used to store known device geometries and topologies. |
| `deviceshare.KnownGeometriesCMNamespace` | string | `kube-system` | Specifies the namespace where the KnownGeometries ConfigMap is located. |


> **Note:** For specific guides on how to configure your workloads to request shared GPUs or NPUs, please refer to the dedicated guides for [GPU Sharing](../../UserGuide/user_guide_how_to_use_gpu_sharing) and [vNPU](../../UserGuide/user_guide_how_to_use_vnpu). For vGPU and MIG configurations, see [GPU Virtualization](../../KeyFeatures/GPUVirtualization).
