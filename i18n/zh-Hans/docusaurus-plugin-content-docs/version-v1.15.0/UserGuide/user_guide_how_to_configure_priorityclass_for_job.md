---
title: "如何为 Job 配置 PriorityClass"

---


## 背景
当用户创建一个 Job 时，如果在任务模板中未指定 `PriorityClassName`，该任务将沿用 Job 层面指定的 `PriorityClassName`。用户也可以在每个任务的模板中单独指定 `PriorityClassName`，以此覆盖 Job 层面的配置，从而实现为每个任务单独设置优先级。

## 关键点
- 如果任务未指定 `PriorityClassName`，但 Job 已指定，则该任务将使用 Job 的 PriorityClass；此时，其 `PreemptionPolicy`（抢占策略）和优先级数值也将与 Job 的设置保持一致。
- 当用户需要允许 Job 中的任务在资源不足时抢占其他任务，必须在**该任务**的模板中单独设置 `PriorityClassName`。**特别需要注意的是：如果存在多个任务需要被设定为不同的优先级，用户必须分别为所有这些任务设置 `PriorityClassName`**；否则，未指定 `PriorityClassName` 的任务将默认沿用其所属 Job 的 PriorityClass。 ## 示例
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
priorityClassName: task-priority # 为此任务单独指定了 PriorityClass
containers:
- image: alpine
command: ["/bin/sh", "-c", "sleep 1000"]
name: preempt
resources:
requests:
cpu: 1
- replicas: 1
name: non-preempt-task # 此任务未指定 PriorityClassName，因此将沿用 Job 层面指定的 "job-priority" PriorityClass
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