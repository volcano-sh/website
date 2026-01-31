---
title: "TDM"
sidebar_position: 10
---


#### Overview

The full name of TDM is Time Division Multiplexing. In a co-located environment, some nodes are in both Kubernetes cluster and Yarn cluster. For these nodes, Kubernetes and Yarn cluster can use these resource by time-sharing multiplexing.The TDM Plugin marks these nodes as `revocable nodes`. TDM plugin will try to dispatch `preemptable task` to `revocable node` in node revocable time and evict the `preemptable task` from `revocable node` out of revocable time.. TDM Plugin improves the time-division multiplexing ability of node resources in the scheduling process of Volcano.

#### Scenario

In ToB business, cloud vendors provide cloud-based resources for merchants, and different merchants adopt different container arrangement frameworks (Kubernetes/YARN, etc.). TDM Plugin improves the time-sharing efficiency of common node resources and further improves the utilization rate of resources.
