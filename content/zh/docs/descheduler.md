+++
title = "负载感知重调度"

date = 2025-01-20
lastmod = 2025-01-20

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
toc_depth = 5
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
[menu.docs]
  parent = "features"
  weight = 1
+++

## 背景

集群中的调度是将pending状态的Pod分配到节点运行的过程，Pod的调度依赖于集群中的调度器。调度器是通过一系列算法计算出Pod运行的最佳节点，但是Kubernetes集群环境是存在动态变化的，例如某一个节点需要维护，这个节点上的所有Pod会被驱逐到其他节点，但是当维护完成后，之前被驱逐的Pod并不会自动回到该节点上来，因为Pod一旦被绑定了节点是不会触发重新调度的。由于这些变化，集群在一段时间之后就可能会出现不均衡的状态。

为了解决上述问题，Volcano的重调度器可以根据设置的策略，驱逐不符合配置策略的Pod，让其重新进行调度，达到均衡集群负载、减少资源碎片化的目的。项目地址：[https://github.com/volcano-sh/descheduler](https://github.com/volcano-sh/descheduler)。

## 功能

Volcano的重调度能力在<https://github.com/kubernetes-sigs/descheduler.git>的基础上，新增了以下功能：

### 支持按照crontab定时任务和固定时间间隔进行重调度

用户可以把`Volcano descheduler`部署为一个Deploment类型的工作负载。然后在命令行参数指定按照cronTab定时运行或者固定时间间隔运行重调度组件，而无需把重调度组件部署成一个cronJob类型的工作负载。

**cronTab定时任务**: 指定参数`--descheduling-interval-cron-expression='0 0 * * *'`，表示每天凌晨运行一次重调度。

**固定间隔**: 指定参数`--descheduling-interval=10m`，表示每10分钟运行一次重调度。

请注意，`--descheduling-interval`的优先级高于`--descheduling-interval-cron-expression`，当两个参数都设置时，descheduler 的行为以`--descheduling-interva`设置的为准。

### 支持基于真实负载感知的重调度LoadAware

在K8s集群治理过程中，常常会因CPU、内存等高使用率状况而形成热点，既影响了当前节点上Pod的稳定运行，也会导致节点发生故障的几率的激增。为了应对集群节负载不均衡等问题，动态平衡各个节点之间的资源使用率，需要基于节点的相关监控指标，构建集群资源视图，在集群治理阶段，通过实时监控，在观测到节点资源率较高、节点故障、Pod 数量较多等情况时，可以自动干预，迁移资源使用率高的节点上的一些Pod到利用率低的节点上。

原生的descheduler只支持基于Pod request的负载感知调度，对利用率比较高的节点上的Pods进行驱逐，从而均衡节点间的资源利用率，避免个别节点过热。但是Pod request并不能反映节点的真实资源使用情况，因此Volcano实现了基于节点真实负载的重调度，通过查询节点暴露的指标，基于CPU、Memory的真实负载进行更加准确的重调度。

<div style="text-align: center;"> {{<figure library="1" src="./descheduler/descheduler-CN.svg">}}
</div>

LoadAware原理如上图所示：

- 正常节点：资源利用率大于等于30%且小于等于80%的节点。此节点的负载水位区间是期望达到的合理区间范围。
- 热点节点：资源利用率高于80%的节点。热点节点将驱逐一部分Pod，降低负载水位，使其不超过80%。重调度器会将热点节点上面的Pod调度到空闲节点上面。
- 空闲节点：资源利用率低于30%的节点。

## 快速上手

### 准备

安装[prometheus](https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus)或者[prometheus-adaptor](https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus-adapter)和[prometheus-node-exporter](https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus-node-exporter), 节点的真实负载通过node-exporter和prometheus暴露给`Volcano descheduler`使用。

在prometheus的`scrape_configs`配置中添加如下的node-exporter服务的自动发现和节点标签替换规则，这一步很重要，否则`Volcano descheduler`拿不到节点的真实负载指标。关于scrape_configs的更多细节请参考[Configuration | Prometheus](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)。

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

### 安装Volcano descheduler

#### 通过yaml安装

```shell
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/descheduler/refs/heads/main/installer/volcano-descheduler-development.yaml
```

### 配置

默认的重调度配置在volcano-system命名空间下的volcano-descheduler configMap中，你可以通过修改该configMap里的数据来更新重调度的配置。或者在使用helm安装时增加参数`--set custom.deschedulerPolicy=$CUSTOM_CONFIG`来覆盖默认配置。默认打开的插件为`LoadAware`和`DefaultEvictor`，分别进行基于负载感知的重调度和驱逐。

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
        cpu: 80 # 节点cpu利用率超过80%时会触发驱逐
        memory: 85 # 节点memory利用率超过85%时会触发驱逐
      thresholds:
        cpu: 30 # Pods可以被调度到节点cpu资源利用低于30%的节点
        memory: 30 # Pods可以被调度到节点memory资源利用低于30%的节点
    name: LoadAware
  plugins:
    balance:
      enabled:
      - LoadAware
```

`DefaultEvictor`插件的全量配置和参数说明请参考：https://github.com/kubernetes-sigs/descheduler/tree/master#evictor-plugin-configuration-default-evictor。

LoadAware插件参数说明：

|      字段名称       |         类型         | 默认值 |                             说明                             |
| :-----------------: | :------------------: | :----: | :----------------------------------------------------------: |
|    nodeSelector     |        string        |  nil   |            只处理指定的节点，nil表示处理所有节点             |
| evictableNamespaces | map(string:[]string) |  nil   |                 指定命名空间下Pods不会被驱逐                 |
|       nodeFit       |         bool         | false  | 设置为`true`时，调度器将在驱逐符合驱逐标准的Pod之前，考虑这些Pod是否能在其他节点上运行。 |
|    numberOfNodes    |         int          |   0    | 该参数可以配置为仅在未充分利用节点的数量超过配置值时激活策略。这对于节点可能频繁或短时间内未充分利用的大型集群来说，可能会有所帮助。 |
|      duration       |        string        |   2m   | 查询节点实际利用率指标时指定的时间范围，只有当metrics.type配置为prometheus生效。 |
|       metrics       |  map(string:string)  |  nil   | **必填字段**<br>包含两个参数: <br>type: 指标来源类型，仅支持`prometheus`和`prometheus_adaptor`<br>address: `prometheus`服务地址。 |
|  targetThresholds   |   map(string:int)    |  nil   | **必填字段**<br>支持配置的key为cpu,memory,pods<br>当节点资源cpu或memory利用率超过设置的阈值时，会触发节点Pods驱逐，单位为%。<br>当节点Pod数量超过设置阈值时，会触发节点Pods驱逐，单位为个数。 |
|     thresholds      |   map(string:int)    |  nil   | **必填字段**<br>被驱逐的Pods应该被调度到利用率低于thresholds的节点上。<br>同一种资源类型的阈值不能超过targetThresholds里设置的阈值。 |

除上述LoadAware插件增强功能外，`Volcano descheduler`也支持原生descheduler的功能和插件，如果要配置其他的原生插件，请参考：[descheduler/docs/user-guide.md at master · kubernetes-sigs/descheduler (github.com)](https://github.com/kubernetes-sigs/descheduler/blob/master/docs/user-guide.md)。

## 最佳实践

当资源利用率比较高的节点上的Pods被驱逐后，我们期望新建的Pods应该避免再次被调度到资源利用率比较高的节点，因此Volcano调度器也需要开启基于真实负载感知的调度插件`usage`，关于`usage`的详细说明和配置请参考: [volcano usage plugin](https://github.com/volcano-sh/volcano/blob/master/docs/design/usage-based-scheduling.md)。

## 问题排查

当LoadAware插件的配置参数metrics.type设置为`prometheus`时，`Volcano scheduler`通过以下PromQL语句查询cpu和memory的实际利用率，当预期的驱驱逐行为没有发生时，你可以通过prometheus手询查询节点的实际利用率，排查节点指标是否正确暴露，并可以对比`Volcano descheduler`的日志来判它的实际行为。

cpu:

```shell
avg_over_time((1 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle",instance="$replace_with_your_node_name"}[30s])) * 1))[2m:30s])
```

memory:

```shell
avg_over_time(((1-node_memory_MemAvailable_bytes{instance="$replace_with_your_node_name"}/node_memory_MemTotal_bytes{instance="$replace_with_your_node_name"}))[2m:30s])
```
