+++
title = "Load-aware Descheduling"

date = 2025-01-20
lastmod = 2025-01-20

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
toc_depth = 5
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
[menu.docs]
  parent = "features"
  weight = 4
+++

## Overview

The scheduling within a cluster is the process of assigning pending Pods to nodes for execution, with Pod scheduling relying on the cluster's scheduler. The scheduler calculates the optimal node for a Pod's execution through a series of algorithms. However, the Kubernetes cluster environment is dynamic, with changes such as a node requiring maintenance, which would result in all Pods on that node being evicted to other nodes, once maintenance is complete, the previously evicted Pods do not automatically return to the node, as once a Pod is bound to a node, it does not trigger a descheduling. Due to these changes, the cluster may become unbalanced over time.

To address the above issues, `Volcano descheduler` can evict Pods that do not comply with the configured strategies, allowing them to be rescheduled and thereby achieving balanced cluster load and reducing resource fragmentation. See repo：[https://github.com/volcano-sh/descheduler](https://github.com/volcano-sh/descheduler).

## Features

Volcano decheduler's capability is based on https://github.com/kubernetes-sigs/descheduler.git, with the following new features:

### Descheduling via crontab or fixed interval

Users can deploy the  `Volcano descheduler` as a Deploment type workload instead of a cronJob. Then specify the command line parameters to run the descheduler according to cronTab expression or fixed interval.

**cronTab scheduled task**: Specify the parameter `--descheduling-interval-cron-expression='0 0 * * *'`, which means to run descheduling once every morning.

**Fixed interval**: Specify the parameter `--descheduling-interval=10m`, which means descheduling will be run every 10 minutes.

And please notice that `--descheduling-interval` has a higher priority than `--descheduling-interval-cron-expression`, the descheduler's behavior is subject to the `--descheduling-interva` setting when both parameters are set.

### Real Load Aware Descheduling

In the process of kubernetes cluster governance, hotspots are often formed due to high CPU, memory and other utilization conditions, which not only affects the stable operation of Pods on the current node, but also leads to a surge in the chances of node failure. In order to cope with problems such as load imbalance of cluster nodes and dynamically balance the resource utilization rate among nodes, it is necessary to construct a cluster resource view based on the relevant monitoring metrics of nodes, so that in the cluster governance phase, through real-time monitoring, it can automatically intervene to migrate some Pods on the nodes with high resource utilization rate to the nodes with low utilization rate, when high resource utilization rate, node failure, and high number of Pods are observed.

The native descheduler only supports load-aware scheduling based on Pod request, which evicts Pods on nodes with higher utilization rates, thus equalizing resource utilization among nodes and avoiding overheating of individual node. However, Pod request does not reflect the real resource utilization of the nodes, so Volcano implements descheduling based on the real load of the nodes, by querying the metrics exposed by nodes, more accurate descheduling is performed based on the real load of CPU and Memory.

<div style="text-align: center;"> {{<figure library="1" src="./descheduler/descheduler_EN.svg">}}
</div>

The principle of LoadAware is shown in the figure above:

- Normal nodes: nodes with resource utilization greater than or equal to 30% and less than or equal to 80%. The load level range of this node is a reasonable range expected to be reached.
- Hotspot nodes: nodes with resource utilization higher than 80%. Hotspot nodes will evict some Pods and reduce the load level to no more than 80%. The descheduler will schedule the Pods on the hotspot nodes to the idle nodes.
- Idle nodes: nodes with resource utilization lower than 30%.

## Quick start

### Prepare

Install [prometheus](https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus) or [prometheus-adaptor](https://github.com/prometheus-community/helm- c harts/tree/main/charts/prometheus-adapter), and [prometheus-node-exporter](https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus-node-exporter), The real load of the node is exposed to the `Volcano descheduler` through node-exporter and prometheus.

Add the following automatic discovery and node label replacement rules for the node-exporter service in the `scrape_configs` configuration of prometheus. This step is very important, otherwise `Volcano descheduler` cannot get the real load metrics of the node. For more details about `scrape_configs`, please refer to [Configuration | Prometheus](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config).

```yaml
scrape_configs:
- job_name: 'kubernetes-service-endpoints'
  kubernetes_sd_configs:
  - role: endpoints
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_node_name]
    action: replace
    target_label: instance
```

### Install Volcano descheduler

#### Install via yaml

```shell
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/descheduler/main/installer/volcano-descheduler-development.yaml
```

### Configurations

The default descheduling configuration is in the `volcano-descheduler` configMap under the `volcano-system` namespace. You can update the descheduling configuration by modifying the data in the configMap. The plugins enabled by default are `LoadAware` and `DefaultEvictor`, which perform load-aware descheduling and eviction respectively.

```yaml
apiVersion: "descheduler/v1alpha2"
kind: "DeschedulerPolicy"
profiles:
- name: default
  pluginConfig:
  - args:
      ignorePvcPods: true
      nodeFit: true
      priorityThreshold:
        value: 10000
    name: DefaultEvictor
  - args:
      evictableNamespaces:
        exclude:
        - kube-system
      metrics:
        address: null
        type: null
      targetThresholds:
        cpu: 80 # Eviction will be triggered when the node CPU utilization exceeds 80%
        memory: 85 # Eviction will be triggered when the node memory utilization exceeds 85%
      thresholds:
        cpu: 30 # Pods can be scheduled to nodes whose CPU resource utilization is less than 30%
        memory: 30 # Pods can be scheduled to nodes whose memory resource utilization is less than 30%.
    name: LoadAware
  plugins:
    balance:
      enabled:
      - LoadAware
```

For the full configuration and parameter description of the `DefaultEvictor` plugin, please refer to: https://github.com/kubernetes-sigs/descheduler/tree/master#evictor-plugin-configuration-default-evictor.

`LoadAware` plugin parameter description:

|        Name         |         type         | Default Value |                         Description                          |
| :-----------------: | :------------------: | :-----------: | :----------------------------------------------------------: |
|    nodeSelector     |        string        |      nil      |            Limiting the nodes which are processed            |
| evictableNamespaces | map(string:[]string) |      nil      |       Exclude evicting pods under excluded namespaces        |
|       nodeFit       |         bool         |     false     | Set to `true` the descheduler will consider whether or not the pods that meet eviction criteria will fit on other nodes before evicting them. |
|    numberOfNodes    |         int          |       0       | This parameter can be configured to activate the strategy only when the number of under utilized nodes are above the configured value. This could be helpful in large clusters where a few nodes could go under utilized frequently or for a short period of time. |
|      duration       |        string        |      2m       | The time range specified when querying the actual utilization metrics of nodes, only takes effect when `metrics.type` is configured as `prometheus`. |
|       metrics       |  map(string:string)  |      nil      | **Required Field**<br/>Contains two parameters: <br/>type: The type of metrics source, only supports `prometheus` and `prometheus_adaptor`.<br/>address: The service address of `prometheus`. |
|  targetThresholds   |   map(string:int)    |      nil      | **Required Field**<br/>Supported configuration keys are `cpu`, `memory`, and `pods`.<br/>When the node resource utilization (for `cpu` or `memory`) exceeds the setting threshold, it will trigger Pods eviction on the node, with the unit being %.<br/>When the number of Pods on the node exceeds the set threshold, it will trigger Pods eviction on the node, with the unit being number. |
|     thresholds      |   map(string:int)    |      nil      | **Required Field**<br/>The evicted Pods should be scheduled to nodes with utilization below the `thresholds`.<br/>The threshold for the same resource type cannot exceed the threshold set in `targetThresholds`. |

In addition to the above `LoadAware plugin` enhancements, `Volcano descheduler` also supports native descheduler functions and plugins. If you want to configure other native plugins, please refer to: [descheduler/docs/user-guide.md at master · kubernetes-sigs/descheduler (github.com)](https://github.com/kubernetes-sigs/descheduler/blob/master/docs/user-guide.md).

## Best practices

When the Pods on the node with relatively high resource utilization are evicted, we expect that the new created Pods should avoid being scheduled to the node with relatively high resource utilization again. Therefore, the `Volcano scheduler` also needs to enable the  plugin `usage` based on real load awareness, for detailed description and configuration of `usage`, please refer to: [volcano usage plugin](https://github.com/volcano-sh/volcano/blob/master/docs/design/usage-based-scheduling.md).

## Trouble shotting

When the configuration parameter `metrics.type` of the LoadAware plugin is set to `prometheus`, `Volcano scheduler` queries the actual utilization of cpu and memory through the following `PromQL` statement. When the expected eviction behavior does not occur, you can query it manually through prometheus, check whether the node metrics are correctly exposed, and compare it with the log of `Volcano descheduler` to judge its actual behavior.

cpu:

```shell
avg_over_time((1 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle",instance="$replace_with_your_node_name"}[30s])) * 1))[2m:30s])
```

memory:

```shell
avg_over_time(((1-node_memory_MemAvailable_bytes{instance="$replace_with_your_node_name"}/node_memory_MemTotal_bytes{instance="$replace_with_your_node_name"}))[2m:30s])
```