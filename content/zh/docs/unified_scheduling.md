+++
title = "统一调度"
date = 2024-12-30
lastmod = 2024-12-30
draft = false
toc = true
type = "docs"

[menu.docs]
  parent = "features"
  weight = 3
+++

## 概述

Volcano 作为业界领先的云原生批处理系统调度器，通过统一的调度系统实现了对所有工作负载类型的支持：

- 强大的批处理调度能力：通过 VcJob 完美支持 Ray、TensorFlow、PyTorch、MindSpore、Spark、Flink 等主流 AI 和大数据框架
- 完整的 Kubernetes 工作负载支持：可直接调度 Deployment、StatefulSet、Job、DaemonSet 等原生工作负载

这种统一调度能力让用户能够使用单一调度器来管理所有类型的工作负载，极大简化了集群管理复杂度。

## 兼容Kubernetes调度能力

Volcano 通过实现 predicates 和 nodeorder 这两个核心调度插件，完全兼容了 Kubernetes 的调度机制。这两个插件分别对应了 Kubernetes 调度框架中的"预过滤(PreFilter)/过滤(Filter)"和"打分(Score)"阶段。

### 1. predicates 插件
Volcano完整实现了Kube-Scheduler中的预过滤(PreFilter)-过滤(Filter)阶段，包括：

- 基础资源过滤：节点可调度性、Pod 数量限制等
- 亲和性/反亲和性：节点亲和性、Pod 间亲和性等
- 资源约束：节点端口、存储卷限制等
- 拓扑分布：Pod 拓扑分布约束等

除了兼容 Kubernetes 的过滤器外，Volcano 还提供了以下增强特性：

#### 节点过滤结果缓存 (PredicateWithCache)
当调度器为 Pod 选择节点时，需要对每个节点进行一系列检查（如资源是否足够、是否满足亲和性要求等），这些节点过滤结果可以被缓存下来，如果后续还要调度多个完全相同配置的 Pod，可以直接使用之前的检查结果，避免重复进行相同的节点过滤计算，显著提升批量创建 Pod 时的调度性能。

##### 配置方法
在 volcano-scheduler-configmap 中启用缓存：
```
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

##### 使用场景
1. 批量创建相同配置的 Pod
   - 例如：创建多个相同的 TensorFlow 训练任务
   - 第一个 Pod 完成节点过滤后，后续 Pod 可直接使用缓存结果

2. 大规模集群调度优化

> **注意**：
>
> - 只有静态的检查结果才会被缓存（如节点标签、污点等）
> - 动态资源相关的检查（如 CPU、内存用量）每次都会重新计算
> - 当节点状态发生变化时，相关缓存会自动失效

### 2. nodeorder 插件
Volcano 在完全兼容 Kubernetes 默认打分机制的基础上，通过可配置的权重系统来实现更灵活的节点选择策略。同时，Volcano 实现了并行打分处理，显著提升了大规模集群的调度效率，特别适合 AI 训练等批处理场景。

#### 支持的打分维度
1. **资源维度**
   - `leastrequested`: 优先选择资源占用少的节点，适合资源打散场景
   - `mostrequested`: 优先选择资源占用多的节点，适合资源打包场景
   - `balancedresource`: 在 CPU、内存等资源间寻求平衡，避免单一资源瓶颈

2. **亲和性维度**
   - `nodeaffinity`: 根据节点亲和性规则打分
   - `podaffinity`: 根据 Pod 间亲和性规则打分
   - `tainttoleration`: 根据节点污点和 Pod 容忍度打分

3. **其他维度**
   - `imagelocality`: 优先选择已有所需容器镜像的节点
   - `podtopologyspread`: 确保 Pod 在不同拓扑域（如可用区）均匀分布

#### 配置示例
```
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
          # 资源维度权重配置
          leastrequested.weight: 1      # 默认权重为 1
          mostrequested.weight: 0       # 默认权重为 0（即默认不启用）
          balancedresource.weight: 1    # 默认权重为 1
          
          # 亲和性维度权重配置
          nodeaffinity.weight: 2        # 默认权重为 2
          podaffinity.weight: 2         # 默认权重为 2
          tainttoleration.weight: 3     # 默认权重为 3
          
          # 其他维度权重配置
          imagelocality.weight: 1       # 默认权重为 1
          podtopologyspread.weight: 2   # 默认权重为 2
```

## 统一调度配置方式

通过配置 `schedulerName: volcano`，Volcano 可以统一调度 Kubernetes 原生工作负载和 Volcano 工作负载。

### Kubernetes 原生工作负载
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

### Volcano 工作负载
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

### 统一调度的优势

Volcano 作为一个通用的批量计算系统，在继承 Kubernetes 原生调度能力的基础上，具有以下突出优势：

#### 1. 丰富的生态支持
* **完整的框架支持**
  - 支持 Ray、TensorFlow、PyTorch、MindSpore 等主流 AI 训练框架
  - 支持 Spark、Flink 等大数据处理框架
  - 支持 MPI 等高性能计算框架

* **异构设备支持**
  - 支持 GPU（CUDA/MIG）调度
  - 支持 NPU 调度

#### 2. 增强的调度能力
* **Gang Scheduling**
  - 支持作业的整体调度
  - 避免资源碎片化
  - 适用于分布式训练等场景

* **队列资源管理**
  - 支持多租户资源隔离
  - 支持队列间资源借用和回收
  - 支持资源配额管理

#### 3. 统一的资源管理
* **资源视图统一**
  - 统一管理 CPU、内存、GPU/NPU 等异构资源
  - 实现资源共享与隔离
  - 提升整体资源利用率