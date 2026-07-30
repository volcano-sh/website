---
title: "统一调度"
---
## 1. 概述

Volcano 在平台层提供统一调度能力。从 v1.14 开始，同一个 Kubernetes 集群可以运行两条相互协同的调度路径：

- Volcano Batch Scheduler 面向批处理和弹性工作负载，提供作业级语义、队列、公平性、Gang Scheduling、拓扑约束、抢占和资源回收能力。
- Agent Scheduler 面向延迟敏感的短生命周期 Pod，通过简化的调度流程和多 Worker 并行处理降低排队及调度延迟。

Sharding Controller 负责协调两类调度器。它为每个调度器计算候选节点集合，并通过 `NodeShard` 资源发布结果。不同类型的工作负载不再共用一条调度循环，同时仍使用同一个集群资源池。

Agent Scheduler、Sharding Controller 和 `NodeShard` API 在 v1.15 中仍为 Alpha，后续版本可能调整 API 和配置方式。

## 2. 双路径调度架构

![Volcano 双路径调度架构](/img/doc/unified-scheduling-dual-path.svg)

<!-- PPT 架构图定稿后替换上面的 SVG。 -->

| 组件 | 职责 |
|------|------|
| Volcano Batch Scheduler | 以 Session 为周期调度 AI 训练、HPC、大数据等批处理或弹性工作负载。 |
| Agent Scheduler | 通过快速调度队列和并行 Worker 调度延迟敏感的 Pod。 |
| Sharding Controller | 执行分片策略，为各调度器计算并维护期望节点集合。 |
| `NodeShard` | 记录调度器的期望节点、正在使用节点、待加入节点和待移除节点。 |
| Sharding Coordinator | 在安全的调度周期边界将 `NodeShard` 变更同步到调度器缓存。 |

### 2.1. 选择调度路径

工作负载通过 `spec.schedulerName` 选择调度路径。依赖 Volcano 作业和队列语义的工作负载应使用 Batch Scheduler；以单 Pod 调度延迟为主要目标的工作负载可使用 Agent Scheduler。

```yaml
# Batch 路径
spec:
  schedulerName: volcano
```

```yaml
# 快速路径
spec:
  schedulerName: agent-scheduler
```

v1.15 Helm Chart 默认不启用 Agent Scheduler。启用组件不会自动迁移已有工作负载，Pod 的 `schedulerName` 必须显式指向 Agent Scheduler。

### 2.2. 节点分片模式

两个调度器均可使用 Sharding Controller 发布的节点集合，每个调度器可以独立配置调度范围。

| 模式 | 行为 |
|------|------|
| `none` | 不启用分片，调度器可使用集群内全部节点。默认值为 `none`。 |
| `soft` | 优先使用本调度器分片内的节点；分片内没有可行节点时，可以回退到其他节点。 |
| `hard` | 仅使用本调度器分片内的节点。该模式可避免不同调度器使用同一节点，但会缩小调度范围。 |

通过 `--scheduler-sharding-mode` 配置分片模式。默认情况下，调度器读取与自身名称相同的 `NodeShard`；仅在资源名称必须不同的场景下配置 `--scheduler-sharding-name`。

### 2.3. 配置节点分片

v1.15 的 Sharding Controller 从支持热加载的 ConfigMap 读取配置。每个调度器配置一条有序的策略链，Controller 依次执行过滤、加权排序和选择：

```text
filter -> sort -> select
```

以下示例将较低利用率节点分配给 Batch Scheduler，将较高利用率节点分配给 Agent Scheduler。配置值仅用于说明格式，生产环境的阈值应根据工作负载测量结果确定。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: volcano-sharding-configmap
  namespace: volcano-system
