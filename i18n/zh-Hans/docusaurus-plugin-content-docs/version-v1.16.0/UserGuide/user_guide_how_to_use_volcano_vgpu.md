---
title: "Volcano vGPU 用户指南"
---


## Volcano GPU 共享模式背景

Volcano 支持虚拟 GPU（vGPU）调度的**两种 GPU 共享模式**：

### 1. HAMI-core（软件 vGPU）

**说明**：
通过 **VCUDA**（CUDA API 劫持）限制 GPU 算力与显存使用，实现**软件级**虚拟 GPU 切分。

**适用场景**：
需要**细粒度 GPU 共享**的环境，兼容各类 GPU。

---

### 2. Dynamic MIG（硬件级 GPU 切分）

**说明**：
使用 **NVIDIA MIG（Multi-Instance GPU）** 将物理 GPU 划分为具有**硬件级性能保障**的隔离实例。

**适用场景**：
**性能敏感** workload，需 **支持 MIG 的 GPU**（如 A100、H100）。

---

GPU 共享模式为节点级配置。Volcano 支持异构集群（部分节点使用 HAMI-core，部分使用 Dynamic MIG），配置详见 [volcano-vgpu-device-plugin](https://github.com/Project-HAMi/volcano-vgpu-device-plugin)。

## 安装

启用 vGPU 调度需按所选模式部署以下组件。

### 通用要求

* **前置条件**：

  * NVIDIA 驱动 > 440
  * nvidia-docker > 2.0
  * Docker 默认运行时为 `nvidia`
  * Kubernetes >= 1.16
  * Volcano >= 1.9

* **安装 Volcano**：

  * 按 [Volcano 安装指南](https://github.com/volcano-sh/volcano?tab=readme-ov-file#quick-start-guide) 操作

* **安装设备插件**：

  * 部署 [`volcano-vgpu-device-plugin`](https://github.com/Project-HAMi/volcano-vgpu-device-plugin)

  **注意：** [vgpu 设备插件 YAML](https://github.com/Project-HAMi/volcano-vgpu-device-plugin/blob/main/volcano-vgpu-device-plugin.yml) 还包含 ***节点 GPU 模式*** 与 ***MIG geometry*** 配置，详见 [vgpu 设备插件配置](https://github.com/Project-HAMi/volcano-vgpu-device-plugin/blob/main/doc/config.md)。

* **验证安装**：
  确认节点可分配资源包含：

```yaml
volcano.sh/vgpu-memory: "89424"
volcano.sh/vgpu-number: "8"
```

* **调度器配置更新**：

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
          deviceshare.VGPUEnable: true   # 启用 vgpu 插件
          deviceshare.SchedulePolicy: binpack  # 调度策略：binpack / spread
```

验证命令：

```bash
kubectl get node {node-name} -o yaml
```

---

### HAMI-core 用法

* **Pod 规格**：

```yaml
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
        volcano.sh/vgpu-number: 1    # 请求 1 张 GPU
        volcano.sh/vgpu-cores: 50    #（可选）每个 vGPU 使用 50% 算力
        volcano.sh/vgpu-memory: 3000 #（可选）每个 vGPU 使用 3G 显存
```

---

### Dynamic MIG 用法

* **启用 MIG 模式**：

使用 MIG 时须在 GPU 节点执行：

```bash
sudo nvidia-smi -mig 1
```

* **Geometry 配置（可选）**：
  volcano-vgpu-device-plugin 会自动生成初始 MIG 配置，保存在 `kube-system` 命名空间的 `volcano-vgpu-device-config` ConfigMap 中，可按需自定义。详见 [vgpu 设备插件 YAML](https://github.com/Project-HAMi/volcano-vgpu-device-plugin/blob/main/volcano-vgpu-device-plugin.yml)。

* **带 MIG 注解的 Pod 规格**：

```yaml
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
```

注意：实际分配显存取决于最佳匹配的 MIG 切片（例如请求 3GB 可能使用 5GB 切片）。

---

## 调度器模式选择

* **显式模式**：

  * 使用注解 `volcano.sh/vgpu-mode` 强制 hami-core 或 MIG 模式。
  * 无注解时，调度器根据资源匹配与策略选择模式。

* **调度策略**：

  * `binpack` 或 `spread` 等策略影响节点选择。

---

## 对比表

| 模式 | 隔离方式 | 需要 MIG GPU | 注解 | 算力/显存控制 | 推荐场景 |
| ----------- | ---------------- | ---------------- | ---------- | ------------------- | -------------------------- |
| HAMI-core | 软件（VCUDA） | 否 | 否 | 是 | 通用 workload |
| Dynamic MIG | 硬件 | 是 | 是 | 由 MIG 控制 | 性能敏感 Job |

---

## 监控

* **调度器指标**：

```bash
curl http://<volcano-scheduler-ip>:8080/metrics
```

* **设备插件指标**：

```bash
curl http://<plugin-pod-ip>:9394/metrics
```

指标包括 GPU 利用率、Pod 显存使用与限制等。

---

## 问题与贡献

* 提交 issue：[Volcano Issues](https://github.com/volcano-sh/volcano/issues)
* 参与贡献：[Pull Requests 指南](https://help.github.com/articles/using-pull-requests/)
