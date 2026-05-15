+++
title = "Task Topology 插件用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_task_topology_plugin/"
[menu.docs]
  parent = "user-guide"
+++

## 环境准备

### 安装 Volcano

参考 [安装指南](https://github.com/volcano-sh/volcano/blob/master/installer/README.md) 安装 Volcano。

### 更新调度器 ConfigMap

安装完成后，更新调度器配置：

```shell
kubectl edit configmap -n volcano-system volcano-scheduler-configmap
```

在 ConfigMap 中注册 `task-topology` 插件：

```yaml
kind: ConfigMap
apiVersion: v1
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
      - name: conformance
    - plugins:
      - name: drf
      - name: predicates
      - name: task-topology
        arguments:
          task-topology.weight: 10
      - name: proportion
      - name: nodeorder
      - name: binpack
```

## 运行作业

以 TensorFlow 作业为例，演示 task-topology 的用法。

### 安装 Kubeflow / tf-operator

参考 [Kubeflow 安装指南](https://www.kubeflow.org/docs/started/getting-started/) 安装 Kubeflow，其中包含 tf-operator。

### 编辑 TFJob 的 YAML

1. 在 Volcano Job 或 TensorFlow Job 中增加如下注解：
   1. `volcano.sh/task-topology-affinity`：表示任务之间存在**亲和关系**，应尽可能调度到同一节点；
   2. `volcano.sh/task-topology-anti-affinity`：表示任务之间存在**反亲和关系**，应尽可能调度到不同节点；
   3. `volcano.sh/task-topology-task-order`：表示任务分配的顺序，例如 `ps,worker` 表示调度器会先调度 `ps` 任务，当所有 `ps` Pod 分配完成后再开始调度 `worker` 任务。**该注解为可选字段。**

示例：

```yaml
  metadata:
    annotations:
      volcano.sh/task-topology-affinity: "ps,worker;ps,evaluator"
      volcano.sh/task-topology-anti-affinity: "ps;worker,chief;chief,evaluator"
      volcano.sh/task-topology-task-order: "ps,worker,chief,evaluator"
```

上述注解含义大致为：

- `ps,worker;ps,evaluator`：`ps` 与 `worker`、`ps` 与 `evaluator` 之间存在拓扑亲和关系，尽量调度到相同或拓扑接近的节点；
- `ps;worker,chief;chief,evaluator`：`ps` 与其他角色之间、`worker` 与 `chief`、`chief` 与 `evaluator` 之间存在反亲和关系，尽量调度到不同节点；
- `ps,worker,chief,evaluator`：调度顺序依次为 `ps`、`worker`、`chief`、`evaluator`。

通过合理配置上述注解，可以使不同角色的 Task 在集群中按预期的拓扑关系分布，从而更好地满足训练/推理任务的网络与资源布局需求。

