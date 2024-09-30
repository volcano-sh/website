+++
title = "VolcanoJob"

date = 2024-09-29
lastmod = 2024-09-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "VolcanoJob"
[menu.v1-10-0]
  parent = "concepts"
  weight = 3
+++

### 定义
Volcano Job，简称vcjob，是Volcano自定义的Job资源类型。区别于Kubernetes Job，vcjob提供了更多高级功能，如可指定调度器、支持最小运行pod数、
支持task、支持生命周期管理、支持指定队列、支持优先级调度等。Volcano Job更加适用于机器学习、大数据、科学计算等高性能计算场景。
### 样例
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
### 关键字段
* schedulerName

schedulerName表示该job的pod所使用的调度器，默认值为volcano，也可指定为default-scheduler。它也是tasks.template.spec.schedulerName的默认值。

* minAvailable

minAvailable表示运行该job所要运行的**最少**pod数量。只有当job中处于running状态的pod数量不小于minAvailable时，才认为该job运行正常。

* volumes

volumes表示该job的挂卷配置。volumes配置遵从kubernetes volumes配置要求。

* tasks.replicas

tasks.replicas表示某个task pod的副本数。

* tasks.template

tasks.template表示某个task pod的具体配置定义。

* tasks.policies

tasks.policies表示某个task的生命周期策略。

* policies

policies表示job中所有task的默认生命周期策略，在tasks.policies不配置时使用该策略。

* plugins

plugins表示该job在调度过程中使用的插件。

* queue

queue表示该job所属的队列。

* priorityClassName

priorityClassName表示该job优先级，在抢占调度和优先级排序中生效。

* maxRetry

maxRetry表示当该job可以进行的最大重启次数。

#### 资源状态
* pending

pending表示job还在等待调度中，处于排队的状态。

* aborting

aborting表示job因为某种外界原因正处于中止状态，即将进入aborted状态。

* aborted

aborted表示job因为某种外界原因已处于中止状态。

* running

running表示job中至少有minAvailable个pod正在运行状态。

* restarting

restarting表示job正处于重启状态，正在中止当前的job实例并重新创建新的实例。

* completing

completing表示job中至少有minAvailable个数的task已经完成，该job正在进行最后的清理工作。

* completed

completing表示job中至少有minAvailable个数的task已经完成，该job已经完成了最后的清理工作。

* terminating

terminating表示job因为某种内部原因正处于终止状态，正在等到pod或task释放资源。

* terminated

terminated表示job因为某种内部原因已经处于终止状态，job没有达到预期就结束了。

* failed

failed表示job经过了maxRetry次重启，依然没有正常启动。

#### 使用场景
* TensorFlow workload

以tensorflow为例，创建一个具有1个ps和2个worker的工作负载。
```shell
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-dist-mnist
spec:
  minAvailable: 3   // 该job的3个pod必须都可用
  schedulerName: volcano    // 指定volcano为调度器
  plugins:
    env: []
    svc: []
  policies:
    - event: PodEvicted // 当pod被驱逐时，重启该job
      action: RestartJob
  tasks:
    - replicas: 1   // 指定1个ps pod
      name: ps
      template: // ps pod的具体定义
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
    - replicas: 2   // 指定2个worker pod
      name: worker
      policies:
        - event: TaskCompleted  // 2个worker完成任务时认为该job完成任务
          action: CompleteJob
      template: // worker pod的具体定义
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

* argo workload

以argo为例，创建一个具有2个pod副本的工作负载，要求1个可用即可。
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
      manifest: |           // Volcano Job的具体定义
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
* MindSpore

以MindSpore为例，创建一个具有8个pod副本的工作负载，要求1个可用即可。
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
### 说明事项
#### Volcano支持的计算框架

Volcano对当前主流的计算框架均能很好的支持，具体如下：

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

#### volcano和default-scheduler的选择

与default-scheduler相比，volcano在批处理方面进行了增强。它更适用于高性能计算场景，如机器学习、大数据应用和科学计算。