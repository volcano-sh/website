+++
title = "GPU虚拟化"

date = 2025-06-19
lastmod = 2025-06-19

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
toc_depth = 5
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
[menu.v1-11-0]
  parent = "features"
  weight = 8
+++

## 前提条件

运行Volcano设备插件所需的前提条件如下：

*   NVIDIA驱动 > 440
*   nvidia-docker版本 > 2.0 (参见如何[安装](https://github.com/NVIDIA/nvidia-docker)及其[前提条件](https://github.com/nvidia/nvidia-docker/wiki/Installation-\(version-2.0\)#prerequisites))
*   将docker配置为使用nvidia作为[默认运行时](https://github.com/NVIDIA/nvidia-docker/wiki/Advanced-topics#default-runtime)
*   Kubernetes版本 >= 1.16
*   Volcano版本 >= 1.9

## 环境设置

### 安装 Volcano

参考[安装指南](../../installer/README.md)安装Volcano。

安装后，更新调度器配置：

```shell script
kubectl edit cm -n volcano-system volcano-scheduler-configmap
```

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
          deviceshare.VGPUEnable: true # 启用 vgpu
      - name: predicates
      - name: proportion
      - name: nodeorder
      - name: binpack
```

### 安装 Volcano vGPU Device Plugin

参考[Enabling GPU Support in Kubernetes](https://github.com/Project-HAMi/volcano-vgpu-device-plugin?tab=readme-ov-file#enabling-gpu-support-in-kubernetes)。

### 验证环境是否就绪

检查节点状态，如果在可分配资源（allocatable resources）中包含 `volcano.sh/vgpu-memory` 和 `volcano.sh/vgpu-number`，则表示环境正常。

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
    volcano.sh/vgpu-memory: "89424"
    volcano.sh/vgpu-number: "8"    # GPU 资源
  capacity:
    cpu: "4"
    ephemeral-storage: 123722704Ki
    hugepages-1Gi: "0"
    hugepages-2Mi: "0"
    memory: 8174332Ki
    pods: "110"
    volcano.sh/vgpu-memory: "89424"
    volcano.sh/vgpu-number: "8"   # GPU 资源
```

## 运行 GPU 共享作业

可以通过在`resource.limit`中设置"volcano.sh/vgpu-number"、"volcano.sh/vgpu-cores"和"volcano.sh/vgpu-memory"来申请vGPU。

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
          volcano.sh/vgpu-number: 2 # 申请 2 个 vGPU 卡
          volcano.sh/vgpu-memory: 3000 # (可选) 每个 vGPU 使用 3G 设备显存
          volcano.sh/vgpu-cores: 50 # (可选) 每个 vGPU 使用 50% 的核心
EOF
```

可以在容器内使用`nvidia-smi`命令验证设备显存：

<div style="text-align: center;"> {{<figure library="1" src="./gpu-virtualization/hard_limit.jpg">}}
</div>

> **警告：** *如果在使用device plugin和NVIDIA镜像时未申请GPU，节点上的所有GPU都会暴露在容器内。*
> *容器使用的vGPU数量不能超过该节点上的物理GPU总数。*

## 监控

`volcano-scheduler-metrics`记录了每个GPU的使用情况和限制。访问以下地址获取这些指标：

```
curl {volcano-scheduler-cluster-ip}:8080/metrics
```

还可通过访问以下地址，在节点上收集**GPU利用率**、**GPU显存使用量**、**Pod的GPU显存限制**和**Pod的GPU显存使用量**等指标：

```
curl {volcano-device-plugin-pod-ip}:9394/metrics
```

<div style="text-align: center;"> {{<figure library="1" src="./gpu-virtualization/vgpu_device_plugin_metrics.png">}}
</div>

## 问题与贡献

*   可以通过[提交新的issue](https://github.com/volcano-sh/volcano/issues)报告Bug。
*   可以通过[发起拉取请求(pull request)](https://help.github.com/articles/using-pull-requests/)为项目做出贡献。 