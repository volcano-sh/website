---
title: "HyperJob"
sidebar_position: 5
---

## 简介
HyperJob 是构建在 Volcano Job 之上的高级编排抽象。它旨在组合多个 Volcano Job 模板，并将分布式训练能力扩展到单集群边界之外。

随着大语言模型（LLM）和基础 AI 模型的规模增长，训练需求往往会超过单集群的资源限制。HyperJob 通过跨多个异构集群（包含各种加速器，如 A100、H100、Ascend 910B/C 等）自动拆分、分发和协调大规模批处理训练任务来解决这些限制，同时保持完整的训练语义并提供统一的状态聚合。

## 示例
以下是跨异构集群拆分的大规模训练作业的配置示例：

```yaml
apiVersion: training.volcano.sh/v1alpha1
kind: HyperJob
metadata:
  name: ascend-heterogeneous-training
spec:
  minAvailable: 2
  replicatedJobs:
  - name: trainer-910b
    replicas: 1
    clusterNames: ["cluster-ascend-910b-1", "cluster-ascend-910b-2"]
    templateSpec:
      tasks:
      - name: worker
        replicas: 64
        template:
          spec:
            affinity:
              nodeAffinity:
                requiredDuringSchedulingIgnoredDuringExecution:
                  nodeSelectorTerms:
                  - matchExpressions:
                    - key: hardware-type
                      operator: In
                      values:
                      - Ascend910B
            containers:
            - name: trainer
              image: training-image:v1
              resources:
                requests:
                  ascend910c: 1
                limits:
                  ascend910c: 1
  - name: trainer-910c
    replicas: 1
    clusterNames: ["cluster-ascend-910c-1"]
    templateSpec:
      tasks:
      - name: worker
        replicas: 64
        template:
          spec:
            affinity:
              nodeAffinity:
                requiredDuringSchedulingIgnoredDuringExecution:
                  nodeSelectorTerms:
                  - matchExpressions:
                    - key: hardware-type
                      operator: In
                      values:
                      - Ascend910C
            containers:
            - name: trainer
              image: training-image:v1
              resources:
                requests:
                  ascend910c: 1
                limits:
                  ascend910c: 1
```

## 核心字段

### HyperJob Spec
* **replicatedJobs**, *必填* 定义由 HyperJob 管理的一组 Volcano Job。每个条目指定了一个模板，该模板可以复制并分发到目标集群中。

* **minAvailable**, *选填* 指定必须运行的子作业的最小数量，以使整个 HyperJob 被视为健康，从而提供部分容错能力。  

> **注意**：该字段目前处于保留状态，未被控制器实际使用，用于未来增强的故障恢复机制。

* **maxDomains**, *选填* 指定 HyperJob 可以拆分到的最大集群（域）数量。  

> **注意**：该字段目前处于保留状态，未被控制器实际使用，用于未来的自动作业拆分功能。

* **plugins**, *选填* 指定启用跨集群协调的特定框架插件。键（Key）代表插件名称，值（Value）是传递给插件的参数列表。  

> **注意**：该字段目前处于保留状态。

---

### ReplicatedJob 配置
* **name**, *必填* HyperJob 层级结构中复制任务的唯一字符串标识符，主要用于状态跟踪。

* **templateSpec**, *必填* Volcano Job 的实际 `v1alpha1.JobSpec`，将作为在目标集群中生成的各个子作业的模板。

* **replicas**, *选填* 使用指定模板创建的独立 Volcano Job 副本的数量。默认值为 1。

* **clusterNames**, *选填* 控制器应尝试调度工作负载的首选目标集群名称列表。空列表意味着没有明确的首选倾向。

* **splitPolicy**, *选填* 配置跨集群的拆分行为。  

> **注意**：该字段目前处于保留状态，用于未来的自动扩缩容和动态外部拆分服务。

---

### SplitPolicy 配置
* **mode**, *选填* 决定拆分策略。支持的选项包括 `static`（用户定义的显式拆分）和 `auto`（控制器或外部引擎驱动的动态拆分）。

* **accelerators**, *选填* 整个作业所需的加速器总数。

* **acceleratorType**, *选填* 指定代表目标芯片架构的精确资源指示符字符串（例如 `nvidia.com/gpu`、`huawei.com/ascend910`）。

## 状态

### Conditions（条件）
Conditions 表示 HyperJob 的最终生命周期里程碑，并且仅在所有子作业结束其生命周期后才会被填充。

* **Completed** 当所有底层的子 Volcano Job 都成功完成时，设置为 `True`。

* **Failed** 当所有底层的子 Volcano Job 都停止执行，但至少有一个子作业遇到失败、中止或异常终止时，设置为 `True`。

> **注意**：在处于活动执行期间，当子工作负载仍处于 pending 或 running 状态时，`Conditions` 块将保持未填充状态，以帮助用户区分“进行中”与“终端结束”状态。

### 观测指标
* **replicatedJobsStatus**：跟踪各个 Volcano Job 的底层映射状态（`JobStates`），以及跨所有作业聚合的实时 Pod 指标（`Pending`、`Running`、`Succeeded`、`Failed`、`Terminating`、`Unknown`）。
* **splitCount**：由高级 HyperJob 资源定义生成的独立 Volcano Job 的完整数量。
* **observedGeneration**：由控制器对账循环（Reconciliation Loop）处理的配置代（Generation）快照。

## 使用场景
HyperJob 是对标准单集群操作的扩展，而非替代。当您的分布式批处理或 AI 训练拓扑横跨多集群基础设施时，请使用 HyperJob。

### 对比矩阵

| 特性 | Volcano Job | HyperJob |
| :--- | :--- | :--- |
| **范围** | 单集群 | 多集群 |
| **抽象层次** | 集群级原语（管理 Pod） | 元级原语（管理 Volcano Job） |
| **主要使用场景** | 批处理工作负载调度 | 跨异构集群的大规模训练 |
| **作业组合** | 包含多个任务的单个作业 | 多个 Volcano Job 的组合 |
| **状态跟踪** | 跟踪单个作业内的 Pod | 聚合跨集群的多个 Volcano Job 的状态 |

## 注意事项

#### 多集群基础设施排除项
HyperJob 明确将底层的多集群基础设施职责卸载给外部系统。以下层级不在其管辖范围内：
* **网络基础设施**：必须提前建立 Pod 到 Pod 的跨集群路由网络、服务网格设置和集群间网络配置。
* **集群联邦**：控制面集群发现、注册和联邦管理引擎必须由外部组件提供。
* **数据管理**：文件/存储同步、模型检查点（Checkpoint）传输和产物状态处理必须在外部处理或通过框架钩子（Hooks）解决。