+++
title =  "Kube-Batch新手教程"
description = "基于Kubernetes的调度器"
subtitle =""

date = 2019-01-28
lastmod = 2020-09-07
datemonth = "Sep"
dateyear = "2020"
dateday = 07

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["Volcano"]

tags = ["Tutorials"]
summary = "批量工作负载调度新手教程"

# Add menu entry to sidebar.
linktitle = "Kube-Batch新手教程"
[menu.posts]
  parent = "tutorials"
  weight = 2
+++
# Kube-Batch新手速成

本文档将展示如何将`kube-batch`作为基于Kubernetes的批量调度引擎运行起来。代码请参考[master](https://github.com/kubernetes-sigs/kube-batch/tree/master) 。

## 1. 前置条件

运行`kube-batch`之前，必须先启动一个Kubernetes集群。关于如何搭建集群请参考[使用kubeadm创建一个集群](https://kubernetes.io/docs/setup/independent/create-cluster-kubeadm/)。
另外，为了本地调试的目的，您可以使用Minikube，请参考[使用Minikube在本地运行Kubernetes](https://kubernetes.io/docs/getting-started-guides/minikube/)。
您还可以使用[kind](https://github.com/kubernetes-sigs/kind) 。 它是一个将Docker容器作为节点并运行本地Kubernetes集群的工具。

接下来将展示怎样快速将`kube-batch`作为Kubernetes调度器运行起来。请参考[配置多调度器](https://kubernetes.io/docs/tasks/administer-cluster/configure-multiple-schedulers/) 获取更多细节。

## 2. 为Kubernetes配置kube-batch

### (1) kube-batch镜像

kube-batch提供了官方镜像，您可以通过[DockerHub](https://hub.docker.com/r/kubesigs/kube-batch/) 下载。当前版本为`v0.4`。

```html
# docker pull kubesigs/kube-batch:v0.4
```

### (2) 为kube-batch创建一个Kubernetes Deployment

#### 下载kube-batch

```html
# mkdir -p $GOPATH/src/github.com/kubernetes-sigs/
# cd $GOPATH/src/github.com/kubernetes-sigs/
# git clone https://github.com/kubernetes-sigs/kube-batch
```

#### 使用Helm部署`kube-batch`

将`kube-batch`作为Kubernetes调度器运行起来

```html
# helm install $GOPATH/src/github.com/kubernetes-sigs/kube-batch/deployment/kube-batch --namespace kube-system
```

验证版本

```html
# helm list
NAME        	REVISION	UPDATED                 	STATUS  	CHART                	NAMESPACE
dozing-otter	1       	Thu Jun 14 18:52:15 2018	DEPLOYED	kube-batch-0.4.0    	kube-system
```

请注意：`kube-batch`需要收集集群信息（如Pod、Node、CRD等），所以用于该deployment的serviceaccount必须有权限访问这些集群资源，否则`kube-batch`
将无法启动。对于不太了解Kubernetes RBAC的用户，请将example/role.yaml拷贝到`$GOPATH/src/github.com/kubernetes-sigs/kube-batch/deployment/kube-batch/templates/`
并重装。

### (3) 创建Job

创建一个名为`job-01.yaml`的文件，内容如下：

```html
apiVersion: batch/v1
kind: Job
metadata:
  name: qj-1
spec:
  backoffLimit: 6
  completions: 6
  parallelism: 6
  template:
    metadata:
      annotations:
        scheduling.k8s.io/group-name: qj-1
    spec:
      containers:
      - image: busybox
        imagePullPolicy: IfNotPresent
        name: busybox
        resources:
          requests:
            cpu: "1"
      restartPolicy: Never
      schedulerName: kube-batch
---
apiVersion: scheduling.incubator.k8s.io/v1alpha1
kind: PodGroup
metadata:
  name: qj-1
spec:
  minMember: 6
```

yaml文件表示一个名为`qj-01`的Job将创建6个pod（由`parallelism`指定），这些pod将由调度器`kube-batch`调度（由`schedulerName`指定）。`kube-batch`
将监视`PodGroup`和名为`scheduling.k8s.io/group name`的annotation，该annotation标识pod属于哪个组。`kube-batch`将为Job同时启动数量为
`.spec.minMember`的Pod；否则，在诸如资源不足等情况下，`kube-batch`将不会为该Job启动任何pod。

创建该Job

```html
# kubectl create -f job-01.yaml
```

检查Job状态

```html
# kubectl get jobs
NAME      DESIRED   SUCCESSFUL   AGE
qj-1      6         6            2h
```

检查pods状态

```html
# kubectl get pod --all-namespaces
```


## 4. 为Pod创建PriorityClass

`kube-batch`将根据优先级启动同一个QueueJob中的Pod。高优先级的Pod会先被启动。下面是个展示`PriorityClass`用法的例子：

创建一个名为`priority_1000.yaml`的文件，内容如下：

```html
apiVersion: scheduling.k8s.io/v1beta1
kind: PriorityClass
metadata:
  name: high-priority
  namespace: batch-ns01
value: 1000
```

创建PriorityClass，优先级值设为1000.

```
# kubectl create -f priority_1000.yaml
```

创建一个Pod配置文件（假设名为`pod-config-ns01-r01.yaml`）：

```html
apiVersion: v1
kind: Pod
metadata:
  name: pod-ns01-r01
spec:
  containers:
    - name: key-value-store
      image: redis
      resources:
        limits:
          memory: "1Gi"
          cpu: "1"
        requests:
          memory: "1Gi"
          cpu: "1"
      ports:
        - containerPort: 6379
  priorityClassName: high-priority
```

创建该Pod，优先级设置为1000。

```
# kubectl create -f pod-config-ns01-r01.yaml
```


请注意:

* `PriorityClass` 仅在kubernetes 1.9+中支持.
* 在同一个Deployment/RS/Job中的Pod共享该Pod模板，因此它们有同样的`PriorityClass`。为了给同一个QueueJob中的Pod设置不同的`PriorityClass`，
用户需要自己创建控制器。
