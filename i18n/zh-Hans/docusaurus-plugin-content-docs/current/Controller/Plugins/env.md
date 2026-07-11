---
title: Env

---


## 背景
**Env Plugin** 是为业务而设计的，pod 应该知道其在任务中的索引，例如 [MPI](https://www.open-mpi.org/)
和[TensorFlow](https://tensorflow.google.cn/)。索引将自动注册为**环境变量**
当 Volcano 作业创建时。例如，一个张量流作业由 *1* ps 和 *2* 个worker 组成。以及每个工人的地图 
到原始数据切片。为了让工作人员了解其目标切片，他们在环境中获取索引
变量。

## 要点
* 环境变量的索引键是`VK_TASK_INDEX`和`VC_TASK_INDEX`，它们具有相同的值。
* 索引的值是一个范围从“0”到“length - 1”的数字。 “长度”等于副本数 
的任务。它也是任务中 pod 的索引。

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
    env: []   ## Env plugin register, note that no values are needed in the array.
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
                  export TF_CONFIG={\"cluster\":{\"ps\":[${PS_HOST}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"ps\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};   ## Get the index from the environment variable and configure it in the TF job.
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
## 注意：
* 在上述 TensorFlow 作业中配置 env 插件时，所有 Pod 都将拥有 2 个环境变量 `VK_TASK_INDEX` 和 `VC_TASK_INDEX`。在 `ps` Pod 中注册的环境变量如下。
```
[root@tensorflow-dist-mnist-ps-0 /] env | grep TASK_INDEX
VK_TASK_INDEX=0
VC_TASK_INDEX=0
```
* 考虑到 2 个 worker，您会发现它们的名称分别为 `tensorflow-dist-mnist-worker-0` 和 `tensorflow-dist-mnist-worker-1`。索引环境变量的对应值分别为 `0` 和 `1`。
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

## 注意：
* 由于历史原因，环境变量`VK_TASK_INDEX`和`VC_TASK_INDEX`同时存在，`VK_TASK_INDEX`将会
在未来版本中**弃用**。
* 在火山作业中注册 env 插件时不需要任何值。