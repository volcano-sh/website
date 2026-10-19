---
title: "Volcano Job 插件 -- Env 用户指南"
---


## 背景

**Env 插件**适用于 Pod 需要感知自身在 Task 中索引的业务场景，例如 [MPI](https://www.open-mpi.org/) 与 [TensorFlow](https://tensorflow.google.cn/)。Volcano Job 创建时，索引会自动注册为**环境变量**。例如 TensorFlow Job 包含 1 个 `ps` 和 2 个 `worker`，每个 worker 对应一份数据分片；为使 worker 知道处理哪一片，可通过环境变量获取索引。

## 要点

* 环境变量键名为 `VK_TASK_INDEX` 与 `VC_TASK_INDEX`，二者取值相同。
* 索引值为从 `0` 到 `length - 1` 的整数，`length` 等于该 Task 的副本数，也是 Pod 在 Task 中的序号。

## 示例

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-dist-mnist
spec:
  minAvailable: 3
  schedulerName: volcano
  plugins:
    env: []   ## 注册 Env 插件，数组中无需填写值
    svc: []
  policies:
    - event: PodEvicted
      action: RestartJob
  queue: default
  tasks:
    - replicas: 1
      name: ps
      template:
        spec:
          containers:
            - command:
                - sh
                - -c
                - |
                  PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' | sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  WORKER_HOST=`cat /etc/volcano/worker.host | sed 's/$/&:2222/g' | sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  export TF_CONFIG={\"cluster\":{\"ps\":[${PS_HOST}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"ps\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};   ## 从环境变量获取索引并配置 TF Job
                  python /var/tf_dist_mnist/dist_mnist.py
              image: volcanosh/dist-mnist-tf-example:0.0.1
              name: tensorflow
              ports:
                - containerPort: 2222
                  name: tfjob-port
              resources: {}
          restartPolicy: Never
    - replicas: 2
      name: worker
      policies:
        - event: TaskCompleted
          action: CompleteJob
      template:
        spec:
          containers:
            - command:
                - sh
                - -c
                - |
                  PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' | sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  WORKER_HOST=`cat /etc/volcano/worker.host | sed 's/$/&:2222/g' | sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  export TF_CONFIG={\"cluster\":{\"ps\":[${PS_HOST}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"worker\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};
                  python /var/tf_dist_mnist/dist_mnist.py
              image: volcanosh/dist-mnist-tf-example:0.0.1
              name: tensorflow
              ports:
                - containerPort: 2222
                  name: tfjob-port
              resources: {}
          restartPolicy: Never
```

## 说明

* 在上述 TensorFlow Job 中启用 Env 插件后，所有 Pod 都会拥有 `VK_TASK_INDEX` 与 `VC_TASK_INDEX`。`ps` Pod 中的环境变量如下：

```
[root@tensorflow-dist-mnist-ps-0 /] env | grep TASK_INDEX
VK_TASK_INDEX=0
VC_TASK_INDEX=0
```

* 两个 worker 的名称分别为 `tensorflow-dist-mnist-worker-0` 与 `tensorflow-dist-mnist-worker-1`，对应索引为 `0` 与 `1`：

```
[root@tensorflow-dist-mnist-worker-0 /] env | grep TASK_INDEX
VK_TASK_INDEX=0
VC_TASK_INDEX=0
```

```
[root@tensorflow-dist-mnist-worker-1 /] env | grep TASK_INDEX
VK_TASK_INDEX=1
VC_TASK_INDEX=1
```

* 因历史原因，`VK_TASK_INDEX` 与 `VC_TASK_INDEX` 同时存在；`VK_TASK_INDEX` 将在后续版本中**废弃**。
* 在 Volcano Job 中注册 Env 插件时，数组中**无需填写值**。
