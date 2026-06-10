---
title: "GPU Sharing 用户指南"
---


## 重要说明

> **注意** GPU Sharing 在 Volcano v1.9 中已弃用，建议使用 HAMI 项目提供的 Volcano vGPU 功能，详见[此处](https://github.com/Project-HAMi/volcano-vgpu-device-plugin)。

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
          deviceshare.GPUSharingEnable: true # enable gpu sharing
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
          predicate.GPUSharingEnable: true # enable gpu sharing
      - name: proportion
      - name: nodeorder
      - name: binpack
```

#### 2. 从发布包安装

与上文相同，安装后更新 `volcano-scheduler-configmap` 中的调度器配置。

### 安装 Volcano 设备插件

请参阅 [Volcano 设备插件](https://github.com/volcano-sh/devices/blob/master/README.md#quick-start)。

* Volcano 设备插件默认支持 GPU 共享，无需额外配置，效果与 `--gpu-strategy=share` 相同。更多信息见 [Volcano 设备插件配置](https://github.com/volcano-sh/devices/blob/master/doc/config.md)。

### 验证环境就绪

检查节点状态，可分配资源中包含 `volcano.sh/gpu-memory` 与 `volcano.sh/gpu-number` 即表示正常。

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

### 运行 GPU 共享 Job

可通过容器级资源请求 `volcano.sh/gpu-memory` 共享 NVIDIA GPU：

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

若集群中仅上述 Pod 申请 GPU 资源，可见它们共享同一张 GPU 卡：

```shell script
$ kubectl exec -ti  gpu-pod1 env
...
VOLCANO_GPU_MEMORY_TOTAL=11178
VOLCANO_GPU_ALLOCATED=1024
NVIDIA_VISIBLE_DEVICES=0
...

$ kubectl exec -ti  gpu-pod1 env
...
VOLCANO_GPU_MEMORY_TOTAL=11178
VOLCANO_GPU_ALLOCATED=1024
NVIDIA_VISIBLE_DEVICES=0
...
```

### GPU 共享工作原理

GPU 共享流程如下：

![gpu_sharing](/img/gpu-virtualization/gpu-share-flow.png)

1. 创建带有 `volcano.sh/gpu-memory` 资源请求的 Pod；

2. Volcano 调度器进行谓词过滤并分配 GPU 资源，并添加如下注解：

```yaml
annotations:
  volcano.sh/gpu-index: "0"
  volcano.sh/predicate-time: "1593764466550835304"
```

3. kubelet 监听绑定到本节点的 Pod，在运行容器前调用 allocate API 设置环境变量：

```yaml
env:
  NVIDIA_VISIBLE_DEVICES: "0" # GPU 卡索引
  VOLCANO_GPU_ALLOCATED: "1024" # 已分配 GPU 显存
  VOLCANO_GPU_MEMORY_TOTAL: "11178" # 该卡总显存
```
