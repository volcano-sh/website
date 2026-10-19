---
title: "Capacity 插件用户指南"
---


## 简介

Capacity 插件是 proportion 插件的替代方案。与按权重分配 Queue 应得资源不同，它为 Queue 各维度资源指定应得（deserved）数量，实现弹性 Queue 容量管理，即 Queue 之间的资源借还与回收机制。

一个队列可以使用其他队列的空闲资源，当其他队列提交作业时，可以回收已借出的资源，回收的资源量就是该队列应得的资源量。更多详情请参见【产能调度设计】(https://github.com/volcano-sh/volcano/blob/master/docs/design/capacity-scheduling.md)

## 环境准备

### 安装 Volcano

请参考[安装指南](https://github.com/volcano-sh/volcano/blob/master/installer/README.md)安装 Volcano。

安装完成后，更新调度器配置：

```shell
kubectl edit cm -n volcano-system volcano-scheduler-configmap
```

请确保：

- 已启用 `reclaim` action。
- 已启用 `capacity` 插件，并移除 `proportion` 插件。

注意：`capacity` 与 `proportion` 插件冲突，不能同时使用。

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: volcano-scheduler-configmap
  namespace: volcano-system
data:
  volcano-scheduler.conf: |
    actions: "enqueue, allocate, backfill, reclaim" # 添加 reclaim action
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
      - name: capacity # 添加此插件并移除 proportion
      - name: nodeorder
      - name: binpack
```

## 配置 Queue 的 deserved 资源

假设集群中有 2 个节点、2 个 Queue（`queue1`、`queue2`），每个节点有 4 CPU 和 16Gi 内存，则集群共 8 CPU、32Gi 内存。

```yaml
allocatable:
  cpu: "4"
  memory: 16Gi
  pods: "110"
```

为 `queue1` 配置 deserved：2 CPU、8Gi 内存。

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: queue1
spec:
  reclaimable: true
  deserved: # 设置 deserved 字段
    cpu: 2
    memory: 8Gi
```

为 `queue2` 配置 deserved：6 CPU、24Gi 内存。

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: queue2
spec:
  reclaimable: true
  deserved: # 设置 deserved 字段
    cpu: 6
    memory: 24Gi
```

## 向各 Queue 提交 Pod

首先向 `queue1` 提交名为 `demo-1` 的 Deployment：`replicas=8`，每个 Pod 请求 1 CPU、4Gi 内存。由于 `queue2` 空闲，`queue1` 可使用整个集群资源，8 个 Pod 均为 Running。

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
        scheduling.volcano.sh/queue-name: "queue1" # 指定 Queue
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

预期结果：

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

再向 `queue2` 提交 `demo-2`：`replicas=8`，每个 Pod 请求 1 CPU、4Gi 内存。

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
        scheduling.volcano.sh/queue-name: "queue2" # 指定 Queue
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

由于 `queue1` 占用了 `queue2` 的资源，`queue2` 将收回其 deserved（6 CPU、24Gi 内存）。`demo-2` 每个 Pod 请求 1 CPU、4Gi，因此 `demo-2` 有 6 个 Running Pod，`demo-1` 的部分 Pod 会被驱逐。

最终 `demo-1`（属于 `queue1`）有 2 个 Running Pod，`demo-2`（属于 `queue2`）有 6 个 Running Pod，分别符合各 Queue 的 deserved 资源。

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
