---
title: Network Topology Aware
---

## Introduction

The **Network Topology Aware** plugin enables Volcano to make scheduling decisions based on the network proximity between nodes. This is particularly important for distributed training workloads (e.g., large-scale AI/ML training) where network bandwidth and latency between nodes can significantly impact performance.

## Mechanism

The plugin leverages **HyperNode** Custom Resource Definitions (CRDs) to represent the physical network topology of the cluster. A HyperNode defines a grouping of nodes that share the same network characteristics (e.g., nodes under the same ToR switch, or within the same rack).

During scheduling, the plugin:

1. **Scores nodes** based on network proximity — nodes that are "closer" in the network topology to already-scheduled tasks of the same job receive a higher score.
2. **Optimizes placement** for distributed workloads by co-locating tasks that communicate heavily on nodes with the best network connectivity.

## Configuration

Enable the `network-topology-aware` plugin in the scheduler configuration:

```yaml
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
      - name: network-topology-aware   # Enable network topology aware scheduling
      - name: binpack
```

## HyperNode Configuration

To use this plugin, you need to define HyperNode resources that describe your cluster's network topology:

```yaml
apiVersion: topology.volcano.sh/v1alpha1
kind: HyperNode
metadata:
  name: rack-1
spec:
  tier: 2
  members:
    - type: Node
      selector:
        exactMatch:
          name: node-1
    - type: Node
      selector:
        exactMatch:
          name: node-2
```

For detailed information on HyperNode configuration and advanced topology setups, refer to the [Volcano Network Topology documentation](https://github.com/volcano-sh/volcano/blob/master/docs/design/network-topology-aware-scheduling.md).
