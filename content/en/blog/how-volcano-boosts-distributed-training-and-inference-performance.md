+++
title =  "How volcano boosts distributed training and inference performance"
description = "Join Volcano at KubeCon + CloudNativeCon Europe, 1-4 April 2025 in London!"
subtitle = ""

date = 2025-04-01
lastmod = 2025-04-01
datemonth = "Apr"
dateyear = "2025"
dateday = 01

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["volcano"]

tags = ["News"]
summary = "Join Volcano at KubeCon + CloudNativeCon Europe, 1-4 April 2025 in London!"

# Add menu entry to sidebar.
linktitle = "How volcano boosts distributed training and inference performanc"
[menu.posts]
parent = "news"
weight = 6
+++

## The Growing Demand for LLM Workloads and Associated Challenges

The increasing adoption of large language models (LLMs) has led to heightened demand for efficient AI training and inference workloads. As model size and complexity grow, distributed training and inference have become essential. However, this expansion introduces challenges in network communication, resource allocation, and fault recovery within large-scale distributed environments. These issues often create performance bottlenecks that hinder scalability.

## Addressing Network Bottlenecks Through Topology-Aware Scheduling

In LLM training, model parallelism distributes workloads across multiple nodes, requiring frequent data exchanges. Network communication can become a bottleneck, particularly in heterogeneous environments with InfiniBand (IB), RoCE, or NVSwitch configurations. Communication efficiency depends on network topology—fewer switches between nodes typically result in lower latency and higher throughput.
One approach to mitigating this challenge is Network Topology-Aware Scheduling, which optimizes workload placement to minimize cross-switch communication. A key component of this strategy is the HyperNode, an abstraction for representing network topology via Custom Resource Definitions (CRDs). Unlike label-based methods, HyperNode provides a hierarchical structure that reflects actual network layouts, improving management and optimization. Nodes within the same HyperNode communicate more efficiently than those spanning multiple layers.

<div style="text-align: center;"> {{<figure library="1" src="./network-topology/hypernode-example.png">}}
</div>

Topology constraints can also be specified for jobs through the networkTopology field, with options for strict (Hard Mode) or flexible (Soft Mode) enforcement. This granular control helps ensure workloads are deployed in optimal network environments, reducing latency and improving throughput.

## Managing Multi-Cluster Environments for Scalability

As AI workloads expand, single Kubernetes clusters may no longer suffice for large-scale training and inference. While multiple clusters can address this limitation, managing them efficiently presents challenges.
The Volcano Global subproject extends scheduling capabilities to multi-cluster environments, integrating with Karmada to enable cross-cluster scheduling for distributed workloads. Features such as Queue Priority Scheduling, Job Priority Scheduling, and Multi-Tenant Fair Scheduling help optimize resource allocation and ensure equitable access across tenants. This approach simplifies multi-cluster management while supporting scalable AI workloads.

<div style="text-align: center;"> {{<figure library="1" src="./multi-cluster/volcano_global_design.svg">}}
</div>

## Improving Stability with Fine-Grained Fault Recovery

Fault recovery is critical in distributed AI training and inference. Traditional methods often restart entire jobs upon a single Pod failure, leading to resource inefficiencies. With checkpointing and resume-from-checkpoint techniques, full restarts are often unnecessary.
Fine-Grained Job Fault Recovery allows policies to restart only failed Pods or associated tasks, reducing unnecessary disruptions. Timeout configurations can further minimize interventions—if a Pod recovers within the allotted time, no restart is triggered. This approach enhances stability and efficiency in distributed workloads.

## Future Developments in Distributed Workload Management

Ongoing advancements in distributed workload management include:
- Task-Level Network Topology Affinity Scheduling: Support for distributed inference scenarios, such as integration with lws.

- HyperNode Auto-Discovery and Status Updates: Automation for HyperNode lifecycle management.

- Dynamic Resource Allocation (DRA): Improved management of heterogeneous resources.

- Dynamic GPU Partitioning: Support for MIG and MPS to enhance GPU utilization.

More information for Volcano:
- Website: https://volcano.sh/

- GitHub: https://github.com/volcano-sh/volcano

- Slack: Join the conversation onVolcano Slack.

- Weekly Meetings: Attend our weekly meetings and review meeting notes:

    - Meeting Link: [Zoom](https://zoom.us/j/91804791393)

    - Meeting Notes: [Google Docs](https://docs.google.com/document/d/1YLbF8zjZBiR9PbXQPB22iuc_L0Oui5A1lddVfRnZrqs/edit?tab=t.0#heading=h.u99fvvct3m1z)

- Twitter: Follow us on [X (formerly Twitter)](https://x.com/volcano_sh) for the latest updates.

