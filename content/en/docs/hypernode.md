

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

### Definition

HyperNode is a Custom Resource Definition (CRD) in Volcano used to represent network topology. It describes the network connectivity relationships and hierarchical structure between nodes in a cluster. A HyperNode can represent a network topology performance domain, typically mapping to a switch or Top of Rack (ToR).

### Example

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

### Key Fields

**spec.tier** (required)

Represents the hierarchy level of the HyperNode. The lower the tier, the higher the communication efficiency between nodes within this HyperNode.

**spec.members** (required)

A set of child nodes under the HyperNode, which can be associated with child nodes through selectors.

**spec.members[i].type** (required)

The type of child node, supporting two types: `Node` and `HyperNode`:

- When all child nodes are `Node`, the current HyperNode is a leaf node
- When all child nodes are `HyperNode`, the current node is a non-leaf HyperNode

**spec.members[i].selector** (required)

Child node selector, supporting three types: `exactMatch`, `regexMatch`, and `labelMatch`:

- `exactMatch`: Exact matching, requires the complete name of the HyperNode or Node
- `regexMatch`: Regular expression matching, all Nodes matching the regular expression will be treated as child nodes of the current HyperNode
- `labelMatch`: Label matching, all nodes with corresponding labels will be treated as child nodes of the current HyperNode

### Resource Status

**status.conditions**

Provides detailed information about the current state of the HyperNode, using the standard Kubernetes Condition format.

**status.nodeCount**

Indicates the total number of nodes contained in the current HyperNode. This is a read-only field, automatically calculated and updated by the system.

### Validation Rules

The HyperNode resource undergoes the following validations during creation and updates:

1. Selector Validation

   :

   - Must specify one of `exactMatch`, `regexMatch`, or `labelMatch`
   - Cannot specify multiple selector types simultaneously

2. Member Type Restrictions

   :

   - When the member type is `HyperNode`, only the `exactMatch` selector can be used
   - `regexMatch` and `labelMatch` selectors are only applicable when the member type is `Node`

### Important Notes

#### Selector Usage Limitations

- regexMatch/labelMatch can only be used in leaf HyperNodes to match real nodes in the cluster
- When spec.members[i].type is HyperNode, regexMatch/labelMatch is not supported
- regexMatch/exactMatch/labelMatch selectors cannot be configured simultaneously; only one type of selector can be configured

#### Structural Constraints

- HyperNodes cannot have circular dependencies, otherwise Jobs cannot be scheduled properly
- A HyperNode can have multiple child nodes, but a HyperNode can have at most one parent HyperNode, otherwise Jobs cannot be scheduled properly
- Leaf HyperNodes contain real nodes in the cluster, so leaf HyperNodes must be created when using network topology-aware scheduling

#### Resource Characteristics

- HyperNode is a cluster-level resource (not a namespace resource), unique across the entire cluster
- Can reference any node in the cluster, regardless of which namespace the node-associated workloads are in
- Requires cluster-level permissions to create and manage
- Can be referenced using the shorthand `hn` in kubectl commands (e.g., `kubectl get hn`)