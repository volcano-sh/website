+++
title = "Capacity 插件用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_capacity_plugin/"
[menu.docs]
  parent = "user-guide"
+++

## 介绍

Capacity 插件是 proportion 插件的替代方案。不同于按权重在队列之间按比例划分“应得资源”，Capacity 插件通过为队列在各个资源维度上显式配置“应得资源（deserved）”来实现**弹性的队列容量管理**，也就是队列之间的资源“借出 / 借入”机制。

一个队列在空闲时可以把未用完的资源借给其他队列；当该队列后续提交作业时，又可以从其他队列处收回自己“应得”的资源。收回的资源量就是该队列在该资源维度上配置的 `deserved` 数值。更多设计细节可参考 [Capacity 调度设计](../design/capacity-scheduling.md)。

## 环境准备

### 安装 Volcano

参考 [安装指南](https://github.com/volcano-sh/volcano/blob/master/installer/README.md) 安装 Volcano。

安装完成后，更新调度器配置：

```shell
kubectl edit cm -n volcano-system volcano-scheduler-configmap
```

请确保：

- 已启用 `reclaim` action；
- 已启用 capacity 插件，并移除 proportion 插件。

注意：**capacity 插件与 proportion 插件冲突，二者不能同时使用。**

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: volcano-scheduler-configmap
  namespace: volcano-system
data:
  volcano-scheduler.conf: |
    actions: "enqueue, allocate, backfill, reclaim" # 启用 reclaim action
    tiers:
    - plugins:
      - name: priority
      - name: gang
        enablePreemptable: false
      - name: conformance
    - plugins:
      - name: drf
        enablePreemptable: false
      - name: predicates
      - name: capacity # 启用 capacity 插件并移除 proportion 插件
      - name: nodeorder
      - name: binpack
```

## 配置队列的应得资源（deserved）

假设集群中有 2 个节点和 2 个队列（queue1、queue2），每个节点有 4 CPU 和 16Gi 内存，则整个集群总资源为 8 CPU、32Gi 内存：

```yaml
allocatable:
  cpu: "4"
  memory: 16Gi
  pods: "110"
```

为队列 queue1 配置 `deserved` 字段：2 CPU，8Gi 内存：

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: queue1
spec:
  reclaimable: true
  deserved: # 设置应得资源
    cpu: 2
    memory: 8Gi
```

为队列 queue2 配置 `deserved` 字段：6 CPU，24Gi 内存：

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: queue2
spec:
  reclaimable: true
  deserved: # 设置应得资源
    cpu: 6
    memory: 24Gi
```

## 向各队列提交 Pod

首先，向 queue1 提交一个名为 demo-1 的 Deployment，`replicas=8`，每个 Pod 请求 1 CPU、4Gi 内存。由于此时 queue2 为空闲状态，queue1 可以使用整个集群的资源，因此 8 个 Pod 都会处于 Running 状态：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-1
spec:
  selector:
    matchLabels:
      app: demo-1
  replicas: 8
  template:
    metadata:
      labels:
        app: demo-1
      annotations:
        scheduling.volcano.sh/queue-name: "queue1" # 指定队列
    spec:
      schedulerName: volcano
      containers:
      - name: nginx
        image: nginx:1.14.2
        resources:
          requests:
            cpu: 1
            memory: 4Gi
        ports:
        - containerPort: 80
```

期望结果：

```shell
$ kubectl get po
NAME                      READY   STATUS    RESTARTS   AGE
demo-1-7bc649f544-2wjg7   1/1     Running   0          5s
demo-1-7bc649f544-cvsmr   1/1     Running   0          5s
demo-1-7bc649f544-j5lzp   1/1     Running   0          5s
demo-1-7bc649f544-jvlbx   1/1     Running   0          5s
demo-1-7bc649f544-mzgg2   1/1     Running   0          5s
demo-1-7bc649f544-ntrs2   1/1     Running   0          5s
demo-1-7bc649f544-nv424   1/1     Running   0          5s
demo-1-7bc649f544-zd6d9   1/1     Running   0          5s
```

然后，向 queue2 提交名为 demo-2 的 Deployment，同样 `replicas=8`，每个 Pod 请求 1 CPU、4Gi 内存：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-2
spec:
  selector:
    matchLabels:
      app: demo-2
  replicas: 8
  template:
    metadata:
      labels:
        app: demo-2
      annotations:
        scheduling.volcano.sh/queue-name: "queue2" # 指定队列
    spec:
      schedulerName: volcano
      containers:
      - name: nginx
        image: nginx:1.14.2
        resources:
          requests:
            cpu: 1
            memory: 4Gi
        ports:
        - containerPort: 80
```

由于 queue1 之前已经占用了 queue2 的“应得资源”，当 queue2 提交作业后，会触发 reclaim，将其 `deserved` 中配置的 6 CPU、24Gi 内存收回；在当前规模下，demo-2 可以有 6 个 Pod 处于 Running 状态，其余 Pending。同时，queue1 中部分 Pod 会被驱逐，只保留与其 `deserved` 相匹配的资源量。

最终，你可以看到属于 queue1 的 demo-1 中有 2 个 Pod 处于 Running 状态，属于 queue2 的 demo-2 中有 6 个 Pod 处于 Running 状态，分别满足各自队列配置的应得资源：

```shell
$ kubectl get po
NAME                      READY   STATUS    RESTARTS   AGE
demo-1-7bc649f544-4vvdv   0/1     Pending   0          37s
demo-1-7bc649f544-c6mds   0/1     Pending   0          37s
demo-1-7bc649f544-j5lzp   1/1     Running   0          14m
demo-1-7bc649f544-mzgg2   1/1     Running   0          14m
demo-1-7bc649f544-pqdgk   0/1     Pending   0          37s
demo-1-7bc649f544-tx6wp   0/1     Pending   0          37s
demo-1-7bc649f544-wmshq   0/1     Pending   0          37s
demo-1-7bc649f544-wrhrr   0/1     Pending   0          37s
demo-2-6dfb86c49b-2jvgm   0/1     Pending   0          37s
demo-2-6dfb86c49b-dnjzv   1/1     Running   0          37s
demo-2-6dfb86c49b-fzvmp   1/1     Running   0          37s
demo-2-6dfb86c49b-jlf69   1/1     Running   0          37s
demo-2-6dfb86c49b-k62f7   1/1     Running   0          37s
demo-2-6dfb86c49b-k9b9v   1/1     Running   0          37s
demo-2-6dfb86c49b-rpzvg   0/1     Pending   0          37s
demo-2-6dfb86c49b-zch7w   1/1     Running   0          37s
```

