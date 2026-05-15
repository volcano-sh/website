+++
title = "GPU Number 用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_gpu_number/"
[menu.docs]
  parent = "user-guide"
+++

## 重要说明

> **注意：**GPU Number 功能在 Volcano v1.9 中已被废弃。推荐使用由 HAMi 项目提供的 **Volcano vGPU** 能力，详见：[volcano-vgpu-device-plugin](https://github.com/Project-HAMi/volcano-vgpu-device-plugin)。

## 环境准备

### 安装 Volcano

#### 1. 从源码安装

参考 [安装指南](https://github.com/volcano-sh/volcano/blob/master/installer/README.md) 安装 Volcano。

安装完成后，更新调度器配置：

```shell script
kubectl edit cm -n volcano-system volcano-scheduler-configmap
```

对于 **Volcano v1.8.2 之后版本（不含 v1.8.2）**，使用如下 ConfigMap：

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
          deviceshare.GPUNumberEnable: true # 启用 GPU Number
      - name: predicates
      - name: proportion
      - name: nodeorder
      - name: binpack
```

对于 **Volcano v1.8.2 及之前版本（包含 v1.8.2）**，使用如下 ConfigMap：

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
          predicate.GPUNumberEnable: true # 启用 GPU Number
      - name: proportion
      - name: nodeorder
      - name: binpack
```

#### 2. 使用发布包安装

与上述相同，安装完成后到 `volcano-scheduler-configmap` 中更新调度器配置，打开 GPU Number 相关参数。

### 安装 Volcano device plugin

参考 [volcano device plugin 文档](https://github.com/volcano-sh/devices/blob/master/README.md#quick-start)。

> 需要注意：要支持 GPU Number，必须将 Volcano device plugin 的 `--gpu-strategy` 配置为 `number`。详见 [设备插件配置说明](https://github.com/volcano-sh/devices/blob/master/doc/config.md)。

### 校验环境是否就绪

检查节点状态，确认在可分配资源（Allocatable）中包含 `volcano.sh/gpu-number`：

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

## 运行使用多张 GPU 卡的作业

可以通过在容器级别请求 `volcano.sh/gpu-number` 资源，让作业一次性占用多张独占的 NVIDIA GPU：

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
          volcano.sh/gpu-number: 1 # 请求 1 张 GPU 卡
EOF
```

如果上述 Pod 请求了多张 GPU，可以在容器内部看到其独占的 GPU 卡：

```shell script
$ kubectl exec -ti  gpu-pod1 env
...
NVIDIA_VISIBLE_DEVICES=0
VOLCANO_GPU_ALLOCATED=1
...
```

## 多卡需求的工作原理

其整体架构与早期实现类似，但每个 Pod 的 `gpu-index` 结果将是一组 GPU 索引列表：

![gpu_number](/img/gpu-virtualization/gpu-number.png)

1. 用户创建一个带有 `volcano.sh/gpu-number` 资源请求的 Pod；
2. Volcano 调度器在调度阶段为该 Pod 分配对应数量的 GPU 卡，并在 Pod 上添加如下注解：

   ```yaml
   annotations:
     volcano.sh/gpu-index: "0"
     volcano.sh/predicate-time: "159376446655083530"
   ```

3. kubelet 监控到 Pod 绑定到本节点后，会调用设备插件的 allocate API，在容器启动前注入环境变量：

   ```yaml
   env:
     NVIDIA_VISIBLE_DEVICES: "0" # GPU 卡索引
     VOLCANO_GPU_ALLOCATED: "1"  # 分配的 GPU 数量
   ```

