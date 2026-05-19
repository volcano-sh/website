---
title: "Usage Plugin"
sidebar_position: 6
---

### Usage

#### Overview

The Usage plugin provides CPU and memory usage-based scheduling. It filters nodes based on resource usage thresholds and scores nodes based on their current resource utilization. The plugin helps prevent scheduling on overloaded nodes and prefers nodes with lower resource usage, improving overall cluster utilization and workload performance.

#### Features

- **Usage-based Filtering**: Filter nodes based on CPU and memory usage thresholds
- **Usage-based Scoring**: Score nodes based on current resource utilization
- **Configurable Thresholds**: Set custom thresholds for CPU and memory usage
- **Weighted Scoring**: Configurable weights for usage, CPU, and memory in scoring
- **Predicate Control**: Optional enable/disable predicate filtering
- **Metrics Integration**: Uses node resource usage metrics for decision making

#### Configuration

The Usage plugin can be configured with the following arguments:

```yaml
actions: "enqueue, allocate, backfill"
tiers:
- plugins:
  - name: usage
    enablePredicate: true
    arguments:
      usage.weight: 5
      cpu.weight: 1
      memory.weight: 1
      thresholds:
        cpu: 80
        mem: 80
```

##### Configuration Parameters

- **enablePredicate** (bool): Enable/disable predicate filtering. When set to `false`, new pod scheduling is not disabled when the node load reaches the threshold. Default is `true`.
- **usage.weight** (int): Global weight for the usage plugin scoring. Default is `5`.
- **cpu.weight** (int): Weight for CPU usage in scoring calculation. Default is `1`.
- **memory.weight** (int): Weight for memory usage in scoring calculation. Default is `1`.
- **thresholds.cpu** (float): CPU usage threshold percentage. Nodes exceeding this threshold will be filtered out (if predicate is enabled). Default is `80`.
- **thresholds.mem** (float): Memory usage threshold percentage. Nodes exceeding this threshold will be filtered out (if predicate is enabled). Default is `80`.

#### How It Works

1. **Metrics Collection**: The plugin uses node resource usage metrics provided by the metrics collector.
2. **Predicate Phase**: If enabled, nodes with CPU or memory usage exceeding the configured thresholds are filtered out.
3. **Scoring Phase**: Nodes are scored based on their current resource utilization. Lower usage results in higher scores.
4. **Scoring Formula**: The score is calculated as:
   - CPU score: `(100 - cpuUsage) / 100 * cpuWeight`
   - Memory score: `(100 - memoryUsage) / 100 * memoryWeight`
   - Combined score: `(cpuScore + memoryScore) / (cpuWeight + memoryWeight) * usageWeight * MaxNodeScore`

#### Metrics Requirements

The Usage plugin requires node resource usage metrics to be available. Metrics must be updated within the last 5 minutes to be considered valid. If metrics are not available or are stale, the plugin will:

- **Predicate**: Allow scheduling (pass the filter)
- **Scoring**: Return a score of 0

#### Scenario

The Usage plugin is suitable for:

- **Load Balancing**: Distributing workloads across nodes to balance resource utilization
- **Overload Prevention**: Preventing scheduling on overloaded nodes
- **Performance Optimization**: Preferring nodes with lower resource usage for better performance
- **Cost Optimization**: Improving resource utilization across the cluster
- **Workload Distribution**: Ensuring even distribution of workloads based on resource consumption

#### Examples

##### Example 1: Basic Usage Configuration

Configure the plugin with default thresholds:

```yaml
- name: usage
  enablePredicate: true
  arguments:
    usage.weight: 5
    cpu.weight: 1
    memory.weight: 1
    thresholds:
      cpu: 80
      mem: 80
```

##### Example 2: Conservative Thresholds

Configure stricter thresholds to prevent overload:

```yaml
- name: usage
  enablePredicate: true
  arguments:
    usage.weight: 10
    cpu.weight: 2
    memory.weight: 2
    thresholds:
      cpu: 70
      mem: 70
```

##### Example 3: Scoring Only (No Predicate)

Disable predicate filtering and use only scoring:

```yaml
- name: usage
  enablePredicate: false
  arguments:
    usage.weight: 5
    cpu.weight: 1
    memory.weight: 1
    thresholds:
      cpu: 80
      mem: 80
```

##### Example 4: CPU-focused Configuration

Prioritize CPU usage over memory:

```yaml
- name: usage
  enablePredicate: true
  arguments:
    usage.weight: 10
    cpu.weight: 3
    memory.weight: 1
    thresholds:
      cpu: 75
      mem: 85
```

##### Example 5: Memory-focused Configuration

Prioritize memory usage over CPU:

```yaml
- name: usage
  enablePredicate: true
  arguments:
    usage.weight: 10
    cpu.weight: 1
    memory.weight: 3
    thresholds:
      cpu: 85
      mem: 75
```

#### Notes

- The plugin requires node resource usage metrics to be available
- Metrics must be updated within the last 5 minutes to be considered valid
- Threshold values are percentages (0-100)
- Weights determine the relative importance of different resources in scoring
- When predicate is disabled, the plugin only affects node scoring, not filtering
- The plugin uses average usage metrics over a configured period
- If metrics are not available, the plugin allows scheduling to proceed
