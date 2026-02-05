++
title = "昇腾 vNPU 用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_vnpu/"
[menu.docs]
  parent = "user-guide"
++

## 介绍

Volcano 目前支持两种方式对昇腾（Ascend）设备进行 **vNPU（虚拟 NPU）** 共享：

---

### 1. MindCluster 模式

**说明：**

早期版本的 [MindCluster](https://gitcode.com/Ascend/mind-cluster)（昇腾官方集群调度组件）需要对 Volcano 进行定制修改和重新编译，并且只能配合 Volcano release1.7 与 release1.9 使用，这给升级和使用带来了较大限制。

为了解决上述问题，Ascend vNPU 的核心调度逻辑已经集成到 Volcano 原生的 `deviceshare` 插件中（该插件用于调度和共享 GPU/NPU 等异构资源）。这样，用户只需按本文步骤进行配置，即可在保持与最新 Volcano 特性兼容的前提下使用 vNPU 能力。

**典型场景：**

- 昇腾 310 系列的 vNPU 集群  
- 后续将支持更多芯片型号

---

### 2. HAMi 模式

**说明：**

该模式由第三方社区 **HAMi** 实现，其也是 [Volcano vGPU](./how_to_use_volcano_vgpu.md) 功能的主要贡献方。  
HAMi 模式同时支持 Ascend 310 与 Ascend 910 的 vNPU 功能，并可以管理异构 Ascend 集群（例如同时包含 910A、910B2、910B3、310P 等多种型号的集群）。

**典型场景：**

- Ascend 910 系列 NPU / vNPU 集群  
- Ascend 310 系列 NPU / vNPU 集群  
- 多型号混合的异构 Ascend 集群

---

## 安装

根据选择的模式，需要部署不同的组件。

**通用前置条件：**

- Kubernetes >= 1.16  
- Volcano >= 1.14  
- HAMi 模式需要安装 [ascend-docker-runtime](https://gitcode.com/Ascend/mind-cluster/tree/master/component/ascend-docker-runtime)

### 安装 Volcano

参考 [Volcano 快速开始](https://github.com/volcano-sh/volcano?tab=readme-ov-file#quick-start-guide) 安装 Volcano。

### 安装 ascend-device-plugin 与其他第三方组件

接下来需要根据所选 vNPU 模式选择不同的 ascend-device-plugin，并在 MindCluster 模式下安装额外组件。

---

### MindCluster 模式

#### 安装第三方组件

参考官方 [昇腾 MindCluster 文档](https://www.hiascend.com/document/detail/zh/mindcluster/72rc1/clustersched/dlug/mxdlug_start_006.html#ZH-CN_TOPIC_0000002470358262__section1837511531098)，安装以下组件：

- NodeD
- Ascend Device Plugin
- Ascend Docker Runtime
- ClusterD
- Ascend Operator

> **注意：**文档中提到的 `ascend-volcano` 安装步骤可以跳过，因为我们已经在前面的前置条件中通过社区版本安装了原生 Volcano。

**Device Plugin 配置调整：**

在安装 `ascend-device-plugin` 时，需要在 `device-plugin-310P-volcano-v{version}.yaml` 中将 `presetVirtualDevice` 参数设置为 `"false"`，以启用 310P 的动态虚拟化能力：

```yaml
...
args:
  [
    "device-plugin",
    "-useAscendDocker=true",
    "-volcanoType=true",
    "-presetVirtualDevice=false",
    "-logFile=/var/log/mindx-dl/devicePlugin/devicePlugin.log",
    "-logLevel=0",
  ]
...
```

详细信息可参考 [昇腾 MindCluster 官方文档](https://www.hiascend.com/document/detail/zh/mindcluster/72rc1/clustersched/dlug/cpaug_0020.html)。

#### 调度器配置更新

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
          deviceshare.AscendMindClusterVNPUEnable: true   # 启用 MindCluster vNPU
    configurations:
    ...
    - name: init-params
      arguments: {"grace-over-time":"900","presetVirtualDevice":"false"}  # 启用动态虚拟化时需要 presetVirtualDevice=false
```

---

### HAMi 模式

#### 为节点打标签 `ascend=on`

```bash
kubectl label node {ascend-node} ascend=on
```

#### 部署 `hami-scheduler-device` ConfigMap

```bash
kubectl apply -f https://raw.githubusercontent.com/Project-HAMi/ascend-device-plugin/refs/heads/main/ascend-device-configmap.yaml
```

#### 部署 ascend-device-plugin

```bash
kubectl apply -f https://raw.githubusercontent.com/Project-HAMi/ascend-device-plugin/refs/heads/main/ascend-device-plugin.yaml
```

更多细节参见 [ascend-device-plugin 文档](https://github.com/Project-HAMi/ascend-device-plugin)。

#### 调度器配置更新

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
          deviceshare.AscendHAMiVNPUEnable: true   # 启用 HAMi vNPU 模式
          deviceshare.SchedulePolicy: binpack      # 调度策略：binpack / spread
          deviceshare.KnownGeometriesCMNamespace: kube-system
          deviceshare.KnownGeometriesCMName: hami-scheduler-device
```

> **注意：**你可能会注意到 `volcano-vgpu` 有自己独立的 `GeometriesCMName` 与 `GeometriesCMNamespace`。  
> 如果希望在同一个 Volcano 集群中同时使用 vNPU 与 vGPU，需要将 vNPU 与 vGPU 的配置合并到同一个 ConfigMap 中，并在此处引用。

---

## 使用说明

不同模式下 vNPU 的使用方式略有区别。

### MindCluster 模式示例

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

受支持的 Ascend 芯片及其对应的 `ResourceName` 如下表：

| ChipName | JobLabel 与 TaskLabel                      | ResourceName        |
|----------|--------------------------------------------|---------------------|
| 310P3    | `ring-controller.atlas: ascend-310P`       | `huawei.com/npu-core` |

**虚拟化任务 YAML 中标签说明：**

| Key                     | Value         | 说明 |
|-------------------------|---------------|------|
| `vnpu-level`            | `low`         | 低配（默认），选择最低规格的虚拟实例模板。 |
|                         | `high`        | 性能优先：当集群资源充足时倾向选择更高规格模板；当集群大部分物理 NPU 已被使用、仅剩少量 AI Core 时，会根据剩余 AI Core 数匹配合适模板，而不会强行选择高规格模板。详见下表。 |
| `vnpu-dvpp`             | `yes`         | Pod 使用 DVPP。 |
|                         | `no`          | Pod 不使用 DVPP。 |
|                         | `null`        | 默认值，不考虑 DVPP 维度。 |
| `ring-controller.atlas` | `ascend-310P` | 标识该任务使用 Atlas 推理系列产品。 |

**DVPP 与 level 组合对模板选择的影响示例：**

| 产品型号                            | 请求的 AI Core 数 | `vnpu-dvpp` | `vnpu-level`         | 降级 | 选择的模板        |
|-------------------------------------|-------------------|------------|----------------------|------|-------------------|
| Atlas Inference (8 AI Cores)        | 1                 | `null`     | 任意                 | –    | `vir01`           |
|                                     | 2                 | `null`     | `low` / 其他         | –    | `vir02_1c`        |
|                                     | 2                 | `null`     | `high`               | 否   | `vir02`           |
|                                     | 2                 | `null`     | `high`               | 是   | `vir02_1c`        |
|                                     | 4                 | `yes`      | `low` / 其他         | –    | `vir04_4c_dvpp`   |
|                                     | 4                 | `no`       | `low` / 其他         | –    | `vir04_3c_ndvpp`  |
|                                     | 4                 | `null`     | `low` / 其他         | –    | `vir04_3c`        |
|                                     | 4                 | `yes`      | `high`               | –    | `vir04_4c_dvpp`   |
|                                     | 4                 | `no`       | `high`               | –    | `vir04_3c_ndvpp`  |
|                                     | 4                 | `null`     | `high`               | 否   | `vir04`           |
|                                     | 4                 | `null`     | `high`               | 是   | `vir04_3c`        |
|                                     | 8 或 8 的倍数     | 任意       | 任意                 | –    | –                 |

**注意：**

对于**芯片虚拟化（非整卡使用）**场景，`vnpu-dvpp` 的取值必须严格匹配上述表格中的值，否则任务将无法调度。

> 更详细的信息请参考官方 [昇腾 MindCluster 文档](https://www.hiascend.com/document/detail/zh/mindcluster/72rc1/clustersched/dlug/cpaug_0020.html)。

---

### HAMi 模式示例

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

支持的 Ascend 芯片及其资源名如下：

| ChipName | ResourceName             | ResourceMemoryName              |
|----------|--------------------------|---------------------------------|
| 910A     | `huawei.com/Ascend910A`  | `huawei.com/Ascend910A-memory`  |
| 910B2    | `huawei.com/Ascend910B2` | `huawei.com/Ascend910B2-memory` |
| 910B3    | `huawei.com/Ascend910B3` | `huawei.com/Ascend910B3-memory` |
| 910B4    | `huawei.com/Ascend910B4` | `huawei.com/Ascend910B4-memory` |
| 910B4-1  | `huawei.com/Ascend910B4-1` | `huawei.com/Ascend910B4-1-memory` |
| 310P3    | `huawei.com/Ascend310P`  | `huawei.com/Ascend310P-memory`  |

#### HAMi vNPU 场景下的显存分配约束

- 当 Pod 只请求 **单个** vNPU 设备时：
  - 可以将显存请求配置为任意值，Driver 会自动与最接近的模板对齐；
  - 例如：单卡总内存为 65536，支持 1/4（16384）、1/2（32768）两种切分模板：
    - 若 Pod 请求 1 个 vNPU 且显存请求为 1024，则实际分配为 16384；
    - 若请求显存为 20480，则实际分配为 32768。

- 当 Pod 请求 **多个** vNPU 设备时：
  - 可以不显式指定显存，或直接填充最大值，此时 Pod 获得的显存等同于整卡的实际显存总量。

