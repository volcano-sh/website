---
title: Usage-based Scheduling
---

## 介绍

目前，Kubernetes Pod 调度基于资源请求和节点可分配资源，而不是实际的节点使用情况。这可能会导致计算节点之间的资源使用不平衡，其中 Pod 可能会被调度到实际使用率较高且分配率较低的节点。

**基于使用情况的调度**插件允许 Volcano 根据实时节点使用情况来调度 pod。这有助于平衡集群的实际资源使用情况，避免在过载的节点上调度 pod。

## 机制

基于使用情况的调度插件主要执行三个功能：
1. **谓词**：过滤实际资源使用率（如CPU、内存）高于用户定义的使用阈值的节点。
2. **Prioritize (NodeOrder)**：优先考虑实时使用率较低的节点，确保空闲资源较多的节点获得较高分数。
3. **抢占**：使用率较低的节点上的 Pod 可以抢占使用率较高的节点上的 Pod，以平衡集群负载。

Volcano 从指标服务器（例如 Prometheus、Prometheus Adaptor 或 Elasticsearch）检索节点使用情况监控数据。

## 配置

要启用基于使用情况的调度插件，请配置“volcano-scheduler-configmap”。

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

## 与指标源集成

### 1. Prometheus 适配器（自定义指标 API）

**推荐方法**。确保 Prometheus Adapter 已安装并且自定义指标 API 可用。将以下规则添加到 Prometheus Adapter 配置中：

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

将调度程序配置映射中的指标“type”设置为“prometheus_adaptor”。

### 2. 普罗米修斯

将“metrics.type”设置为“prometheus”，并将“metrics.address”直接提供给 Prometheus 服务器，如配置示例所示。

### 3. 弹性搜索

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
