---
title: Resource Strategy Fit

---


## 介绍

**资源策略适配插件**是一个 Volcano 调度器插件，为 Pod 调度提供智能资源分配策略。它支持全局配置和 Pod 级注释，以优化不同工作负载的资源利用率。

## 主要特点

- **多种评分策略**：支持“最少分配”和“最多分配”策略
- **特定于资源的配置**：针对不同的资源类型（CPU、内存、GPU等）配置不同的策略
- **Pod-Level Override**：允许单个 Pod 通过注释覆盖全局配置
- **加权评分**：通过可配置的权重微调资源重要性
- **通配符支持**：使用通配符模式进行资源匹配

## 安装

### 1. 安装火山

请参考【安装指南】(https://github.com/volcano-sh/volcano/blob/master/installer/README.md)安装Volcano。

### 2. 配置插件

更新 Volcano 调度程序配置：

```bash
kubectl edit cm -n volcano-system volcano-scheduler-configmap
```

将 `resource-strategy-fit` 插件添加到您的配置中：

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

该插件支持两种主要的评分策略：

| 策略 | 描述 | 使用场景 |
|----------|-------------|----------|
| `LeastAllocated` | 倾向于选择可用资源较多的节点 | 通用工作负载、负载均衡 |
| `MostAllocated` | 倾向于选择资源利用率较高的节点 | GPU 工作负载、资源整合 |

### 配置参数

```yaml
arguments:
  resourceStrategyFitWeight: 10          # Plugin weight (default: 10)
  resources:                              # Resource-specific configuration
    cpu:                                 # Resource name
      type: "LeastAllocated"             # Scoring strategy
      weight: 1                          # Resource weight
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
    nvidia.com/gpu/*:                     # Wildcard for all GPU types
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

### Pod 注释

各个 Pod 可以使用注释覆盖全局配置：

| 注解键 | 描述 | 示例 |
|----------------|-------------|---------|
| `volcano.sh/resource-strategy-scoring-type` | 覆盖评分策略 | `"LeastAllocated"` 或 `"MostAllocated"` |
| `volcano.sh/resource-strategy-weight` | 覆盖资源权重 | `{"cpu": 2, "memory": 1, "nvidia.com/gpu": 3}` |

### Pod 级示例

#### 1. 覆盖特定 Pod 的策略

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

## 火山工作整合

### 基本火山工作

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

### 具有不同策略的多任务作业

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

## 使用案例

### 1. GPU 工作负载优化

对于 GPU 密集型工作负载，请使用“MostAllocation”策略来整合 GPU 使用情况：

```yaml
# Global configuration
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

对于一般工作负载，使用“LeastAllocation”策略来均匀分配负载：

```yaml
# Global configuration
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

针对不同的资源类型结合不同的策略：

```yaml
# Global configuration
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

## 故障排除

### 验证插件配置

检查调度程序日志以确保插件正确加载：

```bash
kubectl logs -n volcano-system deployment/volcano-scheduler | grep "resource-strategy-fit"
```

Expected output:
```
Initialize resource-strategy-fit plugin with configuration: {resourceStrategyFitWeight: 10, resources: {...}}
```

### 常见问题

1. **插件未加载**：确保插件包含在调度程序配置中
2. **无效注解**：检查Pod级别权重注解的JSON格式
3. **找不到资源**：验证资源名称是否完全匹配（区分大小写）
4. **评分不起作用**：检查插件权重和资源权重是否正确配置

### 调试信息

启用调试日志记录以查看评分决策：

```yaml
# Add to scheduler configuration
arguments:
  resourceStrategyFitWeight: 10
  # ... other configuration
  logLevel: 4  # Enable debug logging
```

## 最佳实践

1. **从全局配置开始**，以在所有工作负载中保持一致的行为
2. **针对特定工作负载需求谨慎使用 pod 级注释**
3. **测试不同的策略**以找到适合您的用例的最佳配置
4. **应用插件后监控资源利用率**
5. **使用适当的权重**来平衡不同的资源类型
6. **在“LeastAllocation”和“MostAlowned”之间进行选择时，请考虑工作负载特征**