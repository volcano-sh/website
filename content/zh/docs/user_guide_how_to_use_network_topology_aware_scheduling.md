+++
title = "网络拓扑感知调度用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_network_topology_aware_scheduling/"
[menu.docs]
  parent = "user-guide"
+++

## 1 背景

在 AI 大模型训练场景中，模型并行（Model Parallelism）会将同一个模型拆分到多个节点上运行，训练过程中这些节点之间需要进行频繁且大量的数据交换。此时，节点间的网络传输性能常常成为训练的主要瓶颈，从而显著影响整体训练效率。

数据中心内网络形态多样（如 IB、RoCE、NVSwitch 等），网络拓扑结构也往往非常复杂，通常包含多层交换机。**两个节点间需要经过的交换机层数越少，通信时延越低、吞吐越高**。因此，用户希望能够将作业调度到**性能最优（高带宽、低时延）的网络域**中，最大限度地减少跨交换机通信，从而加速数据交换并提升训练效率。

为此，Volcano 提出了 **网络拓扑感知调度（Network Topology Aware Scheduling）** 策略，通过统一的网络拓扑 API 与智能调度策略，解决大规模数据中心 AI 训练任务中的网络通信性能问题。

## 2 功能特性

### 2.1 统一网络拓扑 API：精确表达网络拓扑

为屏蔽数据中心底层网络类型（IB/RoCE/NVSwitch 等）的差异，Volcano 定义了一种新的 CRD —— **HyperNode**，用于表示网络拓扑，并提供统一的 API 接口。与传统直接使用节点标签描述网络拓扑的做法相比，HyperNode 具有以下优势：

- **语义统一**：提供标准化的方式描述网络拓扑，避免标签方案下语义不一致的问题；
- **层次结构清晰**：支持树状分层结构，更精确地表达真实的网络拓扑；
- **易于管理**：集群管理员既可以手工创建 HyperNode，也可以通过自动发现工具维护。

一个 HyperNode 通常代表一个网络性能域，通常可映射到某一层交换机或 TOR。多个 HyperNode 通过层级结构组成拓扑树。例如，下图展示了由多个 HyperNode 组成的网络拓扑：

![hypernode-tree-structure.png](/img/network-topology/hypernode-example.png)

在该结构中，节点间通信效率取决于它们之间跨越的 HyperNode 层级：

- node0 与 node1 同属于 s0，通信效率最高；
- node1 与 node2 之间需要跨越两层 HyperNode（s0→s4→s1），通信效率较低；
- node0 与 node4 之间需要跨越三层 HyperNode（s0→s4→s6），通信效率最差。

### 2.2 HyperNode 自动发现：简化网络拓扑管理

为进一步减轻网络拓扑信息的维护成本，Volcano 提供了 **HyperNode 自动发现** 功能。该功能会自动发现集群内的网络拓扑结构，并基于发现结果：

- 创建、更新或删除对应的 HyperNode CR；
- 支持从多种数据源（如 UFM、RoCE、节点标签）自动同步拓扑信息；
- 周期性地更新 HyperNode，保证拓扑信息与真实网络状态保持一致；
- 通过可插拔的 Discoverer 组件，支持对接自定义网络管理工具。

借助自动发现机制，用户只需关注作业侧的调度配置，而无需关心 HyperNode 的创建与维护细节，从而显著简化网络拓扑感知调度的使用与运维。

### 2.3 网络拓扑约束：提升网络通信效率

在 Volcano Job 中，可以通过 `networkTopology` 字段为作业配置网络拓扑约束。主要配置方式如下：

- `mode`：约束模式，支持：
  - `hard`：硬约束，Job 内所有任务必须部署在同一个 HyperNode 中；
  - `soft`：软约束，尽可能将任务部署在同一个 HyperNode 中。
- `highestTierAllowed`：与 hard 模式配合使用，用于指定 Job 允许部署的最高 HyperNode 层级；  
  当 `mode` 为 `soft` 时，该字段可以省略。

例如，以下配置表示：Job 只能部署在 **层级 ≤ 2** 的 HyperNode 中（如 s4、s5 及其子节点 s0、s1、s2、s3），否则 Job 会保持 Pending 状态：

```yaml
spec:
  networkTopology:
    mode: hard
    highestTierAllowed: 2
```

通过该配置，用户可以精确控制 Job 的网络拓扑约束，保证作业运行在满足条件的最佳性能域中，从而显著提升训练效率。

### 2.4 子分组亲和策略：细粒度控制分布式作业的调度约束

在超大规模模型训练场景中，整个训练任务往往需要海量资源，通常无法完全部署在同一网络性能域内。这时通常需要进行：

- **流水线并行（PP）**；
- **数据并行（DP）**；

从而使不同并行分区部署在不同的网络性能域中。

为此，Volcano 提供了 **子分组亲和策略（SubGroup Affinity Policy）**。在 Volcano Job 中，可以通过 `partitionPolicy` 字段将同一个 Job 内的 Pod 分成若干分区，并为每个分区配置独立的网络拓扑约束：

