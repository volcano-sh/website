+++

title =  "Hypernode"

date = 2025-08-10
lastmod = 2025-08-10

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.

linktitle = "Hypernode"
[menu.docs]
  parent = "concepts"
  weight = 4

+++

### 定义

HyperNode是Volcano中用于表示网络拓扑结构的自定义资源（CRD），它描述了集群中节点之间的网络连接关系和层级结构。HyperNode可以表示一个网络拓扑性能域，通常映射到一个交换机或者ToR（Top of Rack）。

### 样例

```yaml
apiVersion: topology.volcano.sh/v1alpha1
kind: HyperNode
metadata:
  name: rack-1
spec:
  tier: 1
  members:
  - type: Node
    selector:
      labelMatch:
        matchLabels:
          topology-rack: rack-1
---
apiVersion: topology.volcano.sh/v1alpha1
kind: HyperNode
metadata:
  name: zone-a
spec:
  tier: 2
  members:
  - type: HyperNode
    selector:
      exactMatch:
        name: "rack-1"
  - type: HyperNode
    selector:
      exactMatch:
        name: "rack-2"
```

### 关键字段

spec.tier（必填）

表示HyperNode的层级，层级越低，则该HyperNode内的节点通信效率越高。

spec.members（必填）

HyperNode下面的一组子节点，可以通过selector来匹配关联的子节点。

spec.members[i].type（必填）

子节点的类型，支持`Node`和`HyperNode`两种：

- 当子节点全部为`Node`时，代表当前HyperNode为叶子节点
- 当子节点全部为`HyperNode`时，代表当前节点为非叶子HyperNode

spec.members[i].selector（必填）

子节点选择器，支持`exactMatch`，`regexMatch`，和`labelMatch`三种selector：

- `exactMatch`：精确匹配，需要填写完整的HyperNode或Node的name
- `regexMatch`：正则匹配，与正则表达式匹配的Node都会被当做当前HyperNode的子节点
- `labelMatch`：按标签匹配，带有对应标签的节点都会被当做当前HyperNode的子节点

### 资源状态

status.conditions

提供关于HyperNode当前状态的详细信息，使用标准的Kubernetes Condition格式。

status.nodeCount

表示当前HyperNode中包含的节点总数。这是一个只读字段，由系统自动计算和更新。

### 验证规则

HyperNode资源在创建和更新时会进行以下验证：

1. **选择器验证**：
   - 必须指定`exactMatch`、`regexMatch`或`labelMatch`中的一种
   - 不能同时指定多种选择器类型
2. **成员类型限制**：
   - 当成员类型为`HyperNode`时，只能使用`exactMatch`选择器
   - `regexMatch`和`labelMatch`选择器仅适用于成员类型为`Node`的情况

### 说明事项

#### 选择器使用限制

- regexMatch/labelMatch只能用在叶子HyperNode中，用来匹配集群中的真实节点
- 当spec.members[i].type为HyperNode时，不支持regexMatch/labelMatch
- regexMatch/exactMatch/labelMatch selector不能同时配置，只能配置一种selector

#### 结构约束

- HyperNode之间不能有环依赖，否则Job无法正常调度
- 一个HyperNode可以有多个子节点，但一个HyperNode最多只能有一个parent HyperNode，否则Job无法正常调度
- 叶子节点HyperNode包含了集群中的真实节点，因此使用网络拓扑感知调度功能时必须要创建出叶子HyperNode节点

#### 资源特性

- HyperNode是集群级别的资源（非命名空间资源），在整个集群中唯一
- 可以引用集群中的任何节点，无论节点关联的工作负载位于哪个命名空间
- 需要集群级别的权限才能创建和管理
- 可以使用简写`hn`在kubectl命令中引用（例如：`kubectl get hn`）