---
title: DeviceShare
---

## 介绍

**DeviceShare Plugin** 是 Volcano 中的高级资源调度插件，它提供了一个通用框架，用于跨多个 Pod 共享专用硬件设备（如 GPU、NPU、FPGA）。

Volcano 没有为每个新的硬件加速器实现碎片化的逻辑，而是公开了一个统一的“设备”接口。 “deviceshare”插件利用此接口对共享设备执行稳健的分配、节点过滤和资源跟踪。

## 机制

DeviceShare 插件与特定于设备的实现结合使用。它公开了标准调度操作，例如“Predicate”（根据可用设备容量过滤节点）和“Allocate”/“Release”（将设备的一部分分配给特定的 Pod）。

目前，“deviceshare”插件充当底层引擎，支持以下功能：
- **GPU 共享**：允许多个 Pod 请求单个物理 GPU 内存的一部分。
- **vGPU 和 vNPU**：虚拟化加速器切片。
- **GPU Exclusive**：限制 Pod 独占 GPU 以避免争用。

## 配置与使用

当您在 Volcano 调度程序配置映射中启用设备共享谓词时，通常会隐式启用“deviceshare”插件。但是，如果您正在开发自定义设备共享逻辑或需要显式声明它，则可以在“volcano-scheduler-configmap”中进行配置：

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

> **注意：** 有关如何配置工作负载以请求共享 GPU 或 NPU 的具体指南，请参阅 [GPU 共享](../../UserGuide/user_guide_how_to_use_gpu_sharing) 和 [vNPU](../../UserGuide/user_guide_how_to_use_vnpu) 的专用指南。