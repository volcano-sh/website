---
title: "Volcano Job"
sidebar_position: 3
---

## 简介
VolcanoJob，简称 vcjob，是 Volcano 的一个 CRD 对象。与 Kubernetes Job 不同，它提供了更多高级功能，如指定调度器、最小成员数、任务定义、生命周期管理、特定队列和特定优先级。VolcanoJob 非常适合机器学习、大数据应用和科学计算等高性能计算场景。

## 示例
```shell
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: test-job
spec:
  minAvailable: 3
  schedulerName: volcano
  priorityClassName: high-priority
  policies:
    - event: PodEvicted
      action: RestartJob
  plugins:
    ssh: []
    env: []
    svc: []
  maxRetry: 5
  queue: default
  volumes:
    - mountPath: "/myinput"
    - mountPath: "/myoutput"
      volumeClaimName: "testvolumeclaimname"
      volumeClaim:
        accessModes: [ "ReadWriteOnce" ]
        storageClassName: "my-storage-class"
        resources:
          requests:
            storage: 1Gi
  tasks:
    - replicas: 6
      name: "default-nginx"
      template:
        metadata:
          name: web
        spec:
          containers:
            - image: nginx
              imagePullPolicy: IfNotPresent
              name: nginx
              resources:
                requests:
                  cpu: "1"
          restartPolicy: OnFailure
```
## 关键字段
### schedulerName
`schedulerName` 指定调度该作业的调度器。目前，该值可以是 `volcano` 或 `default-scheduler`，默认选中 `volcano`。

### minAvailable
`minAvailable` 表示运行该作业所需的最小运行 Pod 数量。只有当运行的 Pod 数量不小于 `minAvailable` 时，作业才被视为 `running`。

### volumes
`volumes` 表示作业挂载的卷配置。它遵循 Kubernetes 中的卷配置要求。

### tasks.replicas
`tasks.replicas` 表示任务中的 Pod 副本数量。

### tasks.template
`tasks.template` 定义任务的 Pod 配置。它与 Kubernetes 中的 Pod 模板相同。

### tasks.policies
`tasks.policies` 定义任务的生命周期策略。

### policies
`policies` 定义当 `tasks.policies` 未设置时，所有任务的默认生命周期策略。
  
### plugins
`plugins` 表示 Volcano 调度作业时使用的插件。

### queue
`queue` 表示作业所属的队列。

### priorityClassName
`priorityClassName` 表示作业的优先级。用于抢占式调度。

### maxRetry
`maxRetry` 表示作业允许的最大重试次数。

## 状态 (Status)
### pending
`pending` 表示作业正在等待被调度。

### aborting
`aborting` 表示由于某些外部因素，作业正在中止。

### aborted
`aborted` 表示由于某些外部因素，作业已中止。

### running
`running` 表示至少有 `minAvailable` 个 Pod 正在运行。

### restarting
`restarting` 表示作业正在重启。

### completing
`completing` 表示至少有 `minAvailable` 个 Pod 处于 `completing` 状态。作业正在进行清理。

### completed
`completed` 表示至少有 `minAvailable` 个 Pod 处于 `completed` 状态。作业已完成清理。

### terminating
`terminating` 表示由于某些内部因素，作业正在终止。作业正在等待 Pod 释放资源。

### terminated
`terminated` 表示由于某些内部因素，作业已终止。

### failed
`failed` 表示作业在经过 `maxRetry` 次尝试后仍然无法启动。

