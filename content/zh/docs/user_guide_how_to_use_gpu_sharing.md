++
title = "GPU Sharing 用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_gpu_sharing/"
[menu.docs]
  parent = "user-guide"
++

## 重要说明

> **注意：**GPU Sharing 功能在 Volcano v1.9 中已被废弃。推荐使用由 HAMi 项目提供的 **Volcano vGPU** 能力，详见：[volcano-vgpu-device-plugin](https://github.com/Project-HAMi/volcano-vgpu-device-plugin)。

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
          deviceshare.GPUSharingEnable: true # 启用 GPU Sharing
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
          predicate.GPUSharingEnable: true # 启用 GPU Sharing
      - name: proportion
      - name: nodeorder
      - name: binpack
```

#### 2. 使用发布包安装

与上述相同，安装完成后到 `volcano-scheduler-configmap` 中更新调度器配置，打开 GPU Sharing 相关参数。

### 安装 Volcano device plugin

参考 [volcano device plugin 文档](https://github.com/volcano-sh/devices/blob/master/README.md#quick-start)。

> 默认情况下，Volcano device plugin 即支持共享 GPU，无需额外配置。其默认行为等价于设置 `--gpu-strategy=share`。更多信息参见 [设备插件配置说明](https://github.com/volcano-sh/devices/blob/master/doc/config.md)。

### 校验环境是否就绪

检查节点状态，确认在可分配资源（Allocatable）中同时包含 `volcano.sh/gpu-memory` 与 `volcano.sh/gpu-number`：

```shell script
$ kubectl get node {node name} -oyaml
...
status:
  addresses:
  - address: 172.17.0.3
    type: InternalIP
  - address: volcano-control-plane
    type: Hostname
  allocatable:
    cpu: "4"
    ephemeral-storage: 123722704Ki
    hugepages-1Gi: "0"
    hugepages-2Mi: "0"
    memory: 8174332Ki
    pods: "110"
    volcano.sh/gpu-memory: "89424"
    volcano.sh/gpu-number: "8"    # GPU 资源
  capacity:
    cpu: "4"
    ephemeral-storage: 123722704Ki
    hugepages-1Gi: "0"
    hugepages-2Mi: "0"
    memory: 8174332Ki
    pods: "110"
    volcano.sh/gpu-memory: "89424"
    volcano.sh/gpu-number: "8"   # GPU 资源
```

## 运行 GPU 共享作业

通过在容器资源请求中使用 `volcano.sh/gpu-memory`，可以在同一物理 GPU 上共享显存：

```shell script
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod1
spec:
  schedulerName: volcano
  containers:
    - name: cuda-container
      image: nvidia/cuda:9.0-devel
      command: ["sleep"]
      args: ["100000"]
      resources:
        limits:
          volcano.sh/gpu-memory: 1024 # 请求 1024MB GPU 显存
EOF

$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod2
spec:
  schedulerName: volcano
  containers:
    - name: cuda-container
      image: nvidia/cuda:9.0-devel
      command: ["sleep"]
      args: ["100000"]
      resources:
        limits:
          volcano.sh/gpu-memory: 1024 # 请求 1024MB GPU 显存
EOF
```

如果在集群中只存在上述两个 Pod 请求 GPU 资源，它们会共享同一张 GPU 卡：

```shell script
$ kubectl exec -ti  gpu-pod1 env
...
VOLCANO_GPU_MEMORY_TOTAL=11178
VOLCANO_GPU_ALLOCATED=1024
NVIDIA_VISIBLE_DEVICES=0
...

$ kubectl exec -ti  gpu-pod2 env
...
VOLCANO_GPU_MEMORY_TOTAL=11178
VOLCANO_GPU_ALLOCATED=1024
NVIDIA_VISIBLE_DEVICES=0
...
```

## GPU Sharing 的工作原理

GPU 共享的工作流程如下图所示：

![gpu_sharing](/img/gpu-virtualization/gpu-share-flow.png)

1. 创建一个带有 `volcano.sh/gpu-memory` 资源请求的 Pod；
2. Volcano 调度器在调度阶段为该 Pod 分配对应的 GPU 显存资源，并在 Pod 上添加如下注解：

   ```yaml
   annotations:
     volcano.sh/gpu-index: "0"
     volcano.sh/predicate-time: "1593764466550835304"
   ```

3. kubelet 监控到 Pod 绑定到本节点后，会调用设备插件的 allocate API，在容器启动前注入环境变量：

   ```yaml
   env:
     NVIDIA_VISIBLE_DEVICES: "0"        # GPU 卡索引
     VOLCANO_GPU_ALLOCATED: "1024"      # 为当前容器分配的 GPU 显存（MB）
     VOLCANO_GPU_MEMORY_TOTAL: "11178"  # 该 GPU 卡的总显存容量
   ```

