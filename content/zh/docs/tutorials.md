+++
title =  "快速开始"

date = 2019-01-28
lastmod = 2025-05-28

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "快速开始"
[menu.docs]
  parent = "getting-started"
  weight = 2
+++

本节将指导您快速上手Volcano，内容涵盖从部署基础的Volcano Job/Deployment到与Volcano队列集成等。

## 前提条件
您需要一个已成功安装Volcano组件的Kubernetes集群。如果尚未安装Volcano，请参考[安装文档](https://volcano.sh/en/docs/installation/)。

## 快速入门：部署一个Volcano Job
本快速入门指南将引导您部署一个简单的Volcano Job。如果未指定队列，Volcano Job默认使用`default`队列。

### 步骤1：创建Volcano Job
创建一个名为`vcjob-quickstart.yaml`的文件，内容如下：
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
    # 如果Pod失败（例如，由于应用程序错误），则重启整个作业。
    - event: PodFailed
      action: RestartJob
  tasks:
    - replicas: 3
      name: completion-task
      policies:
      # 当此特定任务成功完成时，将整个作业标记为"完成"。
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
此Job会创建三个Pod，并将它们作为一个组进行调度。Pod模板使用了一个简单的`busybox`容器，并休眠100秒。当Pod完成后，Job的状态也会转为完成。

### 步骤2：监控Job和Pod状态
您可以观察VolcanoJob及其关联Pod的进度。

首先，检查VolcanoJob的状态。您应该会看到类似以下的输出（确切的时间戳和UID会有所不同）：
```shell
# kubectl get vcjob quickstart-job -oyaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  # ... (元数据详情) ...
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

接下来，检查Volcano Job创建的Pod的状态：

```bash
kubectl get pod -l volcano.sh/job-name=quickstart-job
```
最初，Pod将处于`Running`状态。大约100秒后，`busybox`容器将退出，Pod的状态将变为`Completed`。
```
NAME                               READY   STATUS      RESTARTS   AGE
quickstart-job-completion-task-0   0/1     Completed   0          3m59s
quickstart-job-completion-task-1   0/1     Completed   0          3m59s
quickstart-job-completion-task-2   0/1     Completed   0          3m59s
```

一旦Pod完成，VolcanoJob中的`TaskCompleted`策略将触发`CompleteJob`操作，这会将VolcanoJob的阶段转换为`Completed`：
```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  # ... (元数据详情) ...
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

## 部署标准Kubernetes工作负载 (Deployment、StatefulSet等)
Volcano能够与Deployment、StatefulSet等标准Kubernetes工作负载无缝集成，扩展了它们的调度能力。这意味着您可以利用Volcano的高级特性，例如成组调度（gang scheduling）。通过成组调度，您可以指定一个最小数量的Pod，这些Pod必须能够作为一个组被同时调度，然后该工作负载的任何Pod才能启动。

### 步骤1：创建带有`group-min-member`注解的Deployment
让我们创建一个Deployment，它期望有3个副本，但要求至少有2个Pod能被Volcano作为一个组进行调度。
```yaml
# deployment-with-minmember.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-deployment
  annotations:
    # 对成组调度至关重要：此注解告知Volcano将此Deployment视为一个组，
    # 要求至少2个Pod能够一起调度，然后才会启动任何Pod。
    scheduling.volcano.sh/group-min-member: "2"
  labels:
    app: my-app
spec:
  replicas: 3 # 我们期望应用有3个副本
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      # annotations:
      #   可选：您也可以为此Deployment创建的PodGroup指定一个特定的Volcano队列。
      #   scheduling.volcano.sh/queue-name: "my-deployment-queue"
      labels:
        app: my-app
    spec:
      schedulerName: volcano # 关键：确保此Deployment的Pod使用Volcano调度器
      containers:
        - name: my-container
          image: busybox
          command: ["sh", "-c", "echo 'Hello Volcano from Deployment'; sleep 3600"] # 一个长时间运行的命令，用于演示
          resources:
            requests:
              cpu: 1
            limits:
              cpu: 1
```

### 步骤2：观察自动创建的PodGroup和Pod

当您应用带有`scheduling.volcano.sh/group-min-member`注解的Deployment（或StatefulSet）时，Volcano会自动创建一个PodGroup资源。此PodGroup负责为属于该工作负载的Pod强制执行成组调度约束。

检查PodGroup的状态：
```bash
kubectl get pg podgroup-[ReplicaSet的UID] -oyaml
```
您应该会看到类似以下的输出：
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
您将观察到Volcano调度器会确保至少`minMember`（本例中为2）个Pod能够一起调度，然后才允许此Deployment中的任何Pod启动。如果资源不足以满足这些Pod的需求，它们将保持`Pending`状态。

## 使用自定义队列部署工作负载
### 步骤1：创建自定义队列
让我们创建一个名为`development-queue`的队列，并为其指定特定的CPU能力（capability）。分配给此队列的作业将竞争该队列定义的能力范围内的资源。

创建一个名为`queue.yaml`的文件：
```yaml
# queue.yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: development-queue
spec:
  weight: 1 # 队列间的调度优先级相对权重
  reclaimable: false # 如果为true，其他队列中的作业可以回收此队列中的资源
  capability:
    cpu: 2
```
在集群中创建队列：
```bash
kubectl create -f queue.yaml
```
新队列将被创建并进入`Open`状态：
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

### 步骤2：创建使用自定义队列的Volcano Job
现在，我们创建一个显式使用`development-queue`的VolcanoJob。

创建一个名为`vcjob-with-queue.yaml`的文件并应用它：
```yaml
# vcjob-with-queue.yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: job-with-custom-queue
spec:
  minAvailable: 1
  schedulerName: volcano
  queue: development-queue # 将此作业分配给我们的自定义队列
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
### 步骤3：检查自定义队列的状态
您可以监控自定义队列的状态，以查看已分配多少资源：
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
