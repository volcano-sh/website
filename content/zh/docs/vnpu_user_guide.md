# Ascend vNPU 用户指南

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
      arguments: {"grace-over-time":"900","presetVirtualDevice":"false"}  # to enable dynamic virtulization，presetVirtualDevice need to be set false
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