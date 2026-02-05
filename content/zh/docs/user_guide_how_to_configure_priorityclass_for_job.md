+++
title = "如何为作业配置 PriorityClass"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_configure_priorityclass_for_job/"
[menu.docs]
  parent = "user-guide"
+++

## 背景
当用户创建作业（Job）时，如果任务（Task）的模板中没有指定 `PriorityClassName`，则该任务会继承 Job 中配置的 `PriorityClassName`。用户也可以在每个任务的模板中单独指定 `PriorityClassName` 来覆盖 Job 级别的配置，从而为每个任务分别设置优先级。

## 关键点
- 如果任务本身未指定 `PriorityClassName`，但 Job 指定了，那么任务会使用 Job 的 PriorityClass，同时继承 Job 的 `PreemptionPolicy` 和优先级数值。
- 当用户希望 Job 中的某些任务在资源不足时可以抢占其他任务时，必须在这些任务的模板中单独设置 `PriorityClassName`；**需要注意的是，如果有多个任务需要设置为不同的优先级，则必须为这些任务全部单独设置 `PriorityClassName`**，否则未指定 `PriorityClassName` 的任务会继续使用 Job 级别的 PriorityClass。

## 示例
```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: job-priority
value: 1
preemptionPolicy: Never
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: task-priority
value: 10
---
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: job
spec:
  schedulerName: volcano
  priorityClassName: job-priority
  minAvailable: 1
  tasks:
    - replicas: 1
      name: preempt-task
      template:
        spec:
          priorityClassName: task-priority # 为该任务单独指定 PriorityClass
          containers:
            - image: alpine
              command: ["/bin/sh", "-c", "sleep 1000"]
              name: preempt
              resources:
                requests:
                  cpu: 1
    - replicas: 1
      name: non-preempt-task # 该任务未指定 PriorityClassName，将继承 Job 的 "job-priority" PriorityClass
      template:
        spec:
          containers:
            - image: alpine
              command: ["/bin/sh", "-c", "sleep 1000"]
              name: non-preempt
              resources:
                requests:
                  cpu: 1
```

