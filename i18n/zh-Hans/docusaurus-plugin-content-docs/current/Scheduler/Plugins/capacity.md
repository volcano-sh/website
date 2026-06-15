---
title: Capacity

---


## 介绍

容量插件是比例插件的替代，但不是按权重划分队列应得资源，而是通过指定队列每个维度资源应得资源量来实现弹性队列容量管理，即队列的资源借入和借出机制。

一个队列可以使用其他队列的空闲资源，当其他队列提交作业时，可以回收已借出的资源，回收的资源量就是该队列应得的资源量。更多详情请参见【容量调度设计】(https://github.com/volcano-sh/volcano/blob/master/docs/design/capacity-scheduling.md)

## 环境设置

### 安装火山

参考【安装指南】(https://github.com/volcano-sh/volcano/blob/master/installer/README.md)安装volcano。

安装后，更新调度程序配置：

```shell
kubectl edit cm -n volcano-system volcano-scheduler-configmap
```

请确保

- 回收操作已启用。
- 启用容量插件并删除比例插件。

注意：容量和比例插件是冲突的，两个插件不能一起使用。

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: volcano-scheduler-configmap
  namespace: volcano-system
data:
  volcano-scheduler.conf: |
    actions: "enqueue, allocate, backfill, reclaim" # add reclaim action.
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
      - name: capacity # add this field and remove proportion plugin.
      - name: nodeorder
      - name: binpack
```

## 配置队列应有的资源

假设您的 kubernetes 集群中有两个节点和两个队列，分别名为queue1和queue2，每个节点有4个CPU和16Gi内存，那么集群中总共有8个CPU和32Gi内存。

```yaml
allocatable:
  cpu: "4"
  memory: 16Gi
  pods: "110"
```

配置queue1的应有字段，具有2个cpu和8Gi内存。

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: queue1
spec:
  reclaimable: true
  deserved: # set the deserved field.
    cpu: 2
    memory: 8Gi
```

配置queue2的应有字段，具有6个cpu和24Gi内存。

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: queue2
spec:
  reclaimable: true
  deserved: # set the deserved field.
    cpu: 6
    memory: 24Gi
```

## 将 pod 提交到每个队列

首先向queue1提交一个名为demo-1的部署，replicas=8，每个pod请求1个cpu和4Gi内存，因为queue2空闲，所以queue1可以使用整个集群的资源，可以看到有8个pod处于Running状态。

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
        scheduling.volcano.sh/queue-name: "queue1" # set the queue
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

然后向queue2提交一个名为demo-2的部署，replicas=8，每个pod请求1个cpu和4Gi内存。

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
        scheduling.volcano.sh/queue-name: "queue2" # set the queue
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

由于queue1占用了queue2的资源，所以queue2会用6个cpu和24Gi内存回收其应得的资源。而 demo-2 的每个 pod 请求 1 个 cpu 和 4Gi 内存，因此 demo-2 会有 6 个 Pod 处于 Running 状态，demo-1 的 pod 将被驱逐。

最后可以看到demo-1（属于queue1）有2个正在运行的pod，demo-2（属于queue2）有6个正在运行的pod，分别满足了队列应得的资源。

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
