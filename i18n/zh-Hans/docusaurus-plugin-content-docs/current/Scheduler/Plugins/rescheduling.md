---
title: Rescheduling
---

## 介绍

由于调度策略不合理、作业生命周期的动态变化、节点状态变化（如节点的添加/删除、污点/亲和性修改），Kubernetes集群中经常会出现资源利用率不平衡的情况。

**重新调度**插件通过主动重新平衡节点之间的集群资源利用率来解决这些问题。它通过评估实际资源利用率（通过 Prometheus 指标）而不仅仅是请求的资源量来实现这一点，并根据自定义配置的重新调度策略定期驱逐 Pod。

## 重新安排工作流程

1. **资源过滤器**：根据队列或标签过滤符合驱逐条件的工作负载。
2. **策略评估**：根据配置的重新调度策略评估过滤后的工作负载，以确定应驱逐哪些工作负载。
3. **驱逐**：驱逐附加到已识别工作负载的 Pod。
4. **定期执行**：定期执行上述过程。

## 重新安排策略

Volcano 的重新安排插件支持多种策略来选择潜在的被驱逐者：

- **LowNodeUtilization**：通过从高利用率节点驱逐 Pod 并根据配置的目标阈值将它们洗牌到低利用率节点来定位不平衡节点。
- **OfflineOnly (OLO)**：仅选择离线工作负载（用 `preemptable: true` 注释）进行重新调度。
- **LowPriorityFirst (LPF)**：按优先级对工作负载进行排序，并首先驱逐优先级较低的 Pod。
- **ShortLifeTimeFirst (SLTF)**：按运行时间对工作负载进行排序。生命周期最短的 Pod 将首先被重新调度，以确保长时间运行的工作负载不被中断。
- **BigObjectFirst (BOF)**：选择请求最主要资源的工作负载并首先重新调度它们，以提高系统吞吐量并避免小型工作负载匮乏。
- **MoreReplicasFirst (MRF)**：按副本编号对工作负载进行排序。首先重新调度具有最多副本的工作负载，通过考虑“minAvailable”使其对“gang”调度友好。

## 配置

要启用重新安排插件，您必须通过添加“shuffle”操作并在层中配置“重新安排”插件来配置“volcano-scheduler-configmap”。

```yaml
actions: "enqueue, allocate, backfill, shuffle"  ## Add 'shuffle' action
tiers:
  - plugins:
      - name: priority
      - name: gang
      - name: conformance
      - name: rescheduling       ## Rescheduling plugin
        arguments:
          interval: 5m           ## Optional. Frequency at which the strategies are called. Default is 5m.
          metricsPeriod: 5m      ## Optional. The duration of metrics to consider. Default is 5m.
          strategies:            ## Required. Strategies to execute in order.
            - name: offlineOnly
            - name: lowPriorityFirst
            - name: lowNodeUtilization
              params:
                thresholds:
                  "cpu" : 20     ## Threshold below which a node is considered under-utilized
                  "memory": 20
                  "pods": 20
                targetThresholds:
                  "cpu" : 50     ## Target utilization to reach for balance
                  "memory": 50
                  "pods": 50
          queueSelector:         ## Optional. Select workloads in specified queues as potential evictees. All queues by default.
            - default
            - test-queue
          labelSelector:         ## Optional. Select workloads with specified labels as potential evictees. All labels by default.
            business: offline
            team: test
  - plugins:
      - name: overcommit
      - name: drf
      - name: predicates
      - name: proportion
      - name: nodeorder
      - name: binpack
```

> **注意：** 重新安排决策考虑从 Prometheus 收集的指标。确保正确设置指标配置，因为它评估实际节点资源利用率而不是请求的资源量。