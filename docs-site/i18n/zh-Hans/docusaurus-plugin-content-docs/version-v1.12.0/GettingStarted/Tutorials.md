---
title: "教程"
---
本节提供指导帮助您快速上手 Volcano，从部署基本的 Volcano Job/Deployment，到集成 Volcano 队列。

## 前置条件
已成功安装带有 Volcano 组件的 Kubernetes 集群。如果您尚未安装 Volcano，请参阅 [安装指南](/zh-Hans/docs/Installation/)。

## 快速开始：部署 Volcano Job
本快速开始指南将引导您部署一个简单的 Volcano Job。默认情况下，如果未提供特定队列，Volcano Jobs 将使用默认队列 (default queue)。

### 步骤 1：创建 Volcano Job
创建一个名为 vcjob-quickstart.yaml 的文件，内容如下：
```shell
# vcjob-quickstart.yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: quickstart-job
spec:
  minAvailable: 3
  schedulerName: volcano
  # 如果省略 'queue' 字段，将使用 'default' 队列。
  # queue: default
  policies:
    # 如果一个 pod 失败（例如，由于应用程序错误），则重启整个 job。
    - event: PodFailed
      action: RestartJob
  tasks:
    - replicas: 3
      name: completion-task
      policies:
      # 当此特定任务成功完成时，将整个 job 标记为 Complete。
      - event: TaskCompleted
        action: CompleteJob
      template:
        spec:
          containers:
            - command:
              - sh
              - -c
              - 'echo "Job is running and will complete!"; sleep 100; echo "Job done!"'
              image: busybox:latest
              name: busybox-container
              resources:
                requests:
                  cpu: 1
                limits:
                  cpu: 1
          restartPolicy: Never
```
此 job 创建三个 pod 并将它们作为一个组进行调度。Pod 模板使用简单的 busybox 容器并休眠 100 秒。
如果 pod 完成，job 也将转换为完成状态。

### 步骤 2：监控 Job 和 Pod 状态
您可以观察 VolcanoJob 不及其关联 Pod 的进度。

首先，检查 VolcanoJob 状态。您应该看到类似于以下的输出（确切的时间戳和 UID 会有所不同）：
```shell
# kubectl get vcjob quickstart-job -oyaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  # ... (metadata details) ...
  name: quickstart-job
  namespace: default
  # ...
spec:
  maxRetry: 3
  minAvailable: 3
  policies:
  - action: RestartJob
    event: PodFailed
  queue: default
  schedulerName: volcano
  tasks:
  - maxRetry: 3
    minAvailable: 3
    name: completion-task
    policies:
    - action: CompleteJob
      event: TaskCompleted
    replicas: 3
    template:
      metadata: {}
      spec:
        containers:
        - command:
          - sh
          - -c
          - echo "Job is running and will complete!"; sleep 100; echo "Job done!"
          image: busybox:latest
          name: busybox-container
          resources:
            limits:
              cpu: "1"
            requests:
              cpu: "1"
        restartPolicy: Never
status:
  conditions:
  - lastTransitionTime: "2025-05-28T08:39:22Z"
    status: Pending
  - lastTransitionTime: "2025-05-28T08:39:23Z"
    status: Pending
  - lastTransitionTime: "2025-05-28T08:39:27Z"
    status: Pending
  - lastTransitionTime: "2025-05-28T08:39:28Z"
    status: Pending
  - lastTransitionTime: "2025-05-28T08:39:30Z"
    status: Running
  minAvailable: 3
  running: 3
  state:
    lastTransitionTime: "2025-05-28T08:39:30Z"
    phase: Running
  taskStatusCount:
    completion-task:
      phase:
        Running: 3
```

接下来，检查由 Volcano Job 创建的 Pod 的状态：

```bash
kubectl get pod -l volcano.sh/job-name=quickstart-job
```
最初，pod 将处于 Running 状态。大约 100 秒后，busybox 容器将退出，pod 的状态将变为 Completed。
```
NAME                               READY   STATUS      RESTARTS   AGE
quickstart-job-completion-task-0   0/1     Completed   0          3m59s
quickstart-job-completion-task-1   0/1     Completed   0          3m59s
quickstart-job-completion-task-2   0/1     Completed   0          3m59s
```

一旦 Pod 完成，VolcanoJob 中的 `TaskCompleted` 策略将触发 `CompleteJob` 动作。
这将使 VolcanoJob 的阶段转换为 Completed：
```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  # ... (metadata details) ...
  name: quickstart-job
  namespace: default
  # ...
status:
  #...
  minAvailable: 3
  runningDuration: 1m49s
  state:
    lastTransitionTime: "2025-05-28T08:41:11Z"
    phase: Completed
  version: 3

```

## 部署标准 Kubernetes 工作负载 (Deployment, StatefulSet 等)
Volcano 无缝集成标准 Kubernetes 工作负载，如 Deployment、StatefulSet 等，扩展了它们的调度能力。
这意味着您可以利用 Volcano 的高级功能，例如 gang scheduling（Gang 调度）。使用 gang scheduling，您可以指定必须作为一个组进行调度的最小 pod 数量，然后才会启动该工作负载的任何 pod。

