+++
title = "GPU虚拟化"

date = 2025-05-29
lastmod = 2025-05-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
toc_depth = 5
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
[menu.v1-12-0]
  parent = "features"
  weight = 8
+++

## 背景

随着AI应用的日益普及，对GPU的需求也随之激增。GPU作为模型训练与推理任务的核心组件，其重要性不言而喻。然而，GPU成本高昂，如何在云原生环境下最大化其利用率，已成为业界关注的焦点。在实际应用中，常出现以下情况：对于小型工作负载，单个GPU可能造成资源浪费；而对于大型工作负载，单个GPU的算力又可能未被充分挖掘。

为应对这一挑战，Volcano通过提供强大的虚拟GPU (vGPU)调度能力，实现了物理GPU在多个容器和作业间的有效共享。这不仅能显著提升GPU利用率、降低运营成本，也为各类AI/ML工作负载带来了更灵活的资源调度方案。

Volcano致力于简化GPU虚拟化的复杂度，使用户能便捷地运用这些高级共享机制。用户只需在Pod或作业的配置中声明所需的GPU资源及期望的切分方式，Volcano便能自动完成底层的资源编排工作。

Volcano主要支持以下两种GPU共享模式，用以实现vGPU调度并满足不同的硬件能力与性能需求：

---

### 1. HAMI-core（基于软件的vGPU）

**描述**：
通过VCUDA (一种CUDA API劫持技术) 对GPU核心与显存的使用进行限制，从而实现软件层面的虚拟GPU切片。

**使用场景**：
适用于需要细粒度GPU共享的场景，兼容所有类型的GPU。

### 2. Dynamic MIG（硬件级GPU切片）

**描述**：
采用NVIDIA的MIG (Multi-Instance GPU)技术，可将单个物理GPU分割为多个具备硬件级性能保障的隔离实例。

**使用场景**：
尤其适用于对性能敏感的工作负载，要求GPU支持MIG特性（如A100、H100系列）。

> Dynamic MIG的设计文档请参考：[dynamic-mig](https://github.com/volcano-sh/volcano/blob/master/docs/design/dynamic-mig.md)

> GPU共享模式属于节点级别的配置。Volcano支持异构集群，即集群中可同时包含采用HAMI-core模式的节点和采用Dynamic MIG模式的节点。更多配置及详情，请参阅[volcano-vgpu-device-plugin](https://github.com/Project-HAMi/volcano-vgpu-device-plugin)。

---

## 安装

若需启用vGPU调度功能，请根据所选模式配置以下组件：

### 通用要求

**环境依赖**：

  * NVIDIA驱动 > 440
  * nvidia-docker > 2.0
  * Docker已配置`nvidia`为默认运行时
  * Kubernetes >= 1.16
  * Volcano >= 1.9

- **安装Volcano**：

  * 具体步骤请参照[Volcano安装指南](https://github.com/volcano-sh/volcano?tab=readme-ov-file#quick-start-guide)。

- **安装设备插件**：

  * 部署[`volcano-vgpu-device-plugin`](https://github.com/Project-HAMi/volcano-vgpu-device-plugin)。

  **说明：**[vgpu设备插件的YAML文件](https://github.com/Project-HAMi/volcano-vgpu-device-plugin/blob/main/volcano-vgpu-device-plugin.yml)中亦包含***节点GPU模式***及***MIG实例规格***等相关配置。详情请参阅[vgpu设备插件配置文档](https://github.com/Project-HAMi/volcano-vgpu-device-plugin/blob/main/doc/config.md)。

- **验证部署**：
  请确保节点的可分配资源（Allocatable Resources）中包含以下信息：

<pre><code class="language-yaml">
  volcano.sh/vgpu-memory: "89424"
  volcano.sh/vgpu-number: "8"
</code></pre>

- **更新调度器配置**：

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
          deviceshare.VGPUEnable: true   # 启用vgpu插件
          deviceshare.SchedulePolicy: binpack  # 调度策略：binpack / spread
</code></pre>

可通过以下命令检查：

```bash
kubectl get node {node-name} -o yaml
```

---

### HAMI-core使用方法

**Pod配置示例**：

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
        volcano.sh/vgpu-number: 1    # 请求1张GPU卡
        volcano.sh/vgpu-cores: 50    # (可选)每个vGPU使用50%核心
        volcano.sh/vgpu-memory: 3000 # (可选)每个vGPU使用3G显存
</code></pre>

---

### Dynamic MIG使用方法

- **启用MIG模式**：

若需启用MIG (Multi-Instance GPU)模式，请在目标GPU节点上执行以下命令：

```bash
sudo nvidia-smi -mig 1
```

- **MIG实例规格配置（可选）**：

`volcano-vgpu-device-plugin`会自动生成一套初始MIG配置，并存储于`kube-system`命名空间下的`volcano-vgpu-device-config` ConfigMap中。用户可按需自定义此配置。更多详情请参阅[vgpu设备插件YAML文件](https://github.com/Project-HAMi/volcano-vgpu-device-plugin/blob/main/volcano-vgpu-device-plugin.yml)。

- **带MIG注解的Pod配置示例**：

<pre><code class="language-yaml">
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
</code></pre>

注意：实际分配的显存大小取决于最匹配的MIG实例规格（例如：请求3GB显存，可能会分配到规格为5GB的MIG实例）。

---

## 调度器模式选择

* **显式指定模式**：

  * 通过Pod注解`volcano.sh/vgpu-mode`来强制指定HAMI-core或MIG模式。
  * 若未指定该注解，调度器将依据资源匹配度及预设策略自动选择合适的模式。

* **调度策略影响**：

  * 调度策略（如`binpack`或`spread`）会影响vGPU Pod在节点间的分布。

---

## 总结表

| 模式        | 隔离级别       | 是否依赖MIG GPU | 需注解指定模式 | 核心/显存控制方式     | 推荐应用场景               |
| ----------- | -------------- | --------------- | ------------ | ------------------- | -------------------------- |
| HAMI-core   | 软件 (VCUDA)   | 否              | 否           | 用户自定义 (核心/显存) | 通用型工作负载             |
| Dynamic MIG | 硬件 (MIG)     | 是              | 是           | MIG实例规格决定       | 对性能敏感的工作负载       |

---

## 监控

* **调度器监控指标**：

```bash
curl http://<volcano-scheduler-ip>:8080/metrics
```

* **设备插件监控指标**：

```bash
curl http://<plugin-pod-ip>:9394/metrics
```

监控指标包括GPU利用率、各Pod的显存使用量及限制等。

---

## 问题和贡献

* 提交Issue：[Volcano Issues](https://github.com/volcano-sh/volcano/issues)
* 贡献代码：[Pull Request指南](https://help.github.com/articles/using-pull-requests/)
