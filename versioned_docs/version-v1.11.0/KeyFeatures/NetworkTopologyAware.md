---
title: "Network Topology Aware Scheduling"
---

## Background

In the context of AI large model training, Model Parallelism divides the model across multiple nodes, requiring frequent and substantial data exchange between these nodes during training. At this point, the network transmission performance between nodes often becomes the bottleneck of training, significantly affecting training efficiency. Data centers have diverse network types (such as IB, RoCE, NVSwitch, etc.), and the network topology is complex, typically involving multiple layers of switches. The fewer switches between two nodes, the lower the communication latency and the higher the throughput. Therefore, users want to schedule workloads to the best performance domain with the highest throughput and lowest latency, minimizing cross-switch communication to accelerate data exchange and improve training efficiency.

To address this, Volcano proposed the **Network Topology Aware Scheduling** strategy, which uses a unified network topology API and intelligent scheduling policies to solve the network communication performance issues in large-scale data center AI training tasks.

## Features

#### Unified Network Topology API: Accurately Expressing Network Topology

To shield the differences in data center network types, Volcano defines a new CRD **[HyperNode](https://github.com/volcano-sh/apis/blob/network-topology-dev/pkg/apis/topology/v1alpha1/hypernode_types.go)** to represent the network topology, providing a standardized API interface. Compared to the traditional method of using node labels to represent network topology, HyperNode has the following advantages:

- **Unified Semantics**: HyperNode provides a standardized way to describe network topology, avoiding the semantic inconsistency issues of the label method.
- **Hierarchical Structure**: HyperNode supports a tree-like hierarchical structure, allowing for more precise representation of the actual network topology.
- **Easy Management**: Cluster administrators can manually create HyperNodes or use network topology auto-discovery tools to maintain HyperNodes.

A HyperNode represents a network topology performance domain, typically mapped to a switch or tor. Multiple HyperNodes are connected hierarchically to form a tree structure. For example, the following diagram shows a network topology composed of multiple HyperNodes:

![](/img/doc/hypernode-example.png)

- **Leaf HyperNodes** (s0, s1, s2, s3): The child node type is the real nodes in the cluster.
- **Non-leaf HyperNodes** (s4, s5, s6): The child node type is other HyperNodes.

In this structure, the communication efficiency between nodes depends on the HyperNode hierarchy span between them. For example:

- **node0** and **node1** belong to s0, achieving the highest communication efficiency.
- **node1** and **node2** need to cross two layers of HyperNodes (s0→s4→s1), resulting in lower communication efficiency.
- **node0** and **node4** need to cross three layers of HyperNodes (s0→s4→s6), resulting in the worst communication efficiency.

##### Key Fields

- **spec.tier:** Represents the hierarchy of the HyperNode. The lower the tier, the higher the communication efficiency between nodes within the HyperNode.
- **spec.members:** A group of child nodes under the HyperNode, which can be matched using a selector.
- **spec.members[i].type:** The type of child node, supporting `Node` and `HyperNode`. When all child nodes are `Node`, the current HyperNode is a leaf node. When all child nodes are `HyperNode`, the current node is a non-leaf HyperNode.
- **spec.members[i].selector:** Child node selector, supporting `exactMatch` and `regexMatch`.
    - `exactMatch` means exact matching, where the child node needs to fill in the full name of the HyperNode or Node.
    - `regexMatch` means regular expression matching, where nodes matching the regular expression are treated as child nodes of the current HyperNode.

> Note: `regexMatch` can only be used in leaf HyperNodes to match real nodes in the cluster. When `spec.members[i].selector.type` is `HyperNode`, `regexMatch` is not supported.

#### Network Topology Aware Scheduling Policy

Volcano Job and PodGroup can set the topology constraints of the job through the `networkTopology` field, supporting the following configurations:

- **mode**: Supports `hard` and `soft` modes.
    - `hard`: Hard constraint, tasks within the job must be deployed within the same HyperNode.
    - `soft`: Soft constraint, tasks are deployed within the same HyperNode as much as possible.
- **highestTierAllowed**: Used with `hard` mode, indicating the highest tier of HyperNode allowed for job deployment. This field is not required when `mode` is `soft`.

For example, the following configuration means the job can only be deployed within HyperNodes of tier 2 or lower, such as s4 and s5, and their child nodes s0, s1, s2, s3. Otherwise, the job will remain in the Pending state:

```yaml
spec:
  networkTopology:
    mode: hard
    highestTierAllowed: 2
```

Through this scheduling strategy, users can precisely control the network topology constraints of the job, ensuring that the job runs in the best performance domain that meets the conditions, thereby significantly improving training efficiency.