### 步骤 1：创建带有 group-min-member 注解的 Deployment
让我们创建一个 Deployment，它期望 3 个副本，但要求至少 2 个 pod 作为一个组被 Volcano 调度。
```yaml
# deployment-with-minmember.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-deployment
  annotations:
    # Gang 调度的关键：此注解告诉 Volcano 将此 deployment 视为一个 gang，
    # 在启动任何 pod 之前，要求至少 2 个 pod 可以一起调度。
    scheduling.volcano.sh/group-min-member: "2"
  labels:
    app: my-app
spec:
  replicas: 3 # 我们希望应用程序有 3 个副本
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      # annotations:
      #   可选：您还可以为此 deployment 创建的 PodGroup 指定特定的 Volcano 队列。
      #   scheduling.volcano.sh/queue-name: "my-deployment-queue"
      labels:
        app: my-app
    spec:
      schedulerName: volcano # 关键：确保此 deployment 的 pod 使用 Volcano 调度器
      containers:
        - name: my-container
          image: busybox
          command: ["sh", "-c", "echo 'Hello Volcano from Deployment'; sleep 3600"] # 用于演示的长时间运行命令
          resources:
            requests:
              cpu: 1
            limits:
              cpu: 1
```

### 步骤 2：观察自动创建的 PodGroup 和 Pod

当您应用带有 `scheduling.volcano.sh/group-min-member` 注解的 Deployment (或 StatefulSet) 时，Volcano 会自动创建一个 PodGroup 资源。
此 PodGroup 负责强制执行属于您的工作负载的 pod 的 gang 调度约束。

检查 PodGroup 状态：
```bash
kubectl get pg podgroup-[UID of Replicaset] -oyaml
```
您应该看到类似于以下的输出：
```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: PodGroup
metadata:
  # ...
  name: podgroup-09e95eb0-e520-4b50-a15c-c14cad844674
  namespace: default
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: ReplicaSet
    name: my-app-deployment-74644c8849
    uid: 09e95eb0-e520-4b50-a15c-c14cad844674
  # ...
spec:
  minMember: 2
  minResources:
    count/pods: "2"
    cpu: "2"
    limits.cpu: "2"
    pods: "2"
    requests.cpu: "2"
  queue: default
status:
  conditions:
  - lastTransitionTime: "2025-05-28T09:08:13Z"
    reason: tasks in gang are ready to be scheduled
    status: "True"
    transitionID: e0b1508e-4b77-4dea-836f-0b14f9ca58df
    type: Scheduled
  phase: Running
  running: 3
```
您将观察到 Volcano 的调度器确保至少 minMember (本例中为 2) 个 pod 可以一起调度，然后才允许启动此 deployment 的任何 pod。
如果没有足够的资源供这些 pod 使用，这些 pod 将保持 pending 状态。

## 使用自定义队列部署工作负载
### 步骤 1：创建自定义队列
让我们创建一个名为 "development-queue" 的队列，具有特定的 CPU 能力。分配给此队列的作业将争夺其能力定义的资源。

创建一个名为 queue.yaml 的文件：
```yaml
# queue.yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: development-queue
spec:
  weight: 1 # 队列之间调度优先级的相对权重
  reclaimable: false # 如果为 true，其他队列中的作业可以回收此队列中的资源
  capability:
    cpu: 2
```
在您的集群中创建队列：
```bash
kubectl create -f queue.yaml
```
一个新队列将被创建并转变为 Open 状态：
```yaml
# kubectl get queue development-queue -oyaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  # ...
  name: development-queue
  # ...
spec:
  capability:
    cpu: 2
  parent: root
  reclaimable: false
  weight: 1
status:
  allocated:
    cpu: "0"
    memory: "0"
  state: Open
```

### 步骤 2：使用自定义队列创建 Volcano Job
现在，让我们创建一个明确使用我们的 development-queue 的 VolcanoJob。

创建一个名为 vcjob-with-queue.yaml 的文件并应用它：
```yaml
# vcjob-with-queue.yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: job-with-custom-queue
spec:
  minAvailable: 1
  schedulerName: volcano
  queue: development-queue # 将此 job 分配给我们的自定义队列
  tasks:
    - replicas: 1
      name: custom-queue-task
      policies:
      - event: TaskCompleted
        action: CompleteJob
      template:
        spec:
          containers:
            - command:
              - sh
              - -c
              - 'echo "Running in custom queue"; sleep 100; echo "Done!"'
              image: busybox:latest
              name: busybox-in-queue
              resources:
                requests:
                  cpu: 1
                limits:
                  cpu: 1
          restartPolicy: Never
```
### 步骤 3：检查自定义队列状态
您可以监控自定义队列的状态，查看已分配了多少资源
```bash
kubectl get queue development-queue -oyaml
```
预期输出：
```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  # ...
  name: development-queue
  # ...
spec:
  capability:
    cpu: 2
  parent: root
  reclaimable: false
  weight: 1
status:
  allocated:
    cpu: "1"
    memory: "0"
    pods: "1"
  state: Open

```
