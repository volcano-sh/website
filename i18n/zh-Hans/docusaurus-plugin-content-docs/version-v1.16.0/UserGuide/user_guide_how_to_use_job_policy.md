---
title: "Volcano Job Policy 用户指南"
---

## 背景

`Policy` 为 Volcano Job 与 Task 的生命周期管理提供 API。例如，在部分场景下——尤其是 AI、大数据与 HPC 领域——若任意 `master` 或 `worker` 失败，需要重新启动作业。用户可在 `job.spec` 下为 Volcano Job 配置 `policy` 即可轻松实现。

## 要点

* Volcano 允许用户为 Volcano Job 或 Task 配置一对 `Event`（`Events`）与 `Action`。当指定的事件（events）发生时，将触发对应操作。若配置了 `timeout`，则在超时延迟后执行目标操作。
* 若仅在 `job.spec` 下配置策略，默认对所有 Task 生效。若仅在 `task.spec` 下配置，则仅对该 Task 生效。若在 Job 与 Task 两级均配置，以 Task 级策略为准。
* 用户可为同一 Job 或 Task 配置多条策略。
* 目前 Volcano 提供 **6 个内置事件**，如下所示。

| 编号 | Event           | 说明                                                                                                       |
| ---- | --------------- | ---------------------------------------------------------------------------------------------------------- |
| 1    | `PodFailed`     | 检查是否存在状态为 `Failed` 的 Pod。                                                                       |
| 2    | `PodEvicted`    | 检查是否存在被驱逐的 Pod。                                                                                 |
| 3    | `PodPending`    | 检查是否存在处于 Pending 的 Pod。通常与 timeout 配合使用；若 Pod 不再 Pending，将取消超时操作。            |
| 4    | `TaskCompleted` | 检查是否存在所有 Pod 均成功的 Task。若 Task 配置了 `minsuccess`，也会视为 Task 完成。                      |
| 5    | `Unknown`       | 检查 Volcano Job 状态是否为 `Unknown`。常见原因是 Task 不可调度；在 gang 调度场景下，部分 Pod 无法调度而部分已在运行时触发。 |
| 6    | `*`             | 表示所有事件，较少使用。                                                                                   |

* 目前 Volcano 提供 **7 个内置操作**，如下所示。

| 编号 | Action             | 说明                                                                                                  |
| ---- | ------------------ | ----------------------------------------------------------------------------------------------------- |
| 1    | `AbortJob`         | 中止整个 Job，但可恢复。所有 Pod 将被驱逐且不会重建。                                                 |
| 2    | `RestartJob`       | 重启整个 Job。                                                                                        |
| 3    | `RestartTask`      | 重启该 Task。此操作**不能**与 Job 级事件（如 `Unknown`）配合使用。                                    |
| 4    | `RestartPod`       | 重启该 Pod。此操作**不能**与 Job 级事件（如 `Unknown`）配合使用。                                     |
| 5    | `RestartPartition` | 重启该分区。此操作**不能**与 Job 级事件（如 `Unknown`）配合使用。                                     |
| 6    | `TerminateJob`     | 终止整个 Job 且**不可**恢复。所有 Pod 将被驱逐且不会重建。                                            |
| 7    | `CompleteJob`      | 将 Job 视为已完成，未完成的 Pod 将被终止。                                                            |

## 示例

1. 配置一对 `event` 与 `action`。
```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-dist-mnist
spec:
  minAvailable: 3
  schedulerName: volcano
  plugins:
    env: []
    svc: []
  policies:
    - event: PodEvicted   # Job level policy. If any pod is evicted, restart the job.
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
        - event: TaskCompleted    # Task level policy. If this task completes, complete the job.
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
2. 配置一对 `events` 与 `action`。
```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-dist-mnist
spec:
  minAvailable: 3
  schedulerName: volcano
  plugins:
    env: []
    svc: []
  queue: default
  tasks:
    - replicas: 1
      name: ps
      policies:
        - events: [PodEvicted, PodFailed]   # Task level policy. If any pod is evicted or fails in this task, restart the job.
          action: RestartJob
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
        - event: TaskCompleted  # Task level policy. If this task completes, complete the job.
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
3. 配置 `events`、`action` 与 `timeout`。
```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-dist-mnist
spec:
  minAvailable: 3
  schedulerName: volcano
  plugins:
    env: []
    svc: []
  queue: default
  tasks:
    - replicas: 1
      name: ps
      policies:
        - events: PodFailed   # Task level policy. If any pod fails in this task, restart the pod.
          action: RestartPod
        - events: PodEvicted   # Task level policy. If any pod is evicted in this task, restart the job after 10 minutes.
          action: RestartJob
          timeout: 10m
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
        - event: TaskCompleted  # Task level policy. If this task completes, complete the job.
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
