++
title = "Volcano Job 插件 Env 用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_env_plugin/"
[menu.docs]
  parent = "user-guide"
++

## 背景
**Env 插件** 适用于需要让 Pod 感知自己在 Task 中索引的业务场景，例如 [MPI](https://www.open-mpi.org/) 和 [TensorFlow](https://tensorflow.google.cn/)。  
当 Volcano Job 被创建时，插件会自动为 Pod 注入索引相关的**环境变量**。  
例如，一个 TensorFlow 作业包含 *1* 个 ps 和 *2* 个 worker，每个 worker 负责一部分原始数据切片。为了让 worker 知道自己处理的是哪一段数据，可以通过环境变量获得其在任务中的索引。

## 关键点
* 环境变量中的索引键为 `VK_TASK_INDEX` 和 `VC_TASK_INDEX`，两者的取值相同。
* 索引取值范围为 `0` 到 `length - 1`，其中 `length` 为该 task 的副本数（replicas），也就是当前 Pod 在该 task 中的序号。

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
    env: []   ## 注册 Env 插件，注意数组中不需要填写任何值
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
                  export TF_CONFIG={\"cluster\":{\"ps\":[${PS_HOST}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"ps\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};   ## 从环境变量中获取索引并配置到 TF 作业中
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
* 在上述 TensorFlow 作业中启用 Env 插件后，所有 Pod 都会自动注入两个环境变量 `VK_TASK_INDEX` 和 `VC_TASK_INDEX`。  
  `ps` Pod 中的环境变量示例如下：

```
[root@tensorflow-dist-mnist-ps-0 /] env | grep TASK_INDEX
VK_TASK_INDEX=0
VC_TASK_INDEX=0
```

* 对于 2 个 worker，它们的 Pod 名分别为 `tensorflow-dist-mnist-worker-0` 和 `tensorflow-dist-mnist-worker-1`，对应的索引环境变量值如下：

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

## 备注
* 由于历史原因，环境变量 `VK_TASK_INDEX` 与 `VC_TASK_INDEX` 同时存在，未来版本中 **`VK_TASK_INDEX` 将被废弃**。
* 在 Volcano Job 中注册 Env 插件时，数组中**不需要**设置任何参数值，保持为空即可。

