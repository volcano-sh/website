+++
title =  "argo workflow on volcano"

date = 2021-04-07
lastmod = 2021-04-07

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "argo"
[menu.docs]
  parent = "zoology"
  weight = 9

+++



### Argo workflow简介

Argo Workflows是一个开源的容器本地工作流引擎，用于在kubernetes上协调运行作业。Argo Workflows是基于kubernetes CRD实现的。

其主要支持的功能有：

- 定义工作流，其中工作流中的每一个步骤都是一个容器。
- 将多个步骤工作流建模成一系列的任务，或者使用有向无环图（DAG）捕获任务间的依赖关系。
- 使用kubernetes上的Argo Workflows可以在短时间内轻松操作大量计算密集型作业。
- 不需要配置复杂的软件开发产品就可以在kubernetes本地环境中运行CI/CD。

### Argo的部署安装

1.下载instal.yaml。

```
# curl -OL https://raw.githubusercontent.com/argoproj/argo-workflows/stable/manifests/quick-start-postgres.yaml
```

2.部署安装

创建名称空间，进入install.yaml所在目录进行部署。

```
# kubectl create ns argo
//在安装yaml文件的目录下，执行
# kubectl apply -n argo -f .
```

3.查看对应pod，会生成如下4个pod。

```
# kubectl get po -n argo
NAME                                   READY   STATUS      RESTARTS   AGE
argo-server-574ddc66b-62rjc            1/1     Running     4          4h25m
minio                                  1/1     Running     0          4h25m
postgres-56fd897cf4-k8fwd              1/1     Running     0          4h25m
workflow-controller-77658c77cc-p25ll   1/1     Running     4          4h25m
```

其中argo-server是argo服务端，mino是进行制品仓库，postgres是数据库，workflow-controller是流程控制器。

### Argo workflow on volcano

1.资源权限配置[2]

```
# kubectl edit role argo-role -n argo
进入编辑模式，在最后加入如下配置，保存并退出。
- apiGroups:
  - batch.volcano.sh
  resources:
  - "*"
  verbs:
  - "*"
```



2.部署Argo workflow负载。

```
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
      manifest: |
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

3.查询pod运行情况。

```
#kubectl get po -n argo
step-job-hello1-k6m9r-default-hello-0    0/1     Completed   0          2d16h
step-job-hello1-k6m9r-default-hello-1    0/1     Completed   0          2d16h
step-job-hello2a-cxmfw-default-hello-0   0/1     Completed   0          2d16h
step-job-hello2a-cxmfw-default-hello-1   0/1     Completed   0          2d16h
step-job-hello2b-28tfl-default-hello-0   0/1     Completed   0          2d16h
step-job-hello2b-28tfl-default-hello-1   0/1     Completed   0          2d16h
volcano-step-job-9lw4x-4266206267        0/1     Completed   0          2d16h
volcano-step-job-9lw4x-834989871         0/1     Completed   0          2d16h
volcano-step-job-9lw4x-851767490         0/1     Completed   0          2d16h
```

4.体验更多argo workflow功能特性可以参考argo workflow官方给出的一系列样例[3]。



[1][Argo 官方样例介绍](https://github.com/argoproj/argo-workflows/tree/master/examples#argo-cli)

[2][argo权限配置官方文档](https://github.com/volcano-sh/volcano/tree/master/example/integrations/argo)

[3][argo workflow example](https://github.com/argoproj/argo-workflows/tree/master/examples#argo-cli)
