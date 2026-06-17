---
title: Overcommit
---

## 介绍

在典型的集群环境中，调度程序严格根据物理节点容量减去分配的资源来计算可用的空闲资源。但是，当集群资源几乎完全利用时，许多 PodGroup 会被拒绝进入调度管道，并且完全不排队，这对于您希望调度程序容忍大量“待处理”Pod 的场景来说可能并不理想。

**过度使用插件**允许调度程序通过应用“过度使用因子”人为地增加集群的明显“空闲资源”。这允许比物理资源通常允许的更多作业在调度管道中排队和等待。

## 机制

Overcommit插件根据PodGroup请求的MinResources和扩展的空闲资源来评估作业是否可以入队。

扩展闲置资源计算公式为：
`空闲资源 = (总资源 * 过量使用系数) - 已使用资源`

如果作业的最小请求资源可以放入此扩展的空闲资源池中，则允许作业入队。

## 配置

要使用 Overcommit 插件，请将其添加到“enqueue”层下的“volcano-scheduler-configmap”中，并提供“overcommit-factor”。

```yaml
actions: "enqueue, allocate, backfill"
tiers:
  - plugins:
      - name: overcommit  # Enable the overcommit plugin
        arguments:
          overcommit-factor: 1.2  # The overcommit factor. Default is 1.2
      - name: priority
      - name: gang
      - name: conformance
  - plugins:
      - name: drf
      - name: predicates
      - name: proportion
      - name: nodeorder
      - name: binpack
```

### 参数

- **`overcommit-factor`**：大于或等于 `1.0` 的浮点值。例如，“1.2”表示调度程序在决定是否将作业排队到管道中时，会假装集群的总资源增加了 20%。如果提供的值小于“1.0”，插件将自动回退到默认值“1.2”。