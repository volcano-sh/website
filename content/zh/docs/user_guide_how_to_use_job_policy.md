+++
title = "Volcano Job Policy 用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_job_policy/"
[menu.docs]
  parent = "user-guide"
+++

## 背景
`Policy` 为用户提供了对 Volcano 作业（job）和任务（task）生命周期进行管理的 API。  
例如，在很多场景下（尤其是 AI、大数据和 HPC 领域），如果任意一个 `master` 或 `worker` 失败，就需要**重启整个作业**。  
用户可以在 `job.spec` 下配置 `policy` 来很方便地实现这一需求。

## 关键点
* Volcano 允许用户在 Job 或 Task 级别配置一组 `Event`（或 `Events`）与 `Action` 的组合：当指定的事件发生时，会触发对应的动作。如果配置了 `timeout`，则在超时时间到达后才执行该动作。
* 如果只在 `job.spec` 下配置 policy，则该策略默认对**所有任务**生效；如果仅在 `task.spec` 下配置 policy，则只对该 Task 生效；若 Job 和 Task 级别都配置了 policy，则**Task 级别的配置优先生效**。
* 同一个 Job 或 Task 可以配置多个 policy。
* 当前 Volcano 提供了 **6 种内置事件（Event）**，如下表：

| ID | Event           | 描述 |
|----|-----------------|------|
| 1  | `PodFailed`     | 检查是否存在状态为 `Failed` 的 Pod。 |
| 2  | `PodEvicted`    | 检查是否存在被驱逐（Evicted）的 Pod。 |
| 3  | `PodPending`    | 检查是否存在一直处于 Pending 状态的 Pod。通常与 `timeout` 配合使用：若 Pod 不再 Pending，则取消超时动作。 |
| 4  | `TaskCompleted` | 检查是否存在所有 Pod 都成功的 Task；如果 Task 配置了 `minsuccess`，达到该条件也会被视为完成。 |
| 5  | `Unknown`       | 检查 Volcano Job 的状态是否为 `Unknown`。常见原因是部分 Pod 无法调度，而在 Gang 调度场景下已有部分 Pod 运行。 |
| 6  | `*`             | 代表匹配所有事件，一般不常用。 |

* 当前 Volcano 提供了 **7 种内置动作（Action）**，如下表：

| ID | Action             | 描述 |
|----|--------------------|------|
| 1  | `AbortJob`         | 中止整个 Job，但可以被恢复；所有 Pod 会被驱逐，不会重新创建。 |
| 2  | `RestartJob`       | 重启整个 Job。 |
| 3  | `RestartTask`      | 重启对应 Task。**不能**与作业级别事件（如 `Unknown`）搭配使用。 |
| 4  | `RestartPod`       | 重启对应 Pod。**不能**与作业级别事件搭配使用。 |
| 5  | `RestartPartition` | 重启对应分区（Partition）。**不能**与作业级别事件搭配使用。 |
| 6  | `TerminateJob`     | 终止整个 Job，且**不可恢复**；所有 Pod 会被驱逐且不会重新创建。 |
| 7  | `CompleteJob`      | 将 Job 视为已完成（Complete），未完成的 Pod 会被终止。 |

## 示例

1. 配置一对 `event` 与 `action`

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
    - event: PodEvicted   # Job 级策略：任意 Pod 被驱逐时，重启整个 Job
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
                  export TF_CONFIG={\"cluster\":{\"ps\":[${PS_HOST}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"ps\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};   ## 从环境变量获取索引并配置到 TF 作业
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
        - event: TaskCompleted    # Task 级策略：当该任务完成时，将整个 Job 视为完成
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

2. 配置一对 `events` 与 `action`

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
        - events: [PodEvicted, PodFailed]   # Task 级策略：若本任务中任一 Pod 被驱逐或失败，则重启整个 Job
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
                  export TF_CONFIG={\"cluster\":{\"ps\":[${PS_HOST}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"ps\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};   ## 从环境变量获取索引并配置到 TF 作业
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
        - event: TaskCompleted  # Task 级策略：当该任务完成时，将 Job 视为完成
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

3. 配置多条 `events` 与 `action`

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
        - events: PodFailed   # Task 级策略：若本任务中任一 Pod 失败，则重启该 Pod
          action: RestartPod
        - events: PodEvicted  # Task 级策略：若本任务任一 Pod 被驱逐，10 分钟后重启整个 Job
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
                  export TF_CONFIG={\"cluster\":{\"ps\":[${PS_HOST}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"ps\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};   ## 从环境变量获取索引并配置到 TF 作业
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
        - event: TaskCompleted  # Task 级策略：当该任务完成时，将 Job 视为完成
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

