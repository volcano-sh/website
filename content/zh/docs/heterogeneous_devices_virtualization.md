+++
title = "异构设备虚拟化"

date = 2025-05-29
lastmod = 2025-05-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
toc_depth = 5
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
[menu.docs]
  parent = "features"
  weight = 8
+++

# GPU 虚拟化

## 背景

随着AI应用的日益普及，对GPU的需求也随之激增。GPU作为模型训练与推理任务的核心组件，其重要性不言而喻。然而，GPU成本高昂，如何在云原生环境下最大化其利用率，已成为业界关注的焦点。在实际应用中，常出现以下情况：对于小型工作负载，单个GPU可能造成资源浪费；而对于大型工作负载，单个GPU的算力又可能未被充分挖掘。

为应对这一挑战，Volcano通过提供强大的虚拟GPU (vGPU)调度能力，实现了物理GPU在多个容器和作业间的有效共享。这不仅能显著提升GPU利用率、降低运营成本，也为各类AI/ML工作负载带来了更灵活的资源调度方案。

Volcano致力于简化GPU虚拟化的复杂度，使用户能便捷地运用这些高级共享机制。用户只需在Pod或作业的配置中声明所需的GPU资源及期望的切分方式，Volcano便能自动完成底层的资源编排工作。

Volcano主要支持以下两种GPU共享模式，用以实现vGPU调度并满足不同的硬件能力与性能需求：


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


## 调度器模式选择

* **显式指定模式**：

  * 通过Pod注解`volcano.sh/vgpu-mode`来强制指定HAMI-core或MIG模式。
  * 若未指定该注解，调度器将依据资源匹配度及预设策略自动选择合适的模式。

* **调度策略影响**：

  * 调度策略（如`binpack`或`spread`）会影响vGPU Pod在节点间的分布。

## 总结表

| 模式        | 隔离级别       | 是否依赖MIG GPU | 需注解指定模式 | 核心/显存控制方式     | 推荐应用场景               |
| ----------- | -------------- | --------------- | ------------ | ------------------- | -------------------------- |
| HAMI-core   | 软件 (VCUDA)   | 否              | 否           | 用户自定义 (核心/显存) | 通用型工作负载             |
| Dynamic MIG | 硬件 (MIG)     | 是              | 是           | MIG实例规格决定       | 对性能敏感的工作负载       |


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


## 问题和贡献

* 提交Issue：[Volcano Issues](https://github.com/volcano-sh/volcano/issues)
* 贡献代码：[Pull Request指南](https://help.github.com/articles/using-pull-requests/)


# NPU 虚拟化

## 简介

Volcano 支持 **两种 vNPU 模式** 来共享 Ascend 设备：

---

### 1. MindCluster 模式

**说明**:

早期版本的 [MindCluster](https://gitcode.com/Ascend/mind-cluster)（官方 Ascend 集群调度插件）需要对 Volcano 进行自定义修改并重新编译，并且仅兼容 Volcano release1.7 和 release1.9。这使得其使用较为复杂，并限制了用户获取新版 Volcano 的功能。

为了解决这些问题，我们已将其针对 Ascend vNPU 的核心调度逻辑集成到 Volcano 的原生 device-share 插件中。该插件专门用于调度和共享异构资源（如 GPU 和 NPU）。这种集成方式可以通过以下流程直接使用 vNPU 功能，同时保持与最新 Volcano 功能的完全兼容性。

**使用场景**:

适用于 Ascend 310 系列 vNPU 集群
后续将支持更多芯片类型

---

### 2. HAMi 模式

**说明**：

该模式由第三方社区 “HAMi” 开发，该社区也是 [volcano-vgpu](./how_to_use_volcano_vgpu.md) 功能的开发者。
HAMi 模式支持 Ascend 310 与 Ascend 910 的 vNPU 功能，并支持异构 Ascend 集群（即包含多种 Ascend 芯片型号，如 910A、910B2、910B3、310P）。

**使用场景**：

Ascend 910 系列的 NPU 和 vNPU 集群  
Ascend 310 系列的 NPU 和 vNPU 集群  
异构 Ascend 集群  

---

## 安装

要启用 vNPU 调度功能，需要根据选择的模式部署以下组件：


**环境要求**:

Kubernetes >= 1.16  
Volcano >= 1.14  
[ascend-docker-runtime](https://gitcode.com/Ascend/mind-cluster/tree/master/component/ascend-docker-runtime) (for HAMi Mode)

### 安装 Volcano:

请参考 Volcano [安装指南](https://github.com/volcano-sh/volcano?tab=readme-ov-file#quick-start-guide)

### 安装 ascend-device-plugin 与第三方组件

在此步骤中，需要根据选择的 vNPU 模式选择不同的 ascend-device-plugin。
MindCluster 模式需要额外安装来自 Ascend 的组件。

---

#### MindCluster 模式

##### 安装第三方组件

请参考官方 [Ascend 文档](https://www.hiascend.com/document/detail/zh/mindcluster/72rc1/clustersched/dlug/mxdlug_start_006.html#ZH-CN_TOPIC_0000002470358262__section1837511531098)安装以下组件：

- NodeD
- Ascend Device Plugin
- Ascend Docker Runtime
- ClusterD
- Ascend Operator

> **Note:** 请跳过上述文档中提到的 `ascend-volcano` 安装步骤，因为我们已在上面安装了来自 Volcano 社区的原生 Volcano。

**Ascend Device Plugin 配置修改:**

安装 `ascend-device-plugin` 时，需要在 `device-plugin-310P-volcano-v{version}.yaml` 文件中将 `presetVirtualDevice` 参数置为 `"false"` 以启用 310P 的虚拟化:

```yaml
...
args: [
  "device-plugin",
  "-useAscendDocker=true",
  "-volcanoType=true",
  "-presetVirtualDevice=false",
  "-logFile=/var/log/mindx-dl/devicePlugin/devicePlugin.log",
  "-logLevel=0"
]
...
```
详细信息请参考官方 [Ascend MindCluster 文档](https://www.hiascend.com/document/detail/zh/mindcluster/72rc1/clustersched/dlug/cpaug_0020.html)

##### 调度器配置更新
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
          deviceshare.AscendMindClusterVNPUEnable: true   # enable ascend vnpu
    configurations:
    ...
    - name: init-params
      arguments: {"grace-over-time":"900","presetVirtualDevice":"false"}  # 启用动态虚拟化需要将presetVirtualDevice设置为false
```

---

#### HAMi 模式

##### 给节点打标签 `ascend=on`

```
kubectl label node {ascend-node} ascend=on
```

##### 部署 `hami-scheduler-device` ConfigMap

```
kubectl apply -f https://raw.githubusercontent.com/Project-HAMi/ascend-device-plugin/refs/heads/main/ascend-device-configmap.yaml
```

##### 部署 ascend-device-plugin

```
kubectl apply -f https://raw.githubusercontent.com/Project-HAMi/ascend-device-plugin/refs/heads/main/ascend-device-plugin.yaml
```

更多信息请参考 [ascend-device-plugin 文档](https://github.com/Project-HAMi/ascend-device-plugin).

##### 调度器配置更新
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
          deviceshare.AscendHAMiVNPUEnable: true   # enable ascend vnpu
          deviceshare.SchedulePolicy: binpack  # scheduling policy. binpack / spread
          deviceshare.KnownGeometriesCMNamespace: kube-system
          deviceshare.KnownGeometriesCMName: hami-scheduler-device
```

  **注意：** 你可能注意到 `volcano-vgpu` 也有自己的 `GeometriesCMName` 和 `GeometriesCMNamespace`。如果希望在同一 Volcano 集群中同时使用 vNPU 和 vGPU，需要将双方的 configMap 合并，并在此处设置。

## 使用方法

不同模式下的使用方法有所不同

---

### MindCluster 模式

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: mindx-dls
  namespace: vnpu
  labels:
    ring-controller.atlas: ascend-310P
spec:
  minAvailable: 1
  schedulerName: volcano
  policies:
    - event: PodEvicted
      action: RestartJob
  plugins:
    ssh: []
    env: []
    svc: []
  maxRetry: 3
  queue: default
  tasks:
    - name: "default-test"
      replicas: 1
      template:
        metadata:
          labels:
            app: infers
            ring-controller.atlas: ascend-310P
            vnpu-dvpp: "null"
            vnpu-level: low
        spec:
          schedulerName: volcano
          containers:
            - name: resnet50infer
              image: swr.cn-south-1.myhuaweicloud.com/ascendhub/mindie:2.1.RC1-300I-Duo-py311-openeuler24.03-lts
              imagePullPolicy: IfNotPresent
              securityContext:
                privileged: false
              command: ["/bin/bash", "-c", "tail -f /dev/null"]
              resources:
                requests:
                  huawei.com/npu-core: 8
                limits:
                  huawei.com/npu-core: 8
          nodeSelector:
            host-arch: huawei-arm

```

支持的 Ascend 芯片及其 `ResourceName` 如下表所示:

| 芯片型号 | JobLabel 和 TaskLabel             | ResourceName |
|-------|------------------------------------|-------|
| 310P3 | ring-controller.atlas: ascend-310P | huawei.com/npu-core |

**虚拟化任务 YAML 中的标签说明**

| **健**                   | **值**       | **说明**                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------- | --------------- |-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **vnpu-level**            | **low**         | 低配置（默认）。选择最低配置的虚拟实例模板                                                                                                                                                                                                                                                                                |
|                           | **high**        | 性能优先。当集群资源充足时，调度器会选择最高配置的虚拟实例模板。当集群中大多数物理 NPU 已部分被使用，仅剩少量 AI Core 时，调度器会根据剩余可用 Core 数自动选择合适的模板，而不是强制使用高规格模板。 |
| **vnpu-dvpp**             | **yes**         | Pod 使用 DVPP                                                                                                                                                                                                                                                                                                                                                                                                          |
|                           | **no**          | Pod 不使用 DVPP                                                                                                                                                                                                                                                                                                                                                                                                  |
|                           | **null**        | 默认值。不考虑 DVPP 使用情况                                                                                                                                                                                                                                                                                                                                           |
| **ring-controller.atlas** | **ascend-310P** | 表示任务使用 Atlas 推理系列产品                                                                                                                                                                                                                                                                                                                                                      |

**DVPP 与 Level 组合配置的效果**

| **产品型号**                       | **请求 AI Core 数** | **vnpu-dvpp** | **vnpu-level**       | **降级** | **选择模板** |
| --------------------------------------- | --------------------------- |---------------| -------------------- | ------------- | --------------------- |
| **Atlas Inference Series (8 AI Cores)** | **1**                       | `null`        | Any value            | –             | `vir01`               |
|                                         | **2**                       | `null`        | `low` / other values | –             | `vir02_1c`            |
|                                         | **2**                       | `null`        | `high`               | No            | `vir02`               |
|                                         | **2**                       | `null`        | `high`               | Yes           | `vir02_1c`            |
|                                         | **4**                       | `yes`         | `low` / other values | –             | `vir04_4c_dvpp`       |
|                                         | **4**                       | `no`          | `low` / other values | –             | `vir04_3c_ndvpp`      |
|                                         | **4**                       | `null`        | `low` / other values | –             | `vir04_3c`            |
|                                         | **4**                       | `yes`         | `high`               | –             | `vir04_4c_dvpp`       |
|                                         | **4**                       | `no`          | `high`               | –             | `vir04_3c_ndvpp`      |
|                                         | **4**                       | `null`        | `high`               | No            | `vir04`               |
|                                         | **4**                       | `null`        | `high`               | Yes           | `vir04_3c`            |
|                                         | **8 or multiples of 8**     | Any value     | Any value            | –             | –                     |


**注意**

对于 **芯片虚拟化（非整卡使用）**，`vnpu-dvpp` 的值必须与上表中对应项严格匹配。否则，任务将无法被调度。


详细信息请参考官方 [Ascend MindCluster 文档](https://www.hiascend.com/document/detail/zh/mindcluster/72rc1/clustersched/dlug/cpaug_0020.html)

---

### HAMi 模式

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ascend-pod
spec:
  schedulerName: volcano
  containers:
    - name: ubuntu-container
      image: swr.cn-south-1.myhuaweicloud.com/ascendhub/ascend-pytorch:24.0.RC1-A2-1.11.0-ubuntu20.04
      command: ["sleep"]
      args: ["100000"]
      resources:
        limits:
          huawei.com/Ascend310P: "1"
          huawei.com/Ascend310P-memory: "4096"

```

支持的 Ascend 芯片及其 `ResourceNames` 如下表所示:

| 芯片型号 | ResourceName | ResourceMemoryName |
|-------|-------|-------|
| 910A | huawei.com/Ascend910A | huawei.com/Ascend910A-memory |
| 910B2 | huawei.com/Ascend910B2 | huawei.com/Ascend910B2-memory |
| 910B3 | huawei.com/Ascend910B3 | huawei.com/Ascend910B3-memory |
| 910B4 | huawei.com/Ascend910B4 | huawei.com/Ascend910B4-memory |
| 910B4-1 | huawei.com/Ascend910B4-1 | huawei.com/Ascend910B4-1-memory |
| 310P3 | huawei.com/Ascend310P | huawei.com/Ascend310P-memory |