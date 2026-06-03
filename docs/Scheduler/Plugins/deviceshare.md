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
  - plugins:
      - name: overcommit
      - name: drf
      - name: predicates
      - name: proportion
      - name: nodeorder
      - name: binpack
```

> **Note:** For specific guides on how to configure your workloads to request shared GPUs or NPUs, please refer to the dedicated guides for [GPU Sharing](../UserGuide/user_guide_how_to_use_gpu_sharing) and [vNPU](../UserGuide/user_guide_how_to_use_vnpu).