- 调度时，每个分区会独立遵循自身的网络拓扑约束；
- 同时，每个分区依然要满足 Gang 调度约束：只有当分区内所有 Pod 都满足条件时，该分区才会整体被调度。

例如，以下配置表示：

- 整个 Job 只能调度到 **Tier ≤ 2** 的 HyperNode 上；
- Job 内 8 个 Pod 被划分为 2 个分区，每个分区都只能调度到 **Tier ≤ 1** 的 HyperNode：

```yaml
spec:
  networkTopology:
    mode: hard
    highestTierAllowed: 2
  tasks:
    - name: "task1"
      replica: 8
      partitionPolicy:
        totalPartitions: 2
        partitionSize: 4
        networkTopology:
          mode: hard
          highestTierAllowed: 1
      template:
      # pod template
```

### 2.5 HyperNode 级别 Bin Packing：提升网络性能域资源利用率

在带网络拓扑约束的工作负载调度中，调度器会优先将作业调度到 **当前资源利用率更高的 HyperNode**，以提升网络性能域维度的资源利用率。

如下图所示，假设集群中存在两个 Tier 1 HyperNode，其中 HyperNode0 已经被其他任务占用了一部分资源。用户提交了一个 Volcano Job，并将其划分为两个分区，每个分区都配置了 `highestTierAllowed=1`：

![hypernode-binpack.png](/img/network-topology/hypernode-binpack.png)

- 如果不启用 HyperNode 级别 binpack，可能出现的调度结果是：分区 0 调度到 HyperNode0，分区 1 调度到 HyperNode1；
- 启用 HyperNode 级别 binpack 后，两个分区都会**优先调度到 HyperNode0**，从而将 HyperNode1 保持为空闲，以供其他更大规模、带拓扑约束的任务使用。

对于**没有网络拓扑约束**的工作负载，调度器同样会优先选择 **HyperNode 维度资源利用率更高**（会综合考虑各层级 HyperNode）的节点，从而减少 HyperNode 维度的资源碎片。

例如，下图展示了一个包含 8 个节点与 7 个 HyperNode 的集群，其中 node0、node2、node4 的资源已被占用，其余节点空闲。此时提交一个包含两个独立 Pod 的 Volcano Job：

![hypernode-binpack-normal-pods.png](/img/network-topology/hypernode-binpack-normal-pods.png)

- 未启用 HyperNode 级 binpack 时，这两个 Pod 可能被调度到 node1 与 node6，或 node3 与 node7，导致 HyperNode 级碎片加重；
- 启用后，两者会优先被调度到 node1 与 node3，从而将 node5、node6、node7 保留下来，用于后续更大规模、带拓扑约束的任务。

## 3 使用指南

### 3.1 安装 Volcano

参考 [安装指南](https://github.com/volcano-sh/volcano/blob/master/installer/README.md) 安装 Volcano。

安装完成后，更新调度器配置：

```shell
kubectl edit cm -n volcano-system volcano-scheduler-configmap
```

示例配置：

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
      - name: proportion
      - name: nodeorder
      - name: binpack
      - name: network-topology-aware # 启用 network-topology-aware 插件
        arguments:
          weight: 10
          hypernode.binpack.cpu: 5                                     # HyperNode 级 CPU binpack 权重
          hypernode.binpack.memory: 1                                  # HyperNode 级内存 binpack 权重
          hypernode.binpack.resources: nvidia.com/gpu, example.com/foo # 参与 binpack 的自定义资源
          hypernode.binpack.resources.nvidia.com/gpu: 2                # "nvidia.com/gpu" 维度权重
          hypernode.binpack.resources.example.com/foo: 3               # "example.com/foo" 维度权重
          hypernode.binpack.normal-pod.enable: true                    # 是否对普通 Pod 启用 HyperNode 级 binpack
          hypernode.binpack.normal-pod.fading: 0.8                     # 控制不同层级 HyperNode 权重的衰减参数：tier i 的权重为 math.Pow(fading, i-1)
```

### 3.2 构建网络拓扑

#### 3.2.1 通过 HyperNode 自动发现构建（推荐）

推荐使用 HyperNode 自动发现功能自动构建网络拓扑，详见  
《[如何使用 HyperNode 自动发现](/zh/docs/user-guide/how_to_use_hypernode_auto_discovery/)》。

#### 3.2.2 手工构建

也可以通过手动创建 HyperNode CR 的方式构建网络拓扑。  
更多细节请参考 CRD `hypernodes.topology.volcano.sh` 的定义。

### 3.3 使用网络拓扑感知调度部署工作负载

以下内容基于前文所示的网络拓扑图，演示不同配置方式下工作负载的调度结果。

![workload-deploy-example.png](/img/network-topology/workload-deploy-example.png)

#### 3.3.1 在 Volcano Job 中配置网络拓扑约束

1. 创建一个 Volcano Job，使每个 Pod 请求占满单个节点的 CPU 资源。示例如下：

   ```yaml
   apiVersion: batch.volcano.sh/v1alpha1
   kind: Job
   metadata:
     name: network-topology-job
     namespace: default
   spec:
     schedulerName: volcano
     minAvailable: 4
     networkTopology:
       mode: hard
       highestTierAllowed: 1
     tasks:
       - name: t0
         replicas: 8
         template:
           spec:
             containers:
               - name: c0
                 image: nginx:latest
                 resources:
                   requests:
                     cpu: "4"
                   limits:
                     cpu: "4"
   ```

2. 预期调度结果类似：

   ```shell
   $ kubectl get pod -owide
   NAME                        READY   STATUS    RESTARTS   AGE   IP             NODE
   network-topology-job-t0-0   1/1     Running   0          5s    192.168.0.10   node4
   network-topology-job-t0-1   1/1     Running   0          5s    192.168.0.11   node5
   network-topology-job-t0-2   1/1     Running   0          5s    192.168.0.12   node6
   network-topology-job-t0-3   1/1     Running   0          5s    192.168.0.13   node7
   network-topology-job-t0-4   0/1     Pending   0          5s    <none>         <none>
   network-topology-job-t0-5   0/1     Pending   0          5s    <none>         <none>
   network-topology-job-t0-6   0/1     Pending   0          5s    <none>         <none>
   network-topology-job-t0-7   0/1     Pending   0          5s    <none>         <none>
   ```

   在该示例中，由于 Job 不允许跨 Tier 1 HyperNode 调度，且 HyperNode1 仅包含 4 个节点（Node4~Node7），因此只有 4 个 Pod 处于 Running 状态，其余 Pod 仍为 Pending。

#### 3.3.2 同时配置网络拓扑约束与子分组亲和策略

1. 创建一个 Volcano Job，同样让每个 Pod 请求单节点全部 CPU，但同时将 8 个 Pod 分成 2 个分区，并为每个分区配置更严格的网络拓扑约束。示例如下：

   ```yaml
   apiVersion: batch.volcano.sh/v1alpha1
   kind: Job
   metadata:
     name: network-topology-job
     namespace: default
   spec:
     schedulerName: volcano
     minAvailable: 4
     networkTopology:
       mode: hard
       highestTierAllowed: 2
     tasks:
       - name: t0
         replicas: 8
         partitionPolicy:
           totalPartitions: 2
           partitionSize: 4
           networkTopology:
             mode: hard
             highestTierAllowed: 1
         template:
           spec:
             containers:
               - name: c0
                 image: nginx:latest
                 resources:
                   requests:
                     cpu: "4"
                   limits:
                     cpu: "4"
   ```

2. 预期调度结果类似：

   ```shell
   $ kubectl get pod -owide
   NAME                        READY   STATUS    RESTARTS   AGE   IP             NODE
   network-topology-job-t0-0   1/1     Running   0          5s    192.168.0.10   node2
   network-topology-job-t0-1   1/1     Running   0          5s    192.168.0.11   node3
   network-topology-job-t0-2   1/1     Running   0          5s    192.168.0.12   node1
   network-topology-job-t0-3   1/1     Running   0          5s    192.168.0.13   node0
   network-topology-job-t0-4   1/1     Running   0          5s    192.168.0.14   node4
   network-topology-job-t0-5   1/1     Running   0          5s    192.168.0.15   node5
   network-topology-job-t0-6   1/1     Running   0          5s    192.168.0.16   node6
   network-topology-job-t0-7   1/1     Running   0          5s    192.168.0.17   node7
   ```

   在该示例中：

   - 整个 Job 被调度到 HyperNode2（Node0~Node7）；
   - 第一个分区（Pod0~Pod3）被调度到 HyperNode0（Node0~Node3）；
   - 第二个分区（Pod4~Pod7）被调度到 HyperNode1（Node4~Node7）；
   - 每个分区都满足自身的网络拓扑约束。

#### 3.3.3 不启用网络拓扑约束的 Volcano Job

1. 创建一个只包含两个独立 Pod 的 Volcano Job，每个 Pod 请求占满单节点 CPU 资源，示例如下：

   ```yaml
   apiVersion: batch.volcano.sh/v1alpha1
   kind: Job
   metadata:
     name: network-topology-job
     namespace: default
   spec:
     schedulerName: volcano
     minAvailable: 2
     tasks:
       - name: t0
         replicas: 2
         template:
           spec:
             containers:
               - name: c0
                 image: nginx:latest
                 resources:
                   requests:
                     cpu: "4"
                   limits:
                     cpu: "4"
   ```

2. 预期调度结果类似：

   ```shell
   $ kubectl get pod -owide
   NAME                        READY   STATUS    RESTARTS   AGE   IP             NODE
   network-topology-job-t0-0   1/1     Running   0          5s    192.168.0.10   node0
   network-topology-job-t0-1   1/1     Running   0          5s    192.168.0.11   node1
   ```

   由于集群中其他资源均空闲：

   - 第一个 Pod（`network-topology-job-t0-0`）会被调度到任意节点（示例中为 node0）；
   - 第二个 Pod 必须在同一 HyperNode 内选择另一台节点，此处为 node1（也可能是 node2 或 node3），  
     原因在于此时 HyperNode0 的资源利用率高于 HyperNode1，启用 HyperNode 级别 binpack 后，调度器会优先将该 Pod 放在 HyperNode0 内。