## 用法
### TensorFlow 工作负载
创建一个包含 1 个 ps 和 3 个 worker 的 TensorFlow 工作负载。
```shell
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-dist-mnist
spec:
  minAvailable: 3   // 至少需要 3 个可用 Pod
  schedulerName: volcano    // 指定调度器
  plugins:
    env: []
    svc: []
  policies: 
    - event: PodEvicted // 当 Pod 被驱逐时重启作业
      action: RestartJob
  tasks:
    - replicas: 1   // 指定 1 个 ps Pod
      name: ps
      template: // ps Pod 的定义
        spec:
          containers:
            - command:
                - sh
                - -c
                - |
                  PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' | sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  WORKER_HOST=`cat /etc/volcano/worker.host | sed 's/$/&:2222/g' | sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  export TF_CONFIG={\"cluster\":{\"ps\":[${PS_HOST}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"ps\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};
                  python /var/tf_dist_mnist/dist_mnist.py
              image: volcanosh/dist-mnist-tf-example:0.0.1
              name: tensorflow
              ports:
                - containerPort: 2222
                  name: tfjob-port
              resources: {}
          restartPolicy: Never
    - replicas: 2   // 指定 2 个 worker Pod
      name: worker
      policies:
        - event: TaskCompleted  // 当两个 worker Pod 完成任务时，作业被标记为完成
          action: CompleteJob
      template: // worker Pod 的定义
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
### Argo 工作负载
创建一个包含两个 Pod 副本的 Argo 工作负载。当至少有一个 Pod 副本正常工作时，工作负载被认为是正常的。
```shell
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: volcano-step-job-
spec:
  entrypoint: volcano-step-job
  serviceAccountName: argo
  templates:
  - name: volcano-step-job
    steps:
    - - name: hello-1
        template: hello-tmpl
        arguments:
          parameters: [{name: message, value: hello1}, {name: task, value: hello1}]
    - - name: hello-2a
        template: hello-tmpl
        arguments:
          parameters: [{name: message, value: hello2a}, {name: task, value: hello2a}]
      - name: hello-2b
        template: hello-tmpl
        arguments:
          parameters: [{name: message, value: hello2b}, {name: task, value: hello2b}]
  - name: hello-tmpl
    inputs:
      parameters:
      - name: message
      - name: task
    resource:
      action: create
      successCondition: status.state.phase = Completed
      failureCondition: status.state.phase = Failed
      manifest: |           // VolcanoJob 的定义
        apiVersion: batch.volcano.sh/v1alpha1
        kind: Job
        metadata:
          generateName: step-job-{{inputs.parameters.task}}-
          ownerReferences:
          - apiVersion: argoproj.io/v1alpha1
            blockOwnerDeletion: true
            kind: Workflow
            name: "{{workflow.name}}"
            uid: "{{workflow.uid}}"
        spec:
          minAvailable: 1
          schedulerName: volcano
          policies:
          - event: PodEvicted
            action: RestartJob
          plugins:
            ssh: []
            env: []
            svc: []
          maxRetry: 1
          queue: default
          tasks:
          - replicas: 2
            name: "default-hello"
            template:
              metadata:
                name: helloworld
              spec:
                containers:
                - image: docker/whalesay
                  imagePullPolicy: IfNotPresent
                  command: [cowsay]
                  args: ["{{inputs.parameters.message}}"]
                  name: hello
                  resources:
                    requests:
                      cpu: "100m"
                restartPolicy: OnFailure
```  
### MindSpore 工作负载
创建一个包含 8 个 Pod 副本的 MindSpore 工作负载。当至少有一个 Pod 副本正常工作时，工作负载被认为是正常的。
```shell
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: mindspore-cpu
spec:
  minAvailable: 1
  schedulerName: volcano
  policies:
    - event: PodEvicted
      action: RestartJob
  plugins:
    ssh: []
    env: []
    svc: []
  maxRetry: 5
  queue: default
  tasks:
    - replicas: 8
      name: "pod"
      template:
        spec:
          containers:
            - command: ["/bin/bash", "-c", "python /tmp/lenet.py"]
              image: lyd911/mindspore-cpu-example:0.2.0
              imagePullPolicy: IfNotPresent
              name: mindspore-cpu-job
              resources:
                limits:
                  cpu: "1"
                requests:
                  cpu: "1"
          restartPolicy: OnFailure

```
## 注意
### 支持的框架
Volcano 支持几乎所有与其兼容的主流计算框架，包括：

1. [Spark](https://spark.apache.org/)
2. [TensorFlow](https://www.tensorflow.org/)
3. [PyTorch](https://pytorch.org/)
4. [Flink](https://flink.apache.org/)
5. [Argo](https://argoproj.github.io/)
6. [MindSpore](https://www.mindspore.cn/en)
7. [PaddlePaddle](https://www.paddlepaddle.org.cn/)
8. [Open MPI](https://www.open-mpi.org/)
9. [Horovod](https://horovod.readthedocs.io/)
10. [MXNet](https://mxnet.apache.org/)
11. [Kubeflow](https://www.kubeflow.org/)
12. [KubeGene](https://github.com/volcano-sh/kubegene)
13. [Cromwell](https://cromwell.readthedocs.io/)

### volcano 或 default-scheduler
与 default-scheduler 相比，Volcano 在批量计算方面进行了增强。它非常适合机器学习、大数据应用和科学计算等高性能计算场景。
