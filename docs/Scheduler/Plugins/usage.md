---
title: Usage-based Scheduling
---

## Introduction

Currently, Kubernetes pod scheduling is based on resource requests and node allocatable resources rather than the actual node usage. This can lead to unbalanced resource usage across compute nodes, where pods might be scheduled to nodes with higher actual usage and lower allocation rates. 

The **Usage-based scheduling** plugin allows Volcano to schedule pods based on real-time node usage. This helps to balance the cluster's actual resource usage and avoid scheduling pods on overloaded nodes.

## Mechanism

The Usage-based scheduling plugin primarily performs three functions:
1. **Predicate**: Filters nodes whose actual resource usage (e.g., CPU, Memory) is higher than the usage threshold defined by the user.
2. **Prioritize (NodeOrder)**: Prioritizes nodes with lower real-time usage, ensuring that nodes with more idle resources get higher scores.
3. **Preempt**: Pods on nodes with lower usage can preempt pods on nodes with higher usage to balance the cluster load.

Volcano retrieves the node usage monitoring data from a metrics server (such as Prometheus, Prometheus Adaptor, or Elasticsearch).

## Configuration

To enable the Usage-based scheduling plugin, configure the `volcano-scheduler-configmap`.

```yaml
actions: "enqueue, allocate, backfill"  
tiers:
  - plugins:
      - name: priority
      - name: gang
      - name: conformance
      - name: usage  # usage based scheduling plugin
        enablePredicate: false  # If false, new pod scheduling is not disabled when node load reaches the threshold. If true or empty, new pod scheduling is disabled.
        arguments:
          usage.weight: 5
          cpu.weight: 1
          memory.weight: 1
          thresholds:
            cpu: 80    # The node cannot schedule new pods if its actual CPU load reaches 80%.
            mem: 70    # The node cannot schedule new pods if its actual Memory load reaches 70%.
  - plugins:
      - name: overcommit
      - name: drf
      - name: predicates
      - name: proportion
      - name: nodeorder
      - name: binpack

metrics:                               # metrics server related configuration
  type: prometheus                     # Optional. The metrics source type. Supports "prometheus", "prometheus_adapt", and "elasticsearch". prometheus by default.
  address: http://192.168.0.10:9090    # Mandatory. The metrics source address.
  interval: 30s                        # Optional. The scheduler pulls metrics from Prometheus with this interval, 30s by default.
```

## Integrating with Metrics Sources

### 1. Prometheus Adaptor (Custom Metrics API)

**Recommended approach**. Ensure the Prometheus Adaptor is installed and custom metrics API is available. Add the following rules to Prometheus Adaptor configuration:

```yaml
rules:
    - seriesQuery: '{__name__=~"node_cpu_seconds_total"}'
      resources:
        overrides:
          instance:
            resource: node
      name:
        matches: "node_cpu_seconds_total"
        as: "node_cpu_usage_avg"
      metricsQuery: avg_over_time((1 - avg (irate(<<.Series>>{mode="idle"}[5m])) by (instance))[10m:30s])
    - seriesQuery: '{__name__=~"node_memory_MemTotal_bytes"}'
      resources:
        overrides:
          instance:
            resource: node
      name:
        matches: "node_memory_MemTotal_bytes"
        as: "node_memory_usage_avg"
      metricsQuery: avg_over_time(((1-node_memory_MemAvailable_bytes/<<.Series>>))[10m:30s])
```

Set the metrics `type` in the scheduler configmap to `prometheus_adaptor`.

### 2. Prometheus

Set the `metrics.type` to `prometheus` and provide the `metrics.address` directly to the Prometheus server as shown in the configuration example.

### 3. Elasticsearch

Set the `metrics.type` to `elasticsearch` and provide the following configuration:
```yaml
metrics:                               
  type: elasticsearch                  
  address: http://192.168.0.10:9200    
  interval: 30s                        
  tls:                                 
    insecureSkipVerify: "false"        
  elasticsearch:                       
    index: "custom-index-name"         # Optional. "metricbeat-*" by default
    username: ""                       
    password: ""                       
    hostnameFieldName: "host.hostname" # Optional. "host.hostname" by default
```
