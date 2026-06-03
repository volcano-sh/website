---
title: Rescheduling
---

## Introduction

Unbalanced resource utilization across a Kubernetes cluster often occurs due to unreasonable scheduling strategies, dynamic changes in job lifecycles, and node status changes (such as added/removed nodes or taint/affinity modifications).

The **Rescheduling** plugin addresses these issues by actively rebalancing the cluster's resource utilization among nodes. It accomplishes this by evaluating real resource utilization (via Prometheus metrics) instead of merely the requested resource amounts, and it periodically evicts pods based on custom configured rescheduling strategies.

## Rescheduling Workflow

1. **Resource Filter**: Filters workloads which are eligible to be evicted based on queues or labels.
2. **Strategy Evaluation**: Evaluates filtered workloads against the configured rescheduling strategies to determine which ones should be evicted.
3. **Eviction**: Evicts the pods attached to the identified workloads.
4. **Periodical Execution**: Executes the above process periodically.

## Rescheduling Strategies

Volcano's rescheduling plugin supports multiple strategies to select potential evictees:

- **LowNodeUtilization**: Targets unbalanced nodes by evicting pods from highly utilized nodes and shuffling them to low utilized nodes based on configured target thresholds.
- **OfflineOnly (OLO)**: Only selects offline workloads (annotated with `preemptable: true`) for rescheduling.
- **LowPriorityFirst (LPF)**: Sorts workloads by priority and evicts lower priority pods first.
- **ShortLifeTimeFirst (SLTF)**: Sorts workloads by running time. Pods with the shortest life time will be rescheduled first to ensure long-running workloads are not interrupted.
- **BigObjectFirst (BOF)**: Selects workloads which request the most dominant resource and reschedules them first to improve system throughput and avoid small workloads starvation.
- **MoreReplicasFirst (MRF)**: Sorts workloads by replica number. Workloads with the most replicas are rescheduled first, making it friendly to `gang` scheduling by considering `minAvailable`.

## Configuration

To enable the Rescheduling plugin, you must configure the `volcano-scheduler-configmap` by adding the `shuffle` action and configuring the `rescheduling` plugin within the tiers.

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

> **Note:** The rescheduling decisions consider metrics collected from Prometheus. Ensure your metrics configuration is correctly set up as it evaluates real node resource utilization instead of requested resource amounts.