data:
  sharding.yaml: |
    schedulerConfigs:
      - name: volcano
        type: volcano
        policies:
          - name: allocation-rate
            weight: 1
            arguments:
              minCPUUtil: 0.0
              maxCPUUtil: 0.6
          - name: node-limit
            arguments:
              minNodes: 2
              maxNodes: 100

      - name: agent-scheduler
        type: agent
        policies:
          - name: allocation-rate
            weight: 1
            arguments:
              minCPUUtil: 0.7
              maxCPUUtil: 1.0
          - name: warmup
            weight: 5
            arguments:
              warmupLabel: node.volcano.sh/warmup
              warmupLabelValue: "true"
          - name: node-limit
            arguments:
              minNodes: 2
              maxNodes: 50

    shardSyncPeriod: 60s
    enableNodeEventTrigger: true
```

ConfigMap 更新会先经过校验，再在不重启 Controller 的情况下生效。更新内容无效时，Controller 记录错误并继续使用上一份有效配置；ConfigMap 被删除时也会保留最后一次有效配置。

节点分配可能在调度进行期间发生变化。每个调度器的 Sharding Coordinator 会等待活动 Worker 或调度 Session 到达安全边界后再更新缓存，避免分片切换期间调度器缓存与 `NodeShard` 状态不一致。

## 3. 兼容 Kubernetes 调度能力

Volcano 通过实现 predicates 和 nodeorder 这两个核心调度插件，完全兼容了 Kubernetes 的调度机制。这两个插件分别对应了 Kubernetes 调度框架中的”预过滤(PreFilter)/过滤(Filter)“和”打分(Score)“阶段。

### 3.1. predicates 插件
Volcano 完全实现了 Kube-Scheduler 的 PreFilter-Filter 阶段，包括：

- 基础资源过滤：节点可调度性、Pod 数量限制等
- 亲和性/反亲和性：节点亲和性、Pod 间亲和性等
- 资源约束：节点端口、存储卷限制等
- 拓扑分布：Pod 拓扑分布约束等
- 动态资源分配 (Dynamic Resource Allocation, DRA): DRA允许您在集群中灵活地请求、分配和共享GPU等硬件资源

> 1. 关于DRA的详细介绍，请参考：[dynamic-resource-allocation](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/)

> 2. 关于如何在 Volcano 中启用 DRA 的详细步骤，请参考本文档后续的[**3.1.2. 在 Volcano 中启用 DRA（Dynamic Resource Allocation）**](#dra-activation)章节。

除了兼容 Kubernetes 的过滤器外，Volcano 还提供了以下增强特性

#### 3.1.1. 节点过滤结果缓存 (PredicateWithCache)
当调度器为 Pod 选择节点时，需要执行一系列检查（如资源可用性、亲和性要求等）。这些检查结果可以被缓存。如果不久后需要调度配置相同的 Pod，可以重用先前的检查结果，避免重复的节点过滤计算，并在批量创建 Pod 时显著提高调度性能。

##### 3.1.1.1. 配置
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

##### 3.1.1.2. 用例
1. 创建多个配置相同的 Pod
   - 示例：创建多个相同的 TensorFlow 训练任务
   - 第一个 Pod 完成节点过滤后，后续 Pod 可以使用缓存结果

2. 大规模集群调度优化

> **注意**:
>
> - 仅缓存静态检查结果（如节点标签、污点）
> - 动态资源相关检查（如 CPU、内存使用情况）每次都会重新计算
> - 当节点状态发生变化时，相关缓存会自动失效

#### 3.1.2. 在 Volcano 中启用 DRA (动态资源分配) {#dra-activation}
在 Volcano 调度器中启用动态资源分配 (DRA) 支持需要一些步骤。

##### 3.1.2.1 先决条件
在继续配置步骤之前，请确保您的集群满足以下先决条件：

###### 3.1.2.1.1. 配置集群节点 (Containerd)
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

###### 3.1.2.2. 配置 Kube-apiserver
DRA 相关 API 是 k8s 内置资源而不是 CRD 资源，并且这些资源在 v1.32 中默认未注册，
因此您需要设置 kube-apiserver 的启动参数以手动注册 DRA 相关 API，添加或确保您的 kube-apiserver 清单或配置中存在以下标志：
```yaml
--runtime-config=resource.k8s.io/v1beta1=true
```

##### 3.1.2.3. 安装启用了 DRA 功能门控的 Volcano
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

##### 3.1.2.4. 配置 Volcano 调度器插件
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

##### 3.1.2.5. 部署 DRA 驱动程序
要利用动态资源分配，您需要在集群中部署 DRA 驱动程序。驱动程序负责管理动态资源的生命周期。
例如，您可以参考 [kubernetes-sigs/dra-example-driver](https://github.com/kubernetes-sigs/dra-example-driver) 部署示例 DRA 驱动程序进行测试。

对于一些已在实际生产中使用的 DRA 驱动程序，您可以参考：

- [NVIDIA/k8s-dra-driver-gpu](https://github.com/NVIDIA/k8s-dra-driver-gpu)
- [intel/intel-resource-drivers-for-kubernetes](https://github.com/intel/intel-resource-drivers-for-kubernetes)

### 3.2. nodeorder 插件
Volcano 完全兼容 Kubernetes 默认评分机制，并实现了可配置的权重系统，以实现更灵活的节点选择策略。此外，Volcano 实现了并行评分处理，显著提高了大规模集群中的调度效率，特别适合 AI 训练和其他批处理场景。

#### 3.2.1 支持的评分维度
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

#### 3.2.2 配置示例
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

## 4. 统一调度配置方式

通过配置 `schedulerName: volcano`，Volcano 可以统一调度 Kubernetes 原生工作负载和 Volcano 工作负载。

### 4.1. Kubernetes 原生工作负载
```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test
spec:
  replicas: 1
  template:
    spec:
      schedulerName: volcano  # 指定使用 Volcano 调度器
  ...
```

### 4.2. Volcano 工作负载
```
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: test
spec:
  minAvailable: 1
  schedulerName: volcano  # Volcano 工作负载默认使用 volcano 调度器
  ...
```

### 4.3. 统一调度的优势

Volcano 作为一个通用的批量计算系统，在继承 Kubernetes 原生调度能力的基础上，具有以下突出优势：

#### 4.3.1. 丰富的生态支持
* **完整的框架支持**
  - 支持 Ray、TensorFlow、PyTorch、MindSpore 等主流 AI 训练框架
  - 支持 Spark、Flink 等大数据处理框架
  - 支持 MPI 等高性能计算框架

* **异构设备支持**
  - 支持 GPU（CUDA/MIG）调度
  - 支持 NPU 调度

#### 4.3.2. 增强的调度能力
* **Gang Scheduling**
  - 支持作业的整体调度
  - 避免资源碎片化
  - 适用于分布式训练等场景

* **队列资源管理**
  - 支持多租户资源隔离
  - 支持队列间资源借用和回收
  - 支持资源配额管理

#### 4.3.3. 统一的资源管理
* **资源视图统一**
  - 统一管理 CPU、内存、GPU/NPU 等异构资源
  - 实现资源共享与隔离
  - 提升整体资源利用率

## 5. 参考资料

- [Volcano v1.14.0 Release Notes](https://github.com/volcano-sh/volcano/releases/tag/v1.14.0)
- [Volcano v1.15.0 Release Notes](https://github.com/volcano-sh/volcano/releases/tag/v1.15.0)
- [Agent Scheduler 设计文档](https://github.com/volcano-sh/volcano/blob/v1.15.0/docs/design/agent-scheduler.md)
- [Sharding Controller 设计文档](https://github.com/volcano-sh/volcano/blob/v1.15.0/docs/design/sharding_controller.md)
- [Sharding ConfigMap 用户指南](https://github.com/volcano-sh/volcano/blob/v1.15.0/docs/user-guide/how_to_configure_sharding_configmap.md)
