+++
title = "SLA"

date = 2021-05-13
lastmod = 2025-11-11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "SLA"
[menu.docs]
  parent = "plugins"
  weight = 12
+++

## Overview

When users submit jobs to Volcano, they may need to add particular constraints to jobs, for example, the longest Pending time to prevent jobs from starving. These constraints can be regarded as **Service Level Agreements (SLA)** which are agreed upon between Volcano and the user. The SLA plugin is provided to receive and enforce SLA settings for both individual jobs and the entire cluster.

## How It Works

The SLA plugin monitors job waiting times and can take actions when SLA constraints are violated:

- **JobWaitingTime**: Maximum time a job can wait in the pending state
- **JobEnqueuedFn**: Checks if a job meets SLA requirements before being enqueued

When a job's waiting time exceeds the configured threshold, the scheduler can take corrective actions such as prioritizing the job or notifying administrators.

## Scenario

Users can customize SLA-related parameters in their own cluster according to business needs:

### Real-time Services

For clusters with high real-time service requirements, `JobWaitingTime` can be set as small as possible to ensure jobs are scheduled quickly or flagged for attention.

### Batch Computing

For clusters primarily running bulk computing jobs, `JobWaitingTime` can be set larger to allow for more flexible scheduling over time.

### Multi-tenant Environments

In multi-tenant clusters, different queues or namespaces can have different SLA requirements based on their service tier.

## Configuration

Enable the SLA plugin in the scheduler ConfigMap:

```yaml
tiers:
- plugins:
  - name: priority
  - name: gang
  - name: sla
    arguments:
      sla.JobWaitingTime: 10m
```

### Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `sla.JobWaitingTime` | Maximum waiting time for a job | - |

The `JobWaitingTime` parameter can be specified using duration format (e.g., `5m`, `1h`, `30s`).

## Example

### Cluster-wide SLA Configuration

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
      - name: sla
        arguments:
          sla.JobWaitingTime: 30m
    - plugins:
      - name: drf
      - name: predicates
      - name: proportion
      - name: nodeorder
```

### Job with SLA Annotation

You can also specify SLA constraints at the job level:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: sla-constrained-job
  annotations:
    volcano.sh/sla-waiting-time: "10m"
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

In this example, if the job waits more than 10 minutes in the pending state, the SLA plugin will flag it for priority scheduling or administrative attention.

### Monitoring SLA Violations

Volcano exposes metrics that can be used to monitor SLA compliance:

- Job waiting time metrics
- SLA violation counts
- Queue-level SLA statistics

These metrics can be integrated with monitoring systems like Prometheus to track SLA compliance across the cluster.
