#### 简介
Volcano是基于Kubernetes的云原生批量计算引擎，主要由crdControllers、scheduler、webhooks和client组成。crdControllers是自定义资源的生命
周期管理组件，如queue、podgroup和vcjob等。scheduler是volcano的自定义调度器，在批处理方面做了升级。webhooks是APIServer的admission，主要
用于对自定义资源进行api层面的校验。client是volcano的客户端，目前支持CLI和RestAPI
```
volcano
|-- crdControllers
    |-- queueController
    |-- podgroupController
    |-- jobController
|-- scheduler
    |-- actions
        |-- allocate
        |-- backfill
        |-- enqueue
        |-- preempt
        |-- reclaim
    |-- plugins
        |-- binpack
        |-- conformance
        |-- drf
        |-- gang
        |-- nodeorder
        |-- predicates
        |-- priority
        |-- prorortion
|-- webhooks
    |-- admission
        |-- queue
        |-- pod
        |-- job
|-- client
    |-- RestAPI
    |-- CLI
```
#### 安装
volcano当前支持x86_64和arm_64架构，安装方式包括从YAML文件安装和从code安装两种方式。其中，若本地已有kubernetes集群，建议使用以YAML文件方式安
装；若本地没有Kubernetes集群，建议使用以code方式安装
##### 以YAML文件方式安装
该安装方式支持x86_64和arm_64架构
* 环境准备
1. Kubernetes 1.12+，并且支持CRD(可考虑使用minikube等方式搭建)
2. Docker 1.13+
3. Kubectl(适配本地Kubernetes版本)
* 安装步骤
```
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/master/installer/volcano-development.yaml
```
##### 以code方式安装
该安装方式仅支持x86_64架构
* 环境准备
1. Docker 1.13+
2. Git
3. Golang 1.14+并已完成配置，已开启GO111MODULE=on
* 安装步骤
```
1. 进入$GOPATH/src目录下，创建volcano.sh目录，并进入该目录
[root@ECS src]# mkdir volcano.sh && cd volcano.sh

2. 在volcano.sh目录下克隆volcano源码
[root@ECS src]# git clone https://github.com/volcano-sh/volcano.git

3. 进入volcano项目目录，执行一键安装脚本
[root@ECS src]# cd volcano && bash hack/local-up-volcano.sh
```
##### 环境检查
```
1. volcano-system namespace创建成功
[root@ECS ~]# kubectl get ns | grep volcano-system
volcano-system         Active   1m

2. volcano-scheduler-configmap configmap创建成功
[root@ECS ~]# kubectl get configmap -n volcano-system
NAME                          DATA   AGE
volcano-scheduler-configmap   1      1m

3. volcano各组件处于running状态
[root@ECS ~]# kubectl get deployment -n volcano-system
NAME                  READY   UP-TO-DATE   AVAILABLE   AGE
volcano-admission     1/1     1            1           1m
volcano-controllers   1/1     1            1           1m
volcano-scheduler     1/1     1            1           1m
```
#### 使用
* 创建自定义queue
```
[root@ECS volcano]# kubectl create -f queue.yaml
// queue.yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: test
spec:
  weight: 1
  reclaimable: false
  capability:
    cpu: 2
```
* 创建自定义vcjob
```
[root@ECS volcano]# kubectl create -f vcjob.yaml
// vcjob.yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: job-1
spec:
  minAvailable: 1
  schedulerName: volcano
  queue: test
  policies:
    - event: PodEvicted
      action: RestartJob
  tasks:
    - replicas: 1
      name: nginx
      policies:
      - event: TaskCompleted
        action: CompleteJob
      template:
        spec:
          containers:
            - command:
              - sleep
              - 10m
              image: nginx:latest
              name: nginx
              resources:
                requests:
                  cpu: 1
                limits:
                  cpu: 1
```
* 查看vcjob状态
```
[root@ECS volcano]# kubectl get vcjob job-1 -oyaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  creationTimestamp: "2020-01-18T12:59:37Z"
  generation: 1
  managedFields:
  - apiVersion: batch.volcano.sh/v1alpha1
    fieldsType: FieldsV1
    fieldsV1:
      f:spec:
        .: {}
        f:minAvailable: {}
        f:policies: {}
        f:queue: {}
        f:schedulerName: {}
    manager: kubectl
    operation: Update
    time: "2020-08-18T12:59:37Z"
  - apiVersion: batch.volcano.sh/v1alpha1
    fieldsType: FieldsV1
    fieldsV1:
      f:spec:
        f:tasks: {}
      f:status:
        .: {}
        f:minAvailable: {}
        f:running: {}
        f:state:
          .: {}
          f:lastTransitionTime: {}
          f:phase: {}
    manager: vc-controller-manager
    operation: Update
    time: "2020-08-18T12:59:45Z"
  name: job-1
  namespace: default
  resourceVersion: "850500"
  selfLink: /apis/batch.volcano.sh/v1alpha1/namespaces/default/jobs/job-1
  uid: 215409ec-7337-4abf-8bea-e6419defd688
spec:
  minAvailable: 1
  policies:
  - action: RestartJob
    event: PodEvicted
  queue: test
  schedulerName: volcano
  tasks:
  - name: nginx
    policies:
    - action: CompleteJob
      event: TaskCompleted
    replicas: 1
    template:
      spec:
        containers:
        - command:
          - sleep
          - 10m
          image: nginx:latest
          name: nginx
          resources:
            limits:
              cpu: 1
            requests:
              cpu: 1
status:
  minAvailable: 1
  running: 1
  state:
    lastTransitionTime: "2020-08-18T12:59:45Z"
    phase: Running
```
* 查看podgroup状态
```
[root@ECS volcano]# kubectl get podgroup job-1 -oyaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: PodGroup
metadata:
  creationTimestamp: "2020-08-18T12:59:37Z"
  generation: 5
  managedFields:
  - apiVersion: scheduling.volcano.sh/v1beta1
    fieldsType: FieldsV1
    fieldsV1:
      f:metadata:
        f:ownerReferences:
          .: {}
          k:{"uid":"215409ec-7337-4abf-8bea-e6419defd688"}:
            .: {}
            f:apiVersion: {}
            f:blockOwnerDeletion: {}
            f:controller: {}
            f:kind: {}
            f:name: {}
            f:uid: {}
      f:spec:
        .: {}
        f:minMember: {}
        f:minResources:
          .: {}
          f:cpu: {}
        f:queue: {}
      f:status: {}
    manager: vc-controller-manager
    operation: Update
    time: "2020-08-18T12:59:37Z"
  - apiVersion: scheduling.volcano.sh/v1beta1
    fieldsType: FieldsV1
    fieldsV1:
      f:status:
        f:conditions: {}
        f:phase: {}
        f:running: {}
    manager: vc-scheduler
    operation: Update
    time: "2020-08-18T12:59:45Z"
  name: job-1
  namespace: default
  ownerReferences:
  - apiVersion: batch.volcano.sh/v1alpha1
    blockOwnerDeletion: true
    controller: true
    kind: Job
    name: job-1
    uid: 215409ec-7337-4abf-8bea-e6419defd688
  resourceVersion: "850501"
  selfLink: /apis/scheduling.volcano.sh/v1beta1/namespaces/default/podgroups/job-1
  uid: ea5b4f87-b750-440b-a41a-5c9944a7ae43
spec:
  minMember: 1
  minResources:
    cpu: "1"
  queue: test
status:
  conditions:
  - lastTransitionTime: "2020-08-18T12:59:38Z"
    message: '1/0 tasks in gang unschedulable: pod group is not ready, 1 minAvailable.'
    reason: NotEnoughResources
    status: "True"
    transitionID: 606145d1-660f-4e01-850d-ed556cebc098
    type: Unschedulable
  - lastTransitionTime: "2020-08-18T12:59:45Z"
    reason: tasks in gang are ready to be scheduled
    status: "True"
    transitionID: 57e6ba9e-55cc-47ce-a37e-d8bddd99d54b
    type: Scheduled
  phase: Running
  running: 1
```
* 查看queue状态
```
[root@ECS volcano]# kubectl get queue test -oyaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  creationTimestamp: "2020-08-18T12:59:30Z"
  generation: 1
  managedFields:
  - apiVersion: scheduling.volcano.sh/v1beta1
    fieldsType: FieldsV1
    fieldsV1:
      f:spec:
        .: {}
        f:capability: {}
        f:reclaimable: {}
        f:weight: {}
    manager: kubectl
    operation: Update
    time: "2020-08-18T12:59:30Z"
  - apiVersion: scheduling.volcano.sh/v1beta1
    fieldsType: FieldsV1
    fieldsV1:
      f:spec:
        f:capability:
          f:cpu: {}
      f:status:
        .: {}
        f:running: {}
        f:state: {}
    manager: vc-controller-manager
    operation: Update
    time: "2020-08-18T12:59:39Z"
  name: test
  resourceVersion: "850474"
  selfLink: /apis/scheduling.volcano.sh/v1beta1/queues/test
  uid: b9c9ee54-5ef8-4784-9bec-7a665acb1fde
spec:
  capability:
    cpu: 2
  reclaimable: false
  weight: 1
status:
  running: 1
  state: Open
```
#### 说明事项
暂无