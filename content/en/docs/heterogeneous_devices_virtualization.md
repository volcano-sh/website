+++
title = "Heterogeneous Devices Virtualization"

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

# GPU Virtualization

## Background Knowledge of GPU Sharing Modes in Volcano

As AI applications proliferate, the demand for GPUs has surged due to their critical role in training complex models and executing high-performance inference. However, the high cost of GPUs necessitates maximizing their utilization in cloud-native environments. A common challenge is inefficient provisioning: a single GPU may be over-provisioned for smaller workloads or underutilized by larger ones that don't fully saturate its capacity.


Volcano addresses this by providing robust virtual GPU (vGPU) scheduling capabilities, facilitating efficient sharing of physical GPUs among multiple containers and jobs. This significantly improves GPU utilization, reduces operational costs, and offers greater flexibility for diverse AI/ML workloads.


Volcano simplifies GPU virtualization, enabling users to leverage advanced sharing mechanisms with minimal effort. Users simply define the desired GPU resources and preferred slicing method within their pod or job specifications, and Volcano manages the underlying orchestration.

Volcano supports **two primary GPU sharing modes** to accommodate varying hardware capabilities and performance requirements.

### 1. HAMI-core (Software-based vGPU)

**Description**:
Leverages **VCUDA**, a CUDA API hijacking technique to enforce GPU core and memory usage limits, enabling **software-level virtual GPU slicing**.

**Use case**:
Ideal for environments requiring **fine-grained GPU sharing**. Compatible with all GPU types.

### 2. Dynamic MIG (Hardware-level GPU Slicing)

**Description**:
Utilizes **NVIDIA's MIG (Multi-Instance GPU)** technology to partition a physical GPU into isolated instances with **hardware-level performance guarantees**.

**Use case**:
Best for **performance-sensitive** workloads. Requires **MIG-capable GPUs** (e.g., A100, H100).

