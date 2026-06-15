---
title: CDP

---


## 背景
当我们需要启用弹性训练或服务时，抢占式作业的 Pod 可以被抢占或重复重新运行，如果没有设置冷却保护，这些 Pod 可能会在刚启动一段时间后再次被抢占，这可能会导致服务稳定性下降。
因此，我们添加“cdp”插件来确保抢占式作业的 pod 可以至少运行用户设置的一段时间。

## 环境设置

### 安装火山

参考【安装指南】(https://github.com/volcano-sh/volcano/blob/master/installer/README.md)安装volcano。

### 更新调度程序配置图

安装后，更新调度程序配置：

```shell
kubectl edit configmap -n volcano-system volcano-scheduler-configmap
```

在 configmap 中注册 `cdp` 插件，同时启用 `preempt` 操作

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

### 正在运行的作业

以一个简单的火山作业为例。

原始作业yaml如下，其中有“ps”和“worker”任务

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

#### 编辑vcjob的yaml

1. 按照下面的格式在火山作业中添加注释。
   1. `volcano.sh/preemptable` 注解表示作业或任务是可抢占的
   2.`volcano.sh/cooldown-time`注释表示整个作业或专用任务的冷却时间。注释的值表示冷却时间，有效的时间单位为“ns”、“us”（或“μs”）、“ms”、“s”、“m”、“h”。

        ```yaml
            volcano.sh/preemptable: "true"
            volcano.sh/cooldown-time: "600s"
        ```

**示例1**

为整个作业添加注释，然后“ps”和“worker”任务可以被抢占，并且都有冷却时间支持。

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: test-job
  annotations:
    volcano.sh/preemptable: "true"
    volcano.sh/cooldown-time: "600s"
spec:
  ... # below keep the same
```

**示例2**

为专用任务添加注解，如下图，只有“worker”可以抢占，并且有冷却时间支持。

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
          annotations:     # add annotation in tasks
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
