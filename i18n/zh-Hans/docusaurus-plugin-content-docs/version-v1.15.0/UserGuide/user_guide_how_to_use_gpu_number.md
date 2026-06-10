---
title: "GPU Number 用户指南"
---


## 重要说明

> **注意** GPU Number 在 Volcano v1.9 中已弃用，建议使用 HAMI 项目提供的 Volcano vGPU 功能，详见[此处](https://github.com/Project-HAMi/volcano-vgpu-device-plugin)。

## 环境准备

### 安装 Volcano

#### 1. 从源码安装

请参考[安装指南](https://github.com/volcano-sh/volcano/blob/master/installer/README.md)安装 Volcano。

安装完成后，更新调度器配置：

```shell script
kubectl edit cm -n volcano-system volcano-scheduler-configmap
```

Volcano v1.8.2 以上（不含 v1.8.2）使用以下 ConfigMap：

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
      - name: priority
      - name: gang
      - name: conformance
    - plugins:
      - name: drf
      - name: deviceshare
        arguments:
          deviceshare.GPUNumberEnable: true # enable gpu number
      - name: predicates
      - name: proportion
      - name: nodeorder
      - name: binpack
```

Volcano v1.8.2 及以下（含 v1.8.2）使用以下 ConfigMap：

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
      - name: priority
      - name: gang
      - name: conformance
    - plugins:
      - name: drf
      - name: predicates
        arguments:
          predicate.GPUNumberEnable: true # enable gpu number
      - name: proportion
      - name: nodeorder
      - name: binpack
```

#### 2. 从发布包安装

与上文相同，安装后更新 `volcano-scheduler-configmap` 中的调度器配置。

### 安装 Volcano 设备插件

请参阅 [Volcano 设备插件](https://github.com/volcano-sh/devices/blob/master/README.md#quick-start)。

* 需将 Volcano 设备插件配置为支持 gpu-number，即设置 `--gpu-strategy=number`。更多信息见 [Volcano 设备插件配置](https://github.com/volcano-sh/devices/blob/master/doc/config.md)。

### 验证环境就绪

检查节点状态，可分配资源中包含 `volcano.sh/gpu-number` 即表示正常。

```shell script
$ kubectl get node {node name} -oyaml
...
Capacity:
  attachable-volumes-gce-pd:  127
  cpu:                        2
  ephemeral-storage:          98868448Ki
  hugepages-1Gi:              0
  hugepages-2Mi:              0
  memory:                     7632596Ki
  pods:                       110
  volcano.sh/gpu-memory:      0
  volcano.sh/gpu-number:      1
Allocatable:
  attachable-volumes-gce-pd:  127
  cpu:                        1930m
  ephemeral-storage:          47093746742
  hugepages-1Gi:              0
  hugepages-2Mi:              0
  memory:                     5752532Ki
  pods:                       110
  volcano.sh/gpu-memory:      0
  volcano.sh/gpu-number:      1
```

### 运行需要多张 GPU 卡的 Job

通过在容器资源请求中声明 `volcano.sh/gpu-number`，Job 可使用多张独占 NVIDIA GPU：

```shell script
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod1
spec:
  containers:
    - name: cuda-container
      image: nvidia/cuda:9.0-devel
      command: ["sleep"]
      args: ["100000"]
      resources:
        limits:
          volcano.sh/gpu-number: 1 # 请求 1 张 GPU
EOF
```

若上述 Pod 申请多张 GPU，每个 Pod 将独占对应 GPU 卡：

```shell script
$ kubectl exec -ti  gpu-pod1 env
...
NVIDIA_VISIBLE_DEVICES=0
VOLCANO_GPU_ALLOCATED=1
...
```

### 多张 GPU 卡请求的工作原理

整体架构与 GPU 共享类似，但每个 Pod 的 gpu-index 结果为多张 GPU 卡索引列表。

![gpu_number](/img/gpu-virtualization/gpu-number.png)

1. 创建带有 `volcano.sh/gpu-number` 资源请求的 Pod；

2. Volcano 调度器进行谓词过滤并分配 GPU 卡，并添加如下注解：

```yaml
annotations:
  volcano.sh/gpu-index: "0"
  volcano.sh/predicate-time: "159376446655083530"
```

3. kubelet 监听绑定到本节点的 Pod，在运行容器前调用 allocate API 设置环境变量：

```yaml
env:
  NVIDIA_VISIBLE_DEVICES: "0" # GPU 卡索引
  VOLCANO_GPU_ALLOCATED: "1" # 分配的 GPU 数量
```
