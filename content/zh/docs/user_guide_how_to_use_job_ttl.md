+++
title = "Volcano Job 生存时间 (TTL) 用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_job_ttl/"
[menu.docs]
  parent = "user-guide"
+++

## 背景

与标准的 Kubernetes `Job` 资源类似，VolcanoJob 也可以配置在执行完成后（无论是 `Complete` 还是 `Failed`）被**自动垃圾回收**。  
通过设置 `spec.ttlSecondsAfterFinished` 字段，可以限制作业对象在完成后的生存时间（Time To Live, TTL）。

## 关键点

`ttlSecondsAfterFinished` 是 VolcanoJob 上的一个**可选字段**，默认值为 `nil`。  
其语义如下：

- 必须是一个**正整数**，表示作业完成（`Complete` 或 `Failed`）后，经过多少秒才会被标记为**可垃圾回收**；
- 如果未设置或显式设置为 `nil`：  
  - 作业对象将**无限期保留**，不会因为 TTL 而被自动删除；
- 如果设置为 `0`：  
  - 作业在完成的**瞬间**就会变为可垃圾回收；
- 如果设置为正整数 `N`：  
  - 作业在完成 `N` 秒之后，才会变为可垃圾回收。

## 延伸阅读

虽然这里使用的是 Volcano 自身的垃圾回收实现，但行为几乎与标准 `batch.v1 Job` 资源上的 `ttlSecondsAfterFinished` 相同。  
可以参考 Kubernetes 官方文档，了解在更复杂场景下如何配合 Mutating Webhook 等机制使用 TTL：

- [Kubernetes 官方文档：TTL 控制已结束的作业](https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/)

## 示例

下面的清单创建了一个 Volcano Job，该 Job 在完成（无论成功还是失败）**10 分钟后**将变为可垃圾回收：

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  generateName: test-job-
spec:
  minAvailable: 1
  schedulerName: volcano
  queue: testing
  ttlSecondsAfterFinished: 600
  policies:
    - event: PodEvicted
      action: RestartJob
  tasks:
    - replicas: 1
      name: sleeper
      policies:
        - event: TaskCompleted
          action: CompleteJob
      template:
        spec:
          restartPolicy: Never
          imagePullPolicy: IfNotPresent
          containers:
            - name: sleeper
              image: debian:buster
              command:
                - /bin/bash
                - -c
                - |
                  for i in {0..5}; do
                      echo "sleeping"
                      sleep 1
                  done
```

