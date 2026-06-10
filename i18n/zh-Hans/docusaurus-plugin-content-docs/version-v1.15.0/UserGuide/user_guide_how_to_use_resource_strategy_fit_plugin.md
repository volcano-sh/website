---
title: "Resource Strategy Fit 插件用户指南"

---


## 简介

**Resource Strategy Fit 插件**是 Volcano 调度器插件，为 Pod 调度提供智能资源分配策略。支持全局配置与 Pod 级注解，以优化不同工作负载的资源利用率。

## 主要特性

- **多种评分策略**：支持 `LeastAllocated` 与 `MostAllocated` 策略
- **按资源类型配置**：可为 CPU、Memory、GPU 等不同资源类型配置不同策略
- **Pod 级覆盖**：单个 Pod 可通过注解覆盖全局配置
- **加权评分**：通过可配置权重微调各资源的重要性
- **通配符支持**：使用通配符模式匹配资源名称

## 安装

### 1. 安装 Volcano

请参阅 [安装指南](https://github.com/volcano-sh/volcano/blob/master/installer/README.md) 安装 Volcano。

### 2. 配置插件

更新 Volcano 调度器配置：

```bash
kubectl edit cm -n volcano-system volcano-scheduler-configmap
```

在配置中加入 `resource-strategy-fit` 插件：

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: volcano-scheduler-configmap
  namespace: volcano-system
data:
  volcano-scheduler.conf: |
    actions: "reclaim, allocate, backfill, preempt"
    tiers:
    - plugins:
      - name: priority
      - name: gang
      - name: conformance
    - plugins:
      - name: drf
      - name: predicates
      - name: resource-strategy-fit
        arguments:
          resourceStrategyFitWeight: 10
          resources:
            cpu:
              type: "LeastAllocated"
              weight: 1
            memory:
              type: "LeastAllocated"
              weight: 1
            nvidia.com/gpu:
              type: "MostAllocated"
              weight: 2
```

## 全局配置

### 基本配置

插件支持两种主要评分策略：

| 策略 | 说明 | 适用场景 |
|----------|-------------|----------|
| `LeastAllocated` | 优先选择可用资源更多的节点 | 通用工作负载、负载均衡 |
| `MostAllocated` | 优先选择资源利用率更高的节点 | GPU 工作负载、资源集中 |

### 配置参数

```yaml
arguments:
  resourceStrategyFitWeight: 10          # 插件权重（默认：10）
  resources:                              # 按资源类型的配置
    cpu:                                 # 资源名称
      type: "LeastAllocated"             # 评分策略
      weight: 1                          # 资源权重
    memory:
      type: "LeastAllocated"
      weight: 1
    nvidia.com/gpu:
      type: "MostAllocated"
      weight: 2
```

### 高级配置示例

#### 1. GPU 优化配置

```yaml
arguments:
  resourceStrategyFitWeight: 20
  resources:
    cpu:
      type: "LeastAllocated"
      weight: 1
    memory:
      type: "LeastAllocated"
      weight: 1
    nvidia.com/gpu:
      type: "MostAllocated"
      weight: 5
    nvidia.com/gpu/*:                     # 通配符匹配所有 GPU 类型
      type: "MostAllocated"
      weight: 3
```

#### 2. 混合策略配置

```yaml
arguments:
  resourceStrategyFitWeight: 15
  resources:
    cpu:
      type: "LeastAllocated"
      weight: 3
    memory:
      type: "MostAllocated"
      weight: 1
    example.com/custom-resource:
      type: "LeastAllocated"
      weight: 2
```

## Pod 级配置

### Pod 注解

单个 Pod 可通过注解覆盖全局配置：

| 注解键 | 说明 | 示例 |
|----------------|-------------|---------|
| `volcano.sh/resource-strategy-scoring-type` | 覆盖评分策略 | `"LeastAllocated"` 或 `"MostAllocated"` |
| `volcano.sh/resource-strategy-weight` | 覆盖资源权重 | `{"cpu": 2, "memory": 1, "nvidia.com/gpu": 3}` |

### Pod 级示例

#### 1. 为特定 Pod 覆盖策略

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-workload
  annotations:
    volcano.sh/resource-strategy-scoring-type: "MostAllocated"
    volcano.sh/resource-strategy-weight: '{"nvidia.com/gpu": 5, "cpu": 1}'
spec:
  containers:
  - name: gpu-container
    image: nvidia/cuda:11.0-runtime
    resources:
      requests:
        nvidia.com/gpu: 1
        cpu: "2"
        memory: "4Gi"
      limits:
        nvidia.com/gpu: 1
        cpu: "2"
        memory: "4Gi"
  schedulerName: volcano
```

#### 2. 自定义资源权重

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: custom-resource-pod
  annotations:
    volcano.sh/resource-strategy-scoring-type: "LeastAllocated"
    volcano.sh/resource-strategy-weight: '{"cpu": 3, "memory": 2, "example.com/custom": 5}'
spec:
  containers:
  - name: app
    image: my-app:latest
    resources:
      requests:
        cpu: "1"
        memory: "2Gi"
        example.com/custom: "1"
  schedulerName: volcano
```

## Volcano Job 集成

### 基本 Volcano Job

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: resource-strategy-job
spec:
  minAvailable: 2
  schedulerName: volcano
  plugins:
    env: []
    svc: []
  tasks:
  - replicas: 2
    name: worker
    template:
      metadata:
        annotations:
          volcano.sh/resource-strategy-scoring-type: "LeastAllocated"
          volcano.sh/resource-strategy-weight: '{"cpu": 2, "memory": 1}'
      spec:
        containers:
        - name: worker
          image: my-worker:latest
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
            limits:
              cpu: "2"
              memory: "4Gi"
        restartPolicy: Never
```

### 多 Task、多策略 Job

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: mixed-strategy-job
spec:
  minAvailable: 3
  schedulerName: volcano
  plugins:
    env: []
    svc: []
  tasks:
  - replicas: 1
    name: gpu-task
    template:
      metadata:
        annotations:
          volcano.sh/resource-strategy-scoring-type: "MostAllocated"
          volcano.sh/resource-strategy-weight: '{"nvidia.com/gpu": 5, "cpu": 1}'
      spec:
        containers:
        - name: gpu-worker
          image: gpu-app:latest
          resources:
            requests:
              nvidia.com/gpu: 1
              cpu: "1"
              memory: "2Gi"
  - replicas: 2
    name: cpu-task
    template:
      metadata:
        annotations:
          volcano.sh/resource-strategy-scoring-type: "LeastAllocated"
          volcano.sh/resource-strategy-weight: '{"cpu": 3, "memory": 2}'
      spec:
        containers:
        - name: cpu-worker
          image: cpu-app:latest
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
```

## 使用场景

### 1. GPU 工作负载优化

对 GPU 密集型工作负载，使用 `MostAllocated` 策略以集中使用 GPU：

```yaml
# 全局配置
arguments:
  resourceStrategyFitWeight: 20
  resources:
    nvidia.com/gpu:
      type: "MostAllocated"
      weight: 5
    cpu:
      type: "LeastAllocated"
      weight: 1
```

### 2. 负载均衡

对通用工作负载，使用 `LeastAllocated` 策略以均衡分布负载：

```yaml
# 全局配置
arguments:
  resourceStrategyFitWeight: 10
  resources:
    cpu:
      type: "LeastAllocated"
      weight: 2
    memory:
      type: "LeastAllocated"
      weight: 1
```

### 3. 混合工作负载

为不同资源类型组合不同策略：

```yaml
# 全局配置
arguments:
  resourceStrategyFitWeight: 15
  resources:
    cpu:
      type: "LeastAllocated"
      weight: 3
    memory:
      type: "LeastAllocated"
      weight: 2
    nvidia.com/gpu:
      type: "MostAllocated"
      weight: 5
```

## 故障排查

### 验证插件配置

查看调度器日志，确认插件已正确加载：

```bash
kubectl logs -n volcano-system deployment/volcano-scheduler | grep "resource-strategy-fit"
```

预期输出：

```
Initialize resource-strategy-fit plugin with configuration: {resourceStrategyFitWeight: 10, resources: {...}}
```

### 常见问题

1. **插件未加载**：确认调度器配置中已包含该插件
2. **注解无效**：检查 Pod 级权重注解的 JSON 格式是否正确
3. **资源未找到**：确认资源名称完全匹配（区分大小写）
4. **评分未生效**：检查插件权重与各资源权重是否配置正确

### 调试信息

启用调试日志以查看评分决策：

```yaml
# 添加到调度器配置
arguments:
  resourceStrategyFitWeight: 10
  # ... 其他配置
  logLevel: 4  # 启用调试日志
```

## 最佳实践

1. **优先使用全局配置**，保证集群内行为一致
2. **谨慎使用 Pod 级注解**，仅用于有特殊需求的工作负载
3. **对比测试不同策略**，找到适合业务的配置
4. **应用插件后监控资源利用率**
5. **合理设置权重**，平衡不同资源类型
6. **结合工作负载特征**，在 `LeastAllocated` 与 `MostAllocated` 之间选择合适策略
