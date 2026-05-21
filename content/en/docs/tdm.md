+++
title = "TDM"

date = 2021-05-13
lastmod = 2025-11-11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "TDM"
[menu.docs]
  parent = "plugins"
  weight = 13
+++

## Overview

The full name of TDM is **Time Division Multiplexing**. In a co-located environment, some nodes may belong to both a Kubernetes cluster and a YARN cluster. For these nodes, Kubernetes and YARN clusters can use these resources through time-sharing multiplexing.

The TDM plugin marks these nodes as `revocable nodes`. During the node's revocable time window, the TDM plugin will try to dispatch `preemptable tasks` to `revocable nodes`. Outside of the revocable time window, the TDM plugin evicts the `preemptable tasks` from `revocable nodes`.

The TDM plugin improves the time-division multiplexing ability of node resources in the scheduling process of Volcano.

## How It Works

The TDM plugin manages time-based resource sharing:

1. **Revocable Nodes**: Nodes labeled as revocable that can be shared between orchestration systems
2. **Revocable Time Windows**: Defined time periods when nodes are available for Kubernetes workloads
3. **Preemptable Tasks**: Tasks that can be evicted when the revocable time window ends

Key functions:

- **PredicateFn**: Checks if a task can be scheduled on a revocable node during the current time window
- **PreemptableFn**: Determines if tasks should be evicted based on time constraints

## Scenario

### ToB Business

In ToB (Business-to-Business) scenarios, cloud vendors provide cloud-based resources for merchants, and different merchants adopt different container orchestration frameworks (Kubernetes, YARN, etc.). The TDM plugin improves the time-sharing efficiency of common node resources and further improves resource utilization.

### Hybrid Clusters

Organizations running both Kubernetes and Hadoop/YARN workloads can use TDM to share physical nodes between the two systems, with time-based scheduling ensuring workloads don't interfere with each other.

### Cost Optimization

By enabling time-division multiplexing, organizations can maximize the utilization of their hardware infrastructure by sharing nodes across different workload types during different time periods.

## Configuration

### Node Labels

First, mark nodes as revocable:

```bash
kubectl label node <node-name> volcano.sh/revocable-node=true
kubectl annotate node <node-name> volcano.sh/revocable-zone="zone-a"
```

### Scheduler Configuration

Enable the TDM plugin with time window configuration:

```yaml
tiers:
- plugins:
  - name: priority
  - name: gang
- plugins:
  - name: predicates
  - name: tdm
    arguments:
      tdm.revocable-zone.zone-a: "0 8 * * *:0 18 * * *"
      tdm.revocable-zone.zone-b: "0 20 * * *:0 6 * * *"
```

### Configuration Parameters

| Parameter | Description | Format |
|-----------|-------------|--------|
| `tdm.revocable-zone.<zone-name>` | Time window for a revocable zone | `<start-cron>:<end-cron>` |

The time windows are specified using cron expressions:
- `0 8 * * *` means "at 8:00 AM every day"
- `0 18 * * *` means "at 6:00 PM every day"

## Example

### Revocable Node Configuration

```bash
# Mark a node as revocable in zone-a
kubectl label node worker-node-1 volcano.sh/revocable-node=true
kubectl annotate node worker-node-1 volcano.sh/revocable-zone=zone-a
```

### Scheduler ConfigMap with TDM

```yaml
apiVersion: v1
kind: ConfigMap
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
      - name: tdm
        arguments:
          # zone-a is available for Kubernetes from 8 AM to 6 PM
          tdm.revocable-zone.zone-a: "0 8 * * *:0 18 * * *"
      - name: nodeorder
```

### Preemptable Job

Submit a job that can be scheduled on revocable nodes:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: preemptable-job
  annotations:
    volcano.sh/preemptable: "true"
spec:
  schedulerName: volcano
  minAvailable: 1
  tasks:
  - replicas: 1
    name: worker
    template:
      spec:
        containers:
        - name: worker
          image: busybox
          command: ["sleep", "3600"]
```

In this example:
- The job is marked as preemptable
- It can be scheduled on revocable nodes during the configured time window
- It will be evicted when the time window ends
