+++
title = "Resource Strategy Fit Plugin"

date = 2025-01-21
lastmod = 2025-01-21

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Resource Strategy Fit"
[menu.docs]
  parent = "plugins"
  weight = 1
+++

### Resource Strategy Fit

#### Overview

The Resource Strategy Fit plugin provides flexible resource allocation strategies for scheduling tasks onto nodes. It supports multiple scoring strategies including MostAllocated and LeastAllocated for different resource types, enabling administrators to configure custom resource allocation policies. The plugin also supports additional features like SRA (Smart Resource Allocation) and Proportional resource allocation.

#### Features

- **Flexible Resource Scoring**: Supports `MostAllocated` and `LeastAllocated` scoring strategies for different resource types
- **Customizable Weights**: Configure weights for each resource type to control their impact on scoring
- **Pod-level Scoring**: Supports pod-level scoring strategy configuration through annotations
- **Wildcard Pattern Matching**: Supports wildcard patterns for resource matching (e.g., `nvidia.com/gpu/*`)
- **SRA Support**: Optional Smart Resource Allocation (SRA) for enhanced resource allocation
- **Proportional Allocation**: Optional proportional resource allocation policy

#### Configuration

The Resource Strategy Fit plugin can be configured with the following arguments:

```yaml
actions: "enqueue, allocate, backfill, reclaim, preempt"
tiers:
- plugins:
  - name: resource-strategy-fit
    arguments:
      resourceStrategyFitWeight: 10
      resources:
        nvidia.com/gpu:
          type: MostAllocated
          weight: 2
        cpu:
          type: LeastAllocated
          weight: 1
        memory:
          type: LeastAllocated
          weight: 1
      sra:
        enable: true
        resources: nvidia.com/gpu
        weight: 10
        resourceWeight:
          nvidia.com/gpu: 1
      proportional:
        enable: false
        resources: nvidia.com/gpu
        resourceProportion:
          nvidia.com/gpu.cpu: 4
          nvidia.com/gpu.memory: 8
```

##### Configuration Parameters

- **resourceStrategyFitWeight** (int): Global weight for the resource strategy fit plugin. Default is 10.
- **resources** (map): Resource-specific configuration with the following fields:
  - **type**: Scoring strategy type (`MostAllocated` or `LeastAllocated`)
  - **weight**: Weight for this resource in scoring calculation
- **sra** (optional): SRA configuration:
  - **enable**: Enable/disable SRA
  - **resources**: Comma-separated list of resources for SRA
  - **weight**: Weight for SRA scoring
  - **resourceWeight**: Per-resource weights for SRA
- **proportional** (optional): Proportional allocation configuration:
  - **enable**: Enable/disable proportional allocation
  - **resources**: Comma-separated list of resources
  - **resourceProportion**: Proportional ratios for resource combinations

##### Scoring Strategies

- **MostAllocated**: Prefers nodes with higher resource utilization. Useful for binpacking scenarios where you want to fill nodes before using new ones.
- **LeastAllocated**: Prefers nodes with lower resource utilization. Useful for spreading workloads across nodes to improve availability.

##### Pod-level Configuration

Pods can specify their own scoring strategy using annotations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    volcano.sh/resource-strategy-scoring-type: MostAllocated
    volcano.sh/resource-strategy-weight: '{"nvidia.com/gpu": 2, "cpu": 1}'
spec:
  containers:
  - name: container
    resources:
      requests:
        nvidia.com/gpu: 1
        cpu: "2"
```

#### Scenario

The Resource Strategy Fit plugin is suitable for:

- **Mixed Workloads**: Clusters with diverse workload types requiring different resource allocation strategies
- **GPU Clusters**: GPU-intensive workloads where GPUs should be allocated using MostAllocated strategy
- **High Availability**: Workloads requiring distribution across nodes using LeastAllocated strategy
- **Custom Allocation Policies**: Organizations with specific resource allocation requirements

#### Examples

##### Example 1: GPU Binpacking

Configure the plugin to use MostAllocated for GPUs to pack GPU workloads on fewer nodes:

```yaml
- name: resource-strategy-fit
  arguments:
    resourceStrategyFitWeight: 10
    resources:
      nvidia.com/gpu:
        type: MostAllocated
        weight: 5
      cpu:
        type: LeastAllocated
        weight: 1
      memory:
        type: LeastAllocated
        weight: 1
```

##### Example 2: Workload Distribution

Configure the plugin to distribute workloads evenly across nodes:

```yaml
- name: resource-strategy-fit
  arguments:
    resourceStrategyFitWeight: 10
    resources:
      cpu:
        type: LeastAllocated
        weight: 3
      memory:
        type: LeastAllocated
        weight: 2
```

##### Example 3: With SRA

Enable SRA for enhanced GPU allocation:

```yaml
- name: resource-strategy-fit
  arguments:
    resourceStrategyFitWeight: 10
    resources:
      nvidia.com/gpu:
        type: MostAllocated
        weight: 2
    sra:
      enable: true
      resources: nvidia.com/gpu
      weight: 10
      resourceWeight:
        nvidia.com/gpu: 1
```
