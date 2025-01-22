+++
title = "Network Topology Aware Scheduling"

date = 2025-01-21
lastmod = 2025-01-21

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
toc_depth = 5
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
[menu.docs]
  parent = "features"
  weight = 1
+++

## Background

In the context of AI large model training, Model Parallelism divides the model across multiple nodes, requiring frequent and substantial data exchange between these nodes during training. At this point, the network transmission performance between nodes often becomes the bottleneck of training, significantly affecting training efficiency. Data centers have diverse network types (such as IB, RoCE, NVSwitch, etc.), and the network topology is complex, typically involving multiple layers of switches. The fewer switches between two nodes, the lower the communication latency and the higher the throughput. Therefore, users want to schedule workloads to the best performance domain with the highest throughput and lowest latency, minimizing cross-switch communication to accelerate data exchange and improve training efficiency.

To address this, Volcano proposed the **Network Topology Aware Scheduling** strategy, which uses a unified network topology API and intelligent scheduling policies to solve the network communication performance issues in large-scale data center AI training tasks.

> Feature Status: preview

## Features

#### Unified Network Topology API: Accurately Expressing Network Topology

To shield the differences in data center network types, Volcano defines a new CRD **[HyperNode](https://github.com/volcano-sh/apis/blob/network-topology-dev/pkg/apis/topology/v1alpha1/hypernode_types.go)** to represent the network topology, providing a standardized API interface. Compared to the traditional method of using node labels to represent network topology, HyperNode has the following advantages:

- **Unified Semantics**: HyperNode provides a standardized way to describe network topology, avoiding the semantic inconsistency issues of the label method.
- **Hierarchical Structure**: HyperNode supports a tree-like hierarchical structure, allowing for more precise representation of the actual network topology.
- **Easy Management**: Cluster administrators can manually create HyperNodes or use network topology auto-discovery tools to maintain HyperNodes.

A HyperNode represents a network topology performance domain, typically mapped to a switch or tor. Multiple HyperNodes are connected hierarchically to form a tree structure. For example, the following diagram shows a network topology composed of multiple HyperNodes:

<div style="text-align: center;"> {{<figure library="1" src="./network-topology/hypernode-example.png">}}
</div>

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
- **highestTierAllowed**: Used with `hard` mode, indicating the highest tier of HyperNode allowed for job deployment.

For example, the following configuration means the job can only be deployed within HyperNodes of tier 2 or lower, such as s4 and s5, and their child nodes s0, s1, s2, s3. Otherwise, the job will remain in the Pending state:

```yaml
spec:
  networkTopology:
    mode: hard
    highestTierAllowed: 2
```

Through this scheduling strategy, users can precisely control the network topology constraints of the job, ensuring that the job runs in the best performance domain that meets the conditions, thereby significantly improving training efficiency.

## User Guide

### Installing Volcano

```bash
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/refs/heads/network-topology/installer/volcano-development.yaml
```

### Creating HyperNode CRs

Still using the network topology in Figure 1 as an example, create leaf and non-leaf HyperNodes. This example is for demonstration purposes only; the actual HyperNodes to be created should match the real topology of the cluster.

First, create the leaf HyperNodes s0, s1, s2, and s3.

```yaml
apiVersion: topology.volcano.sh/v1alpha1
kind: HyperNode
metadata:
  name: s0
spec:
  tier: 1 # s0 is at tier1
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
  name: s1 # s1 is at tier1
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
  name: s2 # s2 is at tier1
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
  tier: 1 # s3 is at tier1
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

Then, create the non-leaf HyperNodes s4, s5, and s6.

```yaml
apiVersion: topology.volcano.sh/v1alpha1
kind: HyperNode
metadata:
  name: s4 # s4 is at tier2
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
  tier: 2 # s5 is at tier2
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
  tier: 3 # s6 is at tier3
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

### Deploying a Job with Topology Constraints

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: mindspore-cpu
spec:
  minAvailable: 3
  schedulerName: volcano
  networkTopology: # Set network topology constraints
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

Since the `spec.networkTopology.highestTierAllowed` of the Job is set to 2, the expected result is: the job cannot be deployed within the tier 3 HyperNode s6, meaning it can only be deployed to node0-node3 **or** node4-node7, but not to node0-node7.

### Notes

- Non-leaf HyperNodes' member selectors do not support `regexMatch`.
- `regexMatch` and `exactMatch` selectors cannot be configured simultaneously.
- When a HyperNode's member is of type `Node`, i.e., the HyperNode is a leaf node, it is not allowed to set a member of type `HyperNode`.
- Leaf HyperNodes contain real nodes in the cluster, so this feature requires the creation of leaf HyperNodes.
- HyperNodes cannot have circular dependencies; otherwise, Jobs cannot be scheduled properly.
- A HyperNode can have multiple child nodes, but a HyperNode can have at most one parent HyperNode; otherwise, Jobs cannot be scheduled properly.

## Best Practices

The `spec.networkTopology.highestTierAllowed` field of a Job constrains the highest tier allowed for job deployment. This value is only meaningful when `spec.networkTopology.mode` is set to `hard`. Therefore, when `spec.networkTopology.highestTierAllowed` is set to the maximum tier in the cluster, the resource view of the Job during scheduling includes all nodes in the cluster, making the topology constraint consistent with the `soft` mode. Therefore, **to use the `soft` mode**, set `spec.networkTopology.highestTierAllowed` to the maximum tier in the cluster. Still using Figure 1 as an example, this value should be set to 3.

```yaml
spec:
  networkTopology:
    mode: hard
    highestTierAllowed: 3
```
