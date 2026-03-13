---
title: "统一调度"
---
## 1. 概述

作为业界领先的云原生批处理系统调度器，Volcano 通过统一调度系统实现了对所有类型工作负载的支持：

- 强大的批量调度能力：通过 VcJob 完美支持 Ray、TensorFlow、PyTorch、MindSpore、Spark、Flink 等主流 AI 和大数据框架
- 完整的 Kubernetes 工作负载支持：直接调度 Deployment、StatefulSet、Job、DaemonSet 等原生工作负载

这种统一调度能力允许用户使用单个调度器管理所有类型的工作负载，大大简化了集群管理的复杂性。

## 2. 兼容 Kubernetes 调度能力

Volcano 通过实现两个核心调度插件：predicates 和 nodeorder，实现了与 Kubernetes 调度机制的完全兼容。这些插件对应于 Kubernetes 调度框架中的 "PreFilter/Filter" 和 "Score" 阶段。

### 2.1. predicates 插件
Volcano 完全实现了 Kube-Scheduler 的 PreFilter-Filter 阶段，包括：

- 基础资源过滤：节点可调度性、Pod 数量限制等
- 亲和性/反亲和性：节点亲和性、Pod 间亲和性等
- 资源约束：节点端口、卷限制等
- 拓扑分布：Pod 拓扑分布约束等
- 动态资源分配 (DRA)：DRA 允许您在集群中灵活请求、分配和共享 GPU 等硬件资源。

> 1. 有关 DRA 的详细介绍，请参阅：[dynamic-resource-allocation](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/)

> 2. 有关在 Volcano 中启用 DRA 的详细步骤，请参阅本文档后面的 [**2.1.2. 在 Volcano 中启用 DRA (动态资源分配)**](#2-1-2-在-volcano-中启用-dra-动态资源分配) 部分。

除了兼容 kube-scheduler 中的大多数过滤器外，Volcano 还提供了 `节点过滤结果缓存` 增强功能：

#### 2.1.1. 节点过滤结果缓存 (PredicateWithCache)
当调度器为 Pod 选择节点时，需要执行一系列检查（如资源可用性、亲和性要求等）。这些检查结果可以被缓存。如果不久后需要调度配置相同的 Pod，可以重用先前的检查结果，避免重复的节点过滤计算，并在批量创建 Pod 时显著提高调度性能。

##### 2.1.1.1. 配置
在 volcano-scheduler-configmap 中启用缓存：
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: volcano-scheduler-configmap
  namespace: volcano-system
data:
  volcano-scheduler.conf: |
    actions: "enqueue, allocate, backfill"
    tiers:
    - plugins:
      - name: predicates
        arguments:
          predicate.CacheEnable: true        # 启用节点过滤结果缓存
```

##### 2.1.1.2. 用例
1. 创建多个配置相同的 Pod
   - 示例：创建多个相同的 TensorFlow 训练任务
   - 第一个 Pod 完成节点过滤后，后续 Pod 可以使用缓存结果

2. 大规模集群调度优化

> **注意**:
>
> - 仅缓存静态检查结果（如节点标签、污点）
> - 动态资源相关检查（如 CPU、内存使用情况）每次都会重新计算
> - 当节点状态发生变化时，相关缓存会自动失效

#### 2.1.2. 在 Volcano 中启用 DRA (动态资源分配)
在 Volcano 调度器中启用动态资源分配 (DRA) 支持需要一些步骤。

##### 2.1.2.1 先决条件
在继续配置步骤之前，请确保您的集群满足以下先决条件：

###### 2.1.2.1.1. 配置集群节点 (Containerd)
对于运行 containerd 作为容器运行时的节点，必须启用容器设备接口 (CDI) 功能。
这对于 containerd 正确与 DRA 驱动程序交互并将动态资源注入 Pod 至关重要。

修改每个节点上的 containerd 配置文件（通常为 /etc/containerd/config.toml）以确保存在以下设置：
```toml
# Enable CDI as described in
# https://tags.cncf.io/container-device-interface#containerd-configuration
[plugins."io.containerd.grpc.v1.cri"]
  enable_cdi = true
  cdi_spec_dirs = ["/etc/cdi", "/var/run/cdi"]
```
修改配置后，重启每个节点上的 containerd 服务以使更改生效。例如：`sudo systemctl restart containerd`

> 如果您使用其他容器运行时，请参阅：[how-to-configure-cdi](https://github.com/cncf-tags/container-device-interface?tab=readme-ov-file#how-to-configure-cdi)

###### 2.1.2.2. 配置 Kube-apiserver
DRA 相关 API 是 k8s 内置资源而不是 CRD 资源，并且这些资源在 v1.32 中默认未注册，
因此您需要设置 kube-apiserver 的启动参数以手动注册 DRA 相关 API，添加或确保您的 kube-apiserver 清单或配置中存在以下标志：
```yaml
--runtime-config=resource.k8s.io/v1beta1=true
```

##### 2.1.2.3. 安装启用了 DRA 功能门控的 Volcano
安装 Volcano 时，您需要启用 DRA 相关的功能门控，例如，当您需要使用 DRA 时必须启用 `DynamicResourceAllocation`，
您还可以根据需要选择启用 `DRAAdminAccess` 功能门控来管理设备。

当您使用 helm 安装 Volcano 时，可以使用以下命令安装启用 DRA 功能门控的 Volcano：
```bash
helm install volcano volcano/volcano --namespace volcano-system --create-namespace \
  --set custom.scheduler_feature_gates="DynamicResourceAllocation=true" \
  # 添加其他必要的 Helm 值进行安装
```

当您直接使用 `kubectl apply -f` 安装 Volcano 时，需要在 volcano-scheduler 清单中添加或确保存在以下标志：
```yaml
--feature-gates=DynamicResourceAllocation=true
```

##### 2.1.2.4. 配置 Volcano 调度器插件
安装 Volcano 后，您需要配置 Volcano 调度器的插件配置，在 predicates 插件参数中启用 DRA 插件。

找到您的 Volcano 调度器配置（配置包含在 ConfigMap 中）。找到 predicates 插件配置并添加或修改其参数以启用 DRA 插件。

调度器配置示例片段（在 ConfigMap 的 volcano-scheduler.conf 键中）可能如下所示：
```yaml
actions: "enqueue, allocate, backfill"
tiers:
- plugins:
  - name: priority
  - name: gang
- plugins:
  - name: drf
  - name: predicates
    arguments:
      predicate.DynamicResourceAllocationEnable: true
  - name: proportion
  - name: nodeorder
  - name: binpack
```

##### 2.1.2.5. 部署 DRA 驱动程序
要利用动态资源分配，您需要在集群中部署 DRA 驱动程序。驱动程序负责管理动态资源的生命周期。
例如，您可以参考 [kubernetes-sigs/dra-example-driver](https://github.com/kubernetes-sigs/dra-example-driver) 部署示例 DRA 驱动程序进行测试。

对于一些已在实际生产中使用的 DRA 驱动程序，您可以参考：

- [NVIDIA/k8s-dra-driver-gpu](https://github.com/NVIDIA/k8s-dra-driver-gpu)
- [intel/intel-resource-drivers-for-kubernetes](https://github.com/intel/intel-resource-drivers-for-kubernetes)

### 2.2. nodeorder 插件
Volcano 完全兼容 Kubernetes 默认评分机制，并实现了可配置的权重系统，以实现更灵活的节点选择策略。此外，Volcano 实现了并行评分处理，显著提高了大规模集群中的调度效率，特别适合 AI 训练和其他批处理场景。

#### 2.2.1 支持的评分维度
1. **资源维度**
   - `leastrequested`：优先选择资源请求较少的节点，适用于资源分散
   - `mostrequested`：优先选择资源请求较多的节点，适用于资源堆叠
   - `balancedresource`：寻求 CPU、内存和其他资源之间的平衡，避免单一资源瓶颈

2. **亲和性维度**
   - `nodeaffinity`：基于节点亲和性规则评分
   - `podaffinity`：基于 Pod 间亲和性规则评分
   - `tainttoleration`：基于节点污点和 Pod 容忍度评分

3. **其他维度**
   - `imagelocality`：优先选择已有所需容器镜像的节点
   - `podtopologyspread`：确​​保 Pod 均匀分布在不同的拓扑域中

#### 2.2.2 配置示例
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: volcano-scheduler-configmap
data:
  volcano-scheduler.conf: |
    actions: "enqueue, allocate, backfill"
    tiers:
    - plugins:
      - name: nodeorder
        arguments:
          # 资源维度权重
          leastrequested.weight: 1      # 默认权重为 1
          mostrequested.weight: 0       # 默认权重为 0（默认禁用）
          balancedresource.weight: 1    # 默认权重为 1
          
          # 亲和性维度权重
          nodeaffinity.weight: 2        # 默认权重为 2
          podaffinity.weight: 2         # 默认权重为 2
          tainttoleration.weight: 3     # 默认权重为 3
          
          # 其他维度权重
          imagelocality.weight: 1       # 默认权重为 1
          podtopologyspread.weight: 2   # 默认权重为 2
```

## 3. 统一调度的优势

作为通用的批量计算系统，Volcano通过以下关键优势扩展了 Kubernetes 原生调度能力：

### 3.1. 丰富的生态系统支持
* **完整框架支持**
  - 支持 Ray、TensorFlow、PyTorch、MindSpore 等主流 AI 训练框架
  - 支持 Spark、Flink 等大数据处理框架
  - 支持 MPI 等高性能计算框架

* **异构设备支持**
  - 支持 GPU (CUDA/MIG) 调度
  - 支持 NPU 调度

### 3.2. 增强的调度能力
* **Gang 调度**
  - 支持作业级调度
  - 防止资源碎片
  - 适用于分布式训练场景

* **队列资源管理**
  - 支持多租户资源隔离
  - 支持队列间资源借用和回收
  - 支持资源配额管理

### 3.3. 统一资源管理
* **统一资源视图**
  - 统一管理 CPU、内存、GPU/NPU 和其他异构资源
  - 实现资源共享和隔离
  - 提高整体资源利用率