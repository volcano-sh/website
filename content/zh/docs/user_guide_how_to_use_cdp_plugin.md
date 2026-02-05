++
title = "Cooldown Protection 插件用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_cdp_plugin/"
[menu.docs]
  parent = "user-guide"
++

## 背景
在开启弹性训练或弹性推理场景下，可抢占作业（preemptible job）的 Pod 可能会被频繁抢占、重新运行；如果没有任何“冷却保护（cooldown protection）”，这些 Pod 可能在刚启动不久又被立即抢占，从而导致服务稳定性下降。  
为了解决这一问题，引入了 **cdp 插件**，用于保证可抢占作业中的 Pod 至少可以按照用户设置的时间运行一段时间。

## 环境准备

### 安装 Volcano

参考 [安装指南](https://github.com/volcano-sh/volcano/blob/master/installer/README.md) 安装 Volcano。

### 更新调度器 ConfigMap

安装完成后，更新调度器配置：

```shell
kubectl edit configmap -n volcano-system volcano-scheduler-configmap
```

在 ConfigMap 中注册 `cdp` 插件，并确保启用了 `preempt` action：

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: volcano-scheduler-configmap
  namespace: volcano-system
data:
  volcano-scheduler.conf: |
    actions: "enqueue, allocate, preempt, backfill"
    tiers:
    - plugins:
      - name: priority
      - name: gang
      - name: conformance
      - name: cdp
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

### 运行作业

下面以一个简单的 Volcano Job 为例，该作业包含 `ps` 和 `worker` 两个任务：

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: test-job
spec:
  minAvailable: 3
  schedulerName: volcano
  priorityClassName: high-priority
  plugins:
    ssh: []
    env: []
    svc: []
  maxRetry: 5
  queue: default
  volumes:
    - mountPath: "/myinput"
    - mountPath: "/myoutput"
      volumeClaimName: "testvolumeclaimname"
      volumeClaim:
        accessModes: [ "ReadWriteOnce" ]
        storageClassName: "my-storage-class"
        resources:
          requests:
            storage: 1Gi
  tasks:
    - replicas: 6
      name: "worker"
      template:
        metadata:
          name: worker
        spec:
          containers:
            - image: nginx
              imagePullPolicy: IfNotPresent
              name: nginx
              resources:
                requests:
                  cpu: "1"
          restartPolicy: OnFailure
    - replicas: 2
      name: "ps"
      template:
        metadata:
          name: ps
        spec:
          containers:
            - image: nginx
              imagePullPolicy: IfNotPresent
              name: nginx
              resources:
                requests:
                  cpu: "1"
          restartPolicy: OnFailure

```

#### 修改 Volcano Job 的 YAML

1. 在 Volcano Job 中增加如下注解：
   1. `volcano.sh/preemptable`：标识该 Job 或 Task 是否为可抢占；
   2. `volcano.sh/cooldown-time`：标识整个 Job 或某个 Task 的冷却时长。该值表示冷却时间，支持的时间单位为 `"ns"`、`"us"`（或 `"µs"`）、`"ms"`、`"s"`、`"m"`、`"h"`。

   示例：

   ```yaml
       volcano.sh/preemptable: "true"
       volcano.sh/cooldown-time: "600s"
   ```

**示例 1：为整个 Job 配置冷却保护**

为整个 Job 增加注解，此时 `ps` 和 `worker` 两个任务都可以被抢占，并且都具有冷却保护：

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: test-job
  annotations:
    volcano.sh/preemptable: "true"
    volcano.sh/cooldown-time: "600s"
spec:
  ... # 其余配置保持不变
```

**示例 2：仅为指定 Task 配置冷却保护**

下面的示例中，仅对 `worker` 任务设置为可抢占并具备冷却保护，`ps` 不受影响：

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: test-job
spec:
  minAvailable: 3
  schedulerName: volcano
  priorityClassName: high-priority
  plugins:
    ssh: []
    env: []
    svc: []
  maxRetry: 5
  queue: default
  volumes:
    - mountPath: "/myinput"
    - mountPath: "/myoutput"
      volumeClaimName: "testvolumeclaimname"
      volumeClaim:
        accessModes: [ "ReadWriteOnce" ]
        storageClassName: "my-storage-class"
        resources:
          requests:
            storage: 1Gi
  tasks:
    - replicas: 6
      name: "worker"
      template:
        metadata:
          name: worker
          annotations:     # 在任务级别增加注解
            volcano.sh/preemptable: "true"
            volcano.sh/cooldown-time: "600s"
        spec:
          containers:
            - image: nginx
              imagePullPolicy: IfNotPresent
              name: nginx
              resources:
                requests:
                  cpu: "1"
          restartPolicy: OnFailure
    - replicas: 2
      name: "ps"
      template:
        metadata:
          name: ps
        spec:
          containers:
            - image: nginx
              imagePullPolicy: IfNotPresent
              name: nginx
              resources:
                requests:
                  cpu: "1"
          restartPolicy: OnFailure

```

