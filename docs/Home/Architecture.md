---
title: "Architecture"
sidebar_position: 2
---

## Overall Architecture

Volcano provides unified scheduling and resource management for Kubernetes, with extensive integrations across the cloud-native ecosystem. It supports AI training, inference, data processing, and agent workloads, from individual Pods to distributed applications. A rich set of scheduling plugins combines gang scheduling and network topology awareness with queue management, preemption, and resource reclaim, allowing workloads with different requirements to share cluster resources.

[![Volcano workloads, scheduling capabilities, and integrations](/img/doc/volcano-overview.svg)](/img/doc/volcano-overview.svg)

## Components

[![Volcano controllers, schedulers, admission webhooks, and worker nodes connected through the Kubernetes API server](/img/doc/volcano-components.svg)](/img/doc/volcano-components.svg)

### Volcano Scheduler

Volcano Scheduler primarily handles batch workloads, using PodGroups to express the scheduling requirements of related Pods. Its pluggable architecture supports a wide range of policies, including gang scheduling, network topology-aware scheduling, preemption within a queue, and resource reclaim across queues. Plugins can be combined or extended to suit different workloads.

See the [scheduler overview](../Scheduler/Overview.md) and [configuration guide](../UserGuide/user_guide_how_to_configure_scheduler.md).

### Agent Scheduler

Agent Scheduler is designed for workloads that need low Pod scheduling latency, such as frequently created, short-lived agent tasks. Workers select nodes in parallel, and a binder checks for conflicts before binding Pods. Pods select this scheduler through `spec.schedulerName`.

It can run alongside Volcano Scheduler, with NodeShards coordinating which nodes each scheduler uses. See the [Agent Scheduler design](https://github.com/volcano-sh/volcano/blob/master/docs/design/agent-scheduler.md).

### Volcano Controllers

Volcano Controllers manage jobs, workflows, PodGroups, and queues. The Job Controller creates Pods and a PodGroup for each VolcanoJob and handles task completion or failure. Other controllers manage recurring jobs, workflows, queue state, and supporting tasks such as colocation configuration and cleanup. HyperNode and Sharding controllers maintain the topology and node assignments used by the schedulers.

External operators can also manage their own workloads and integrate with Volcano through PodGroups.

### Admission

Admission webhooks validate resource definitions and supply default values. The Kubernetes API server calls them when users or controllers create or update resources, so invalid job and queue settings can be rejected before they reach the controllers or schedulers.

### HyperNode Controller

The HyperNode Controller discovers network topology from node labels or external topology services and maintains a tree of HyperNodes. Each HyperNode represents a topology domain, such as nodes connected to the same switch. The scheduler uses this hierarchy to place workloads according to their network requirements.

It runs with Volcano Controllers by default and can also be deployed separately. See [network topology-aware scheduling](../KeyFeatures/NetworkTopologyAware.md) and [HyperNode discovery](../UserGuide/user_guide_how_to_use_hypernode_auto_discovery.md).

### Sharding Controller

The Sharding Controller dynamically assigns nodes to schedulers through NodeShard resources. Its policies can account for resource allocation rates, prefer nodes marked as warm, and limit shard size. Allocation rates are calculated from Pod resource requests and node capacity.

Coordinators inside the schedulers watch NodeShard changes and arrange node handoffs around scheduling cycles. These changes affect future scheduling decisions without moving running Pods.

See the [sharding design](https://github.com/volcano-sh/volcano/blob/master/docs/design/sharding_controller.md) and [scheduler coordination](https://github.com/volcano-sh/volcano/blob/master/docs/design/agent-scheduler.md#coordinate).

### Volcano Agent

Volcano Agent runs as a DaemonSet on worker nodes to support colocation and resource oversubscription. It allows batch workloads to use spare capacity when online service demand is low. When demand spikes, it throttles batch workloads and, when necessary, evicts their Pods to free resources for online services.

See [cloud-native colocation](../KeyFeatures/cloudNativeColocation.md).

### vcctl

[vcctl](../CLI/Commandline.md) is a command-line tool for managing Volcano jobs and queues. Like `kubectl` and workload operators, it accesses Volcano resources through the Kubernetes API.
