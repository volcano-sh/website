++
title = "Resource Strategy Fit 插件用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_resource_strategy_fit_plugin/"
[menu.docs]
  parent = "user-guide"
++

## 介绍

**Resource Strategy Fit 插件** 是 Volcano 调度器的一个打分插件，用于在 Pod 调度时提供更智能的资源分配策略。  
它同时支持 **全局配置** 与 **Pod 级注解**，以便在不同工作负载之间平衡资源利用率。

## 关键特性

- **多种打分策略**：支持 `LeastAllocated` 与 `MostAllocated`；
- **按资源类型配置**：可针对 CPU、Memory、GPU 等不同资源设置不同策略；
- **Pod 级覆盖**：单个 Pod 可以通过注解覆盖全局配置；
- **权重控制**：支持为不同资源配置不同权重；
- **通配符支持**：可以使用通配符匹配资源名称。

## 安装

### 1. 安装 Volcano

参考 [安装指南](https://github.com/volcano-sh/volcano/blob/master/installer/README.md) 安装 Volcano。

### 2. 配置插件

更新 Volcano 调度器配置：

```bash
kubectl edit cm -n volcano-system volcano-scheduler-configmap
```

在配置中添加 `resource-strategy-fit` 插件：

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

### 基础配置

插件支持两种主要打分策略：

| 策略             | 描述                                  | 适用场景                     |
|------------------|---------------------------------------|------------------------------|
| `LeastAllocated` | 倾向于选择剩余资源更多的节点          | 一般工作负载、负载均衡       |
| `MostAllocated`  | 倾向于选择资源利用率更高的节点        | GPU 密集、资源整合/打包场景  |

### 配置参数

```yaml
arguments:
  resourceStrategyFitWeight: 10          # 插件整体权重（默认 10）
  resources:                             # 各资源维度的配置
    cpu:                                 # 资源名
      type: "LeastAllocated"             # 打分策略
      weight: 1                          # 权重
    memory:
      type: "LeastAllocated"
      weight: 1
    nvidia.com/gpu:
      type: "MostAllocated"
      weight: 2
```

### 高级配置示例

#### 1. 针对 GPU 优化的配置

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
    nvidia.com/gpu/*:                   # 使用通配符匹配所有 GPU 类型
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

单个 Pod 可以通过注解覆盖全局配置：

| 注解 Key                                    | 描述               | 示例                                           |
|---------------------------------------------|--------------------|------------------------------------------------|
| `volcano.sh/resource-strategy-scoring-type`| 覆盖打分策略       | `"LeastAllocated"` 或 `"MostAllocated"`        |
| `volcano.sh/resource-strategy-weight`       | 覆盖资源权重       | `{"cpu": 2, "memory": 1, "nvidia.com/gpu": 3}` |

### Pod 级示例

#### 1. 为单个 Pod 覆盖策略

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

#### 2. 自定义资源权重示例

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

### 基础 Volcano Job 示例

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

### 多 Task 使用不同策略的 Job

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

## 典型用例

### 1. GPU 工作负载优化

对于 GPU 密集型工作负载，可以使用 `MostAllocated` 策略聚合 GPU 使用：

```yaml
# 全局配置示例
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

对于一般工作负载，可使用 `LeastAllocated` 策略在节点间均衡负载：

```yaml
# 全局配置示例
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

针对不同资源类型组合不同策略：

```yaml
# 全局配置示例
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

### 校验插件配置

通过调度器日志确认插件是否已正确加载：

```bash
kubectl logs -n volcano-system deployment/volcano-scheduler | grep "resource-strategy-fit"
```

期望输出类似：

```text
Initialize resource-strategy-fit plugin with configuration: {resourceStrategyFitWeight: 10, resources: {...}}
```

### 常见问题

1. **插件未加载**：确认调度器配置中已包含 `resource-strategy-fit` 插件；
2. **注解格式错误**：检查 Pod 注解中的 JSON 字符串格式是否正确；
3. **资源名称不匹配**：确认资源名称大小写及前缀完全一致（如 `nvidia.com/gpu`）；
4. **打分无效**：检查插件整体权重及各资源权重是否配置合理。

### 调试信息

可以通过提高日志级别来观察详细打分行为：

```yaml
# 在调度器配置中追加
arguments:
  resourceStrategyFitWeight: 10
  # ... 其他配置 ...
  logLevel: 4  # 启用更详细的调试日志
```

## 最佳实践

1. **优先使用全局配置**，保证整体行为一致性；
2. **谨慎使用 Pod 级覆盖**，只在少数特殊工作负载上做定制；
3. **结合监控数据迭代调优**，观察不同配置下的资源利用率与调度效果；
4. **合理设置权重**，在 CPU/内存/GPU 之间平衡调度目标；
5. 根据业务特性选择 `LeastAllocated` 或 `MostAllocated` 策略，避免一刀切。

