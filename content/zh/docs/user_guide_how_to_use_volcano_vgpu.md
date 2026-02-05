++
title = "Volcano vGPU 用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_volcano_vgpu/"
[menu.docs]
  parent = "user-guide"
++

## Volcano 中 GPU 共享模式背景

Volcano 在 vGPU 调度场景下支持 **两种 GPU 共享模式**：

### 1. HAMI-core（基于软件的 vGPU）

**说明：**

基于 **VCUDA** 技术，通过劫持 CUDA API 来限制 GPU 核心和显存用量，从而实现 **软件层面** 的 vGPU 切分。

**适用场景：**

适合需要 **细粒度 GPU 共享** 的环境，对 GPU 型号不敏感，可适配绝大多数 GPU。

---

### 2. Dynamic MIG（基于硬件的 GPU 切分）

**说明：**

利用 **NVIDIA MIG（Multi-Instance GPU）** 技术，将一块物理 GPU 划分为多个相互隔离的 GPU 实例，提供 **硬件级** 性能隔离与保障。

**适用场景：**

适合对性能敏感的工作负载，需要 **强隔离与稳定性能**，并要求 GPU 支持 MIG（如 A100、H100）。

---

GPU 共享模式是节点级配置。Volcano 支持 **异构集群**（例如部分节点使用 HAMI-core，另外一些节点使用 Dynamic MIG）。  
具体配置与模式说明请参考 [`volcano-vgpu-device-plugin`](https://github.com/Project-HAMi/volcano-vgpu-device-plugin)。

## 安装

要启用 vGPU 调度，需要根据选择的模式安装如下组件。

### 通用前置条件

- **前置依赖：**
  - NVIDIA 驱动 > 440
  - nvidia-docker > 2.0
  - Docker 已将 `nvidia` 配置为默认 runtime
  - Kubernetes >= 1.16
  - Volcano >= 1.9

- **安装 Volcano：**

  参考 [Volcano 安装指南](https://github.com/volcano-sh/volcano?tab=readme-ov-file#quick-start-guide)。

- **安装设备插件：**

  部署 [`volcano-vgpu-device-plugin`](https://github.com/Project-HAMi/volcano-vgpu-device-plugin)。

  > **注意：**[vgpu device plugin yaml](https://github.com/Project-HAMi/volcano-vgpu-device-plugin/blob/main/volcano-vgpu-device-plugin.yml) 中同时包含了 **节点 GPU 模式** 与 **MIG 几何切分配置**。更多参数说明请参考 [vgpu device plugin config](https://github.com/Project-HAMi/volcano-vgpu-device-plugin/blob/main/doc/config.md)。

- **校验可分配资源：**

  确认节点 `Allocatable` 中包含：

  ```yaml
  volcano.sh/vgpu-memory: "89424"
  volcano.sh/vgpu-number: "8"
  ```

- **调度器配置更新：**

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
        - name: predicates
        - name: deviceshare
          arguments:
            deviceshare.VGPUEnable: true          # 启用 vGPU 能力
            deviceshare.SchedulePolicy: binpack   # 调度策略：binpack / spread
  ```

  使用如下命令检查：

  ```bash
  kubectl get node {node-name} -o yaml
  ```

---

### HAMI-core 使用方式

- **Pod 示例：**

  ```yaml
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
          volcano.sh/vgpu-number: 1     # 请求 1 个 vGPU
          volcano.sh/vgpu-cores: 50     # （可选）每个 vGPU 占用 50% GPU 核心
          volcano.sh/vgpu-memory: 3000  # （可选）每个 vGPU 占用 3GB 显存
  ```

---

### Dynamic MIG 使用方式

- **开启 MIG 模式：**

  在支持 MIG 的 GPU 节点上执行：

  ```bash
  sudo nvidia-smi -mig 1
  ```

- **MIG 几何配置（可选）：**

  `volcano-vgpu-device-plugin` 会自动生成默认的 MIG 几何配置，保存在 `kube-system` 命名空间下的 `volcano-vgpu-device-config` ConfigMap 中；  
  用户可以按需调整。详情可参考 [vgpu device plugin yaml](https://github.com/Project-HAMi/volcano-vgpu-device-plugin/blob/main/volcano-vgpu-device-plugin.yml)。

- **带 MIG 注解的 Pod 示例：**

  ```yaml
  metadata:
    name: mig-pod
    annotations:
      volcano.sh/vgpu-mode: "mig"
  spec:
    schedulerName: volcano
    containers:
    - name: cuda-container
      image: nvidia/cuda:9.0-devel
      resources:
        limits:
          volcano.sh/vgpu-number: 1
          volcano.sh/vgpu-memory: 3000
  ```

> **说明：**实际分配的显存取决于最匹配的 MIG 切片。例如，请求 3GB 时，可能匹配到 5GB 的 MIG 实例。

---

## 调度模式选择

### 显式模式

- 使用注解 `volcano.sh/vgpu-mode` 显式指定使用 `hami-core` 或 `mig` 模式；
- 当注解缺失时，调度器会根据资源匹配情况与调度策略自动选择合适模式。

### 调度策略

- 通过 `deviceshare.SchedulePolicy` 配置整体调度策略：
  - `binpack`：倾向于将负载集中到更少的节点，提升资源利用率；
  - `spread`：倾向于将负载分散到更多节点，提升隔离与容错。

---

## 模式对比一览

| 模式        | 隔离级别          | 是否要求 MIG GPU | 是否必须注解 | 核心/显存控制      | 推荐场景                     |
| ----------- | ----------------- | ---------------- | ------------ | ------------------- | ---------------------------- |
| HAMI-core   | 软件（VCUDA）     | 否               | 否           | 是（VCUDA 控制）   | 一般工作负载、细粒度共享     |
| Dynamic MIG | 硬件级            | 是               | 是           | MIG 硬件限制       | 性能敏感作业、强隔离需求     |

---

## 监控

### 调度器指标

```bash
curl http://<volcano-scheduler-ip>:8080/metrics
```

### 设备插件指标

```bash
curl http://<plugin-pod-ip>:9394/metrics
```

指标中会包含 GPU 使用率、Pod 显存使用量以及资源限制等信息。

---

## 问题反馈与贡献

- 问题反馈：在 [Volcano Issues](https://github.com/volcano-sh/volcano/issues) 提交 Issue；
- 贡献代码：参考 GitHub 的 [Pull Request 指南](https://help.github.com/articles/using-pull-requests/) 发起 PR。