> The design document of Dynamic MIG can refer to: [dynamic-mig](https://github.com/volcano-sh/volcano/blob/master/docs/design/dynamic-mig.md)

> GPU Sharing mode is a node configuration. Volcano supports heterogeneous cluster(i.e a part of node uses HAMi-core while another part uses dynamic MIG), See [volcano-vgpu-device-plugin](https://github.com/Project-HAMi/volcano-vgpu-device-plugin) for configuration and details.

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

### Dynamic MIG Usage

- **Enable MIG Mode**:

If you need to use MIG (Multi-Instance GPU), you must run the following command on the GPU node.

```bash
sudo nvidia-smi -mig 1
```

- **Geometry Config(Optional)**:

The volcano-vgpu-device-plugin automatically generates an initial MIG configuration, 
which is stored in the `volcano-vgpu-device-config` ConfigMap under the `kube-system` namespace. 
You can customize this configuration as needed. For more details, refer to the [vgpu device plugin yaml](https://github.com/Project-HAMi/volcano-vgpu-device-plugin/blob/main/volcano-vgpu-device-plugin.yml).

- **Pod Spec with MIG Annotation**:

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

Note: Actual memory allocated depends on best-fit MIG slice (e.g., request 3GB → 5GB slice used).

## Scheduler Mode Selection

* **Explicit Mode**:

  * Use annotation `volcano.sh/vgpu-mode` to force hami-core or MIG mode.
  * If annotation is absent, scheduler selects mode based on resource fit and policy.

* **Scheduling Policy**:

  * Modes like `binpack` or `spread` influence node selection.

## Summary Table

| Mode        | Isolation        | MIG GPU Required | Annotation | Core/Memory Control | Recommended For            |
| ----------- | ---------------- | ---------------- | ---------- | ------------------- | -------------------------- |
| HAMI-core   | Software (VCUDA) | No               | No         | Yes                 | General workloads          |
| Dynamic MIG | Hardware         | Yes              | Yes        | MIG-controlled      | Performance-sensitive jobs |


## Monitoring

* **Scheduler Metrics**:

```bash
curl http://<volcano-scheduler-ip>:8080/metrics
```

* **Device Plugin Metrics**:

```bash
curl http://<plugin-pod-ip>:9394/metrics
```

Metrics include GPU utilization, pod memory usage, and limits.

## Issues and Contributions

* File bugs: [Volcano Issues](https://github.com/volcano-sh/volcano/issues)
* Contribute: [Pull Requests Guide](https://help.github.com/articles/using-pull-requests/)



# NPU Virtualization

## Introduction

Volcano supports **two vNPU modes** for sharing Ascend devices:

---

### 1. MindCluster mode

**Description**:

The initial version of [MindCluster](https://gitcode.com/Ascend/mind-cluster)—the official Ascend cluster scheduling add-on—required custom modifications and recompilation of Volcano. Furthermore, it was limited to Volcano release1.7 and release1.9, which complicated its use and restricted access to newer Volcano features.

To address this, we have integrated its core scheduling logic for Ascend vNPU into Volcano's native device-share plugin, which is designed specifically for scheduling and sharing heterogeneous resources like GPUs and NPUs. This integration provides seamless access to vNPU capabilities through the procedure below, while maintaining full compatibility with the latest Volcano features.

**Use case**:

vNPU cluster for Ascend 310 series  
with support for more chip types to come

---

### 2. HAMi mode

**Description**:

This mode is developed by a third-party community 'HAMi', which is the developer of [volcano-vgpu](./how_to_use_volcano_vgpu.md) feature. It supports vNPU feature for both Ascend 310 and Ascend 910. It also supports managing heterogeneous Ascend cluster(Cluster with multiple Ascend types, i.e. 910A,910B2,910B3,310P)

**Use case**:

NPU and vNPU cluster for Ascend 910 series  
NPU and vNPU cluster for Ascend 310 series  
Heterogeneous Ascend cluster

---

## Installation

To enable vNPU scheduling, the following components must be set up based on the selected mode:


**Prerequisites**:

Kubernetes >= 1.16  
Volcano >= 1.14  
[ascend-docker-runtime](https://gitcode.com/Ascend/mind-cluster/tree/master/component/ascend-docker-runtime) (for HAMi Mode)

### Install Volcano:

Follow instructions in Volcano Installer Guide

  * Follow instructions in [Volcano Installer Guide](https://github.com/volcano-sh/volcano?tab=readme-ov-file#quick-start-guide)

### Install ascend-device-plugin and third-party components

In this step, you need to select different ascend-device-plugin based on the vNPU mode you selected. MindCluster mode requires additional components from Ascend to be installed.

---

#### MindCluster Mode

##### Install Third-Party Components

Follow the official [Ascend documentation](https://www.hiascend.com/document/detail/zh/mindcluster/72rc1/clustersched/dlug/mxdlug_start_006.html#ZH-CN_TOPIC_0000002470358262__section1837511531098) to install the following components:
- NodeD
- Ascend Device Plugin
- Ascend Docker Runtime
- ClusterD
- Ascend Operator

> **Note:** Skip the installation of `ascend-volcano` mentioned in the document above, as we have already installed the native Volcano from the Volcano community in the **Prerequisites** part.

**Configuration Adjustment for Ascend Device Plugin:**

When installing `ascend-device-plugin`, you must set the `presetVirtualDevice` parameter to `"false"` in the `device-plugin-310P-volcano-v{version}.yaml` file to enable dynamic virtualization of 310P:

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
For detailed information, please consult the official [Ascend MindCluster documentation.](https://www.hiascend.com/document/detail/zh/mindcluster/72rc1/clustersched/dlug/cpaug_0020.html)

##### Scheduler Config Update
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
      arguments: {"grace-over-time":"900","presetVirtualDevice":"false"}  # to enable dynamic virtulization, presetVirtualDevice need to be set false
```

---

#### HAMi mode

##### Label the Node with `ascend=on`

```
kubectl label node {ascend-node} ascend=on
```

##### Deploy `hami-scheduler-device` ConfigMap

```
kubectl apply -f https://raw.githubusercontent.com/Project-HAMi/ascend-device-plugin/refs/heads/main/ascend-device-configmap.yaml
```

##### Deploy ascend-device-plugin

```
kubectl apply -f https://raw.githubusercontent.com/Project-HAMi/ascend-device-plugin/refs/heads/main/ascend-device-plugin.yaml
```

For more information, refer to the [ascend-device-plugin documentation](https://github.com/Project-HAMi/ascend-device-plugin).

##### Scheduler Config Update
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

  **Note:** You may notice that, 'volcano-vgpu' has its own GeometriesCMName and GeometriesCMNamespace, which means if you want to use both vNPU and vGPU in a same volcano cluster, you need to merge the configMap from both sides and set it here.

## Usage

Usage is different depending on the mode you selected

---

### MindCluster mode

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

The supported Ascend chips and their `ResourceNames` are shown in the following table:

| ChipName | JobLabel and TaskLabel             | ResourceName |
|-------|------------------------------------|-------|
| 310P3 | ring-controller.atlas: ascend-310P | huawei.com/npu-core |

**Description of Labels in the Virtualization Task YAML**

| **Key**                   | **Value**       | **Description**                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------- | --------------- |-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **vnpu-level**            | **low**         | Low configuration (default). Selects the lowest-configuration "virtualized instance template."                                                                                                                                                                                                                                                                                                                              |
|                           | **high**        | Performance-first. When cluster resources are sufficient, the scheduler will choose the highest-configured virtualized instance template possible. When most physical NPUs in the cluster are already in use and only a few AI Cores remain on each device, the scheduler will allocate templates that match the remaining AI Core count rather than forcing high-profile templates. For details, refer to the table below. |
| **vnpu-dvpp**             | **yes**         | The Pod uses DVPP.                                                                                                                                                                                                                                                                                                                                                                                                          |
|                           | **no**          | The Pod does not use DVPP.                                                                                                                                                                                                                                                                                                                                                                                                  |
|                           | **null**        | Default value. DVPP usage is not considered.                                                                                                                                                                                                                                                                                                                                                                                |
| **ring-controller.atlas** | **ascend-310P** | Indicates that the task uses products from the Atlas inference series.                                                                                                                                                                                                                                                                                                                                                      |

**Effect of DVPP and Level Configurations**

| **Product Model**                       | **Requested AI Core Count** | **vnpu-dvpp** | **vnpu-level**       | **Downgrade** | **Selected Template** |
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


**Notice**

For **chip virtualization (non-full card usage)**, the value of `vnpu-dvpp` must strictly match the corresponding value listed in the above table.
Any other values will cause the task to fail to be dispatched.


For detailed information, please consult the official [Ascend MindCluster documentation.](https://www.hiascend.com/document/detail/zh/mindcluster/72rc1/clustersched/dlug/cpaug_0020.html)

---

### HAMi mode

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

The supported Ascend chips and their `ResourceNames` are shown in the following table:

| ChipName | ResourceName | ResourceMemoryName |
|-------|-------|-------|
| 910A | huawei.com/Ascend910A | huawei.com/Ascend910A-memory |
| 910B2 | huawei.com/Ascend910B2 | huawei.com/Ascend910B2-memory |
| 910B3 | huawei.com/Ascend910B3 | huawei.com/Ascend910B3-memory |
| 910B4 | huawei.com/Ascend910B4 | huawei.com/Ascend910B4-memory |
| 910B4-1 | huawei.com/Ascend910B4-1 | huawei.com/Ascend910B4-1-memory |
| 310P3 | huawei.com/Ascend310P | huawei.com/Ascend310P-memory |