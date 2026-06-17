---
title: Task Topology
---


## 环境设置

### 安装火山

参考【安装指南】(https://github.com/volcano-sh/volcano/blob/master/installer/README.md)安装volcano。

### 更新调度程序配置图

安装后，更新调度程序配置：

```shell
kubectl edit configmap -n volcano-system volcano-scheduler-configmap
```

在 configmap 中注册 `task-topology` 插件

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

### 正在运行的作业

以张量流作业为例。

#### 安装 kubeflow/tf-operator

请参考[安装指南](https://www.kubeflow.org/docs/started/getting-started/)安装kubeflow，包括tf-operator。

#### 编辑 tfjob 的 yaml

1. 按以下格式在火山作业或张量流作业中添加注释。
   1. `affinity` 注解表示任务之间有联系，因此应设置在同一节点上；
   2. `anti-affinity` 注解表示任务之间没有联系，所以应该设置在不同的节点上；
   3. `task-order` 注解表示任务分配的顺序。例如，“ps,worker”表示调度程序应首先调度“ps”任务。当所有`ps`任务分配完毕后，调度程序开始调度`worker`任务。 **此注释不是必填字段。**

        ```yaml
            volcano.sh/task-topology-affinity: "ps,worker;ps,evaluator"
            volcano.sh/task-topology-anti-affinity: "ps;worker,chief;chief,evaluator"
            volcano.sh/task-topology-task-order: "ps,worker,chief,evaluator"
        ```
