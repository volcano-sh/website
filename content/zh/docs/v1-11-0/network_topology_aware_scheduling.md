+++
title = "网络拓扑感知调度"

date = 2025-01-21
lastmod = 2025-01-21

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
toc_depth = 5
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
[menu.v1-11-0]
  parent = "features"
  weight = 1
+++

## 背景

在AI大模型训练场景中，模型并行（Model Parallelism）将模型分割到多个节点上，训练过程中这些节点需要频繁进行大量数据交互。此时，节点间的网络传输性能往往成为训练的瓶颈，显著影响训练效率。数据中心的网络类型多样（如IB、RoCE、NVSwitch等），且网络拓扑复杂，通常包含多层交换机。两个节点间跨的交换机越少，通信延迟越低，吞吐量越高。因此，用户希望将工作负载调度到具有最高吞吐量和最低延迟的最佳性能域，尽可能减少跨交换机的通信，以加速数据交换，提升训练效率。

为此，Volcano提出了**网络拓扑感知调度（Network Topology Aware Scheduling）**策略，通过统一的网络拓扑API和智能调度策略，解决大规模数据中心AI训练任务的网络通信性能问题。

> 特性状态: preview

## 功能

#### 统一的网络拓扑API：精准表达网络结构

为了屏蔽数据中心网络类型的差异，Volcano定义了新的CRD **[HyperNode](https://github.com/volcano-sh/apis/blob/network-topology-dev/pkg/apis/topology/v1alpha1/hypernode_types.go)**来表示网络拓扑，提供了标准化的API接口。与传统的通过节点标签（label）表示网络拓扑的方式相比，HyperNode具有以下优势：

- **语义统一**：HyperNode提供了标准化的网络拓扑描述方式，避免了标签方式的语义不一致问题。
- **层级结构**：HyperNode支持树状层级结构，能够更精确地表达实际的网络拓扑。
- **易于管理**：集群管理员可以手动创建HyperNode，或通过网络拓扑自动发现工具维护HyperNode。

一个HyperNode表示一个网络拓扑性能域，通常映射到一个交换机或者Tor。多个HyperNode通过层级连接，形成树状结构。例如，下图展示了由多个HyperNode构成的网络拓扑：

<div style="text-align: center;"> {{<figure library="1" src="./network-topology/hypernode-example.png">}}
</div>

- **叶子HyperNode**（s0、s1、s2、s3）：子节点类型为集群中的真实节点。
- **非叶子HyperNode**（s4、s5、s6）：子节点类型为其他HyperNode。

在这种结构中，节点间的通信效率取决于它们之间的HyperNode层级跨度。例如：

- **node0**和**node1**同属于s0，通信效率最高。
- **node1**和**node2**需要跨两层HyperNode（s0→s4→s1），通信效率较低。
- **node0**和**node4**需要跨三层HyperNode（s0→s4→s6），通信效率最差。

##### 关键字段

- **spec.tier:** 表示HyperNode的层级，层级越低，则该HyperNode内的节点通信效率越高。
- **spec.members:** HyperNode下面的一组子节点，可以通过selector来匹配关联的子节点。
- **spec.members[i].type:** 子节点的类型，支持`Node`和`HyperNode`两种，子节点全部为`Node`时，代表当前HyperNode为叶子节点，子节点全部为`HyperNode`时，代表当前节点为非叶子HyperNode。
- **spec.members[i].selector:** 子节点选择器，支持`exactMatch`和`regexMatch`两种selector。
    - `exactMatch`表示精确匹配，子节点需要填写完整的HyperNode或者Node的name，
    - `regexMatch`表示的是正则匹配，与正则表达式匹配的Node都会被当做当前HyperNode的子节点。

> 注意：regexMatch只能用在叶子HyperNode中，用来匹配集群中的真实节点，也就是说当spec.members[i].selector.type为HyperNode时，不支持regexMatch。

#### 基于网络拓扑的感知调度策略

Volcano Job和PodGroup可以通过`networkTopology`字段设置作业的拓扑约束，支持以下配置：

- **mode**：支持`hard`和`soft`两种模式。
    - `hard`：硬约束，作业内的任务必须部署在同一个HyperNode内。
    - `soft`：软约束，尽可能将作业部署在同一个HyperNode下。
- **highestTierAllowed**：与`hard`模式配合使用，表示作业允许跨到哪层HyperNode部署。

例如，以下配置表示作业只能部署在2层及以下的HyperNode内，如s4和s5，以及更低层的tier: s4和s5的子节点s0，s1，s2，s3，否则作业将处于Pending状态：

```yaml
spec:
  networkTopology:
    mode: hard
    highestTierAllowed: 2
```

通过这种调度策略，用户可以精确控制作业的网络拓扑约束，确保作业在满足条件的最佳性能域运行，从而显著提升训练效率。

## 使用指导

### 安装Volcano

Volcano支持以下两种安装方式：
#### 通过Helm安装（推荐）
```bash
helm repo add volcano-sh https://volcano-sh.github.io/helm-charts
helm repo update
helm install volcano volcano-sh/volcano -n volcano-system --create-namespace --version 1.11.0-network-topology-preview.0
```
#### 使用YAML文件安装
```bash
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/refs/heads/network-topology/installer/volcano-development.yaml
```

### 创建HyperNode CRs

仍以图1中的网络拓扑为例，分别创建叶子节点和非叶子节点HyperNode。本样例仅为使用演示，实际需要创建的HyperNode请以集群中的真实拓扑为准。

先创建叶子节点HyperNode s0，s1，s2和s3。

```yaml
apiVersion: topology.volcano.sh/v1alpha1
kind: HyperNode
metadata:
  name: s0
spec:
  tier: 1 # s0位于tier1
  members:
  - type: Node
    selector:
      exactMatch:
        name: "node-0"
  - type: Node
    selector:
      exactMatch:
        name: "node-1"
---
apiVersion: topology.volcano.sh/v1alpha1
kind: HyperNode
metadata:
  name: s1 # s1位于tier1
spec:
  tier: 1
  members:
  - type: Node
    selector:
      exactMatch:
        name: "node-2"
  - type: Node
    selector:
      exactMatch:
        name: "node-3"
---
apiVersion: topology.volcano.sh/v1alpha1
kind: HyperNode
metadata:
  name: s2 # s2位于tier1
spec:
  tier: 1
  members:
  - type: Node
    selector:
      exactMatch:
        name: "node-4"
  - type: Node
    selector:
      exactMatch:
        name: "node-5"
---
apiVersion: topology.volcano.sh/v1alpha1
kind: HyperNode
metadata:
  name: s3
spec:
  tier: 1 # s3位于tier1
  members:
  - type: Node
    selector:
      exactMatch:
        name: "node-6"
  - type: Node
    selector:
      exactMatch:
        name: "node-7"
```

然后创建非叶子节点s4，s5和s6。

```yaml
apiVersion: topology.volcano.sh/v1alpha1
kind: HyperNode
metadata:
  name: s4 # s4位于tier2
spec:
  tier: 2
  members:
  - type: HyperNode
    selector:
      exactMatch:
        name: "s0"
  - type: HyperNode
    selector:
      exactMatch:
        name: "s1"
---
apiVersion: topology.volcano.sh/v1alpha1
kind: HyperNode
metadata:
  name: s5
spec:
  tier: 2 # s5位于tier2
  members:
  - type: HyperNode
    selector:
      exactMatch:
        name: "s2"
  - type: HyperNode
    selector:
      exactMatch:
        name: "s3"
---
apiVersion: topology.volcano.sh/v1alpha1
kind: HyperNode
metadata:
  name: s6
spec:
  tier: 3 # s6位于tier3
  members:
  - type: HyperNode
    selector:
      exactMatch:
        name: "s4"
  - type: HyperNode
    selector:
      exactMatch:
        name: "s5"
```

### 部署带有拓扑约束的Job

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: mindspore-cpu
spec:
  minAvailable: 3
  schedulerName: volcano
  networkTopology: # 设置network topology约束
    mode: hard
    highestTierAllowed: 2
  queue: default
  tasks:
    - replicas: 3
      name: "pod"
      template:
        spec:
          containers:
            - command: ["/bin/bash", "-c", "python /tmp/lenet.py"]
              image: lyd911/mindspore-cpu-example:0.2.0
              imagePullPolicy: IfNotPresent
              name: mindspore-cpu-job
              resources:
                limits:
                  cpu: "1"
                requests:
                  cpu: "1"
          restartPolicy: OnFailure
```

由于Job的spec.networkTopology.highestTierAllowed为2，因此期望结果为: 不能部署在3层HyperNode s6内，也就是只能部署到node0-node3，**或者**node4-node7内，而不能部署在node0-node7内。

### 注意事项

- 非叶子节点HyperNode的member selector不支持regexMatch。
- regexMatch和exactMatch selector不能同时配置。
- HyperNode的member是Node类型，即HypeNode为叶子节点时，不允许再设置类型为HyperNode的member。
- 叶子节点HyperNode包含了集群中的真实节点，因此使用该特性时必须要创建出叶子HyperNode节点。
- HyperNode之间不能有环依赖，否则Job无法正常调度。
- 一个HyperNode可以有多个子节点，但一个HyperNode最多只能有一个parent HyperNode，否则Job无法正常调度。

## 最佳实践

### 调度器配置

HyperNode的打分是基于其管理的所有节点的打分总和。为了将作业尽可能地集中到相同HyperNode下，减少资源碎片，需要在调度器配置中开启binpack插件并设置合适的权重，binpack策略会优先将Pod调度到已有负载的节点上：

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
    - plugins:
      - name: predicates
      - name: proportion
      - name: nodeorder
      - name: binpack #开启binpack插件
        arguments:
          binpack.weight: 10 #设置较高的权重值，使binpack策略的打分占主导地位，尽可能减少资源碎片
```

### 软约束模式配置

Job的`spec.networkTopology.highestTierAllowed`字段约束了Job允许部署的最高Tier，该值只有在`spec.networkTopology.mode`设置为`hard`时才有意义，因此将`spec.networkTopology.highestTierAllowed`设置为集群中最大的tier时，Job在调度时的资源视图为集群中的所有节点，此时拓扑约束与soft模式一致。因此**若要使用soft模式**，请将`spec.networkTopology.highestTierAllowed`设置为集群中最大的Tier，仍以图1为例，应该设置该值为3。

```yaml
spec:
  networkTopology:
    mode: hard
    highestTierAllowed: 3
```
