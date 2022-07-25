+++
title =  "Volcano快速上手指南"
description = "在Kubernetes集群中快速上手Volcano"
subtitle =""

date = 2019-03-28
lastmod = 2020-09-07
datemonth = "Sep"
dateyear = "2020"
dateday = 07

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["Volcano"]

tags = ["Tutorials"]
summary = "Volcano快速上手指南"

# Add menu entry to sidebar.
linktitle = "Volcano快速上手指南"
[menu.posts]
  parent = "tutorials"
  weight = 1
+++
# 快速上手
上手Volcano最容易的方式是使用Helm。
### 准备
首先，将代码库克隆到本地。
```html
# mkdir -p $GOPATH/src/volcano.sh/
# cd $GOPATH/src/volcano.sh/
# git clone https://github.com/volcano-sh/volcano.git
```
### 1. Volcano镜像
可用的官方镜像请参考： [DockerHub](https://hub.docker.com/u/volcanosh), 您也可以在本地自己制作镜像：
```html
cd $GOPATH/src/volcano.sh/volcano
make images
## Verify your images
# docker images
REPOSITORY                 TAG                 IMAGE ID            CREATED             SIZE
volcanosh/vk-admission     latest              a83338506638        8 seconds ago       41.4MB
volcanosh/vk-scheduler     latest              faa3c2a25ac3        9 seconds ago       49.6MB
volcanosh/vk-controllers   latest              7b11606ebfb8        10 seconds ago      44.2MB
```
**请注意**: 您需要确保镜像被正确的加载到您的Kubernetes集群。举个例子，如果您使用的是[kind cluster](https://github.com/kubernetes-sigs/kind) ，
为每个镜像执行命令```kind load docker-image <image-name>:<tag> ```。
### 2. Helm charts

最后，安装helm chart
```shell
helm install installer/chart --namespace <namespace> --name <specified-name>
For eg :
helm install installer/chart --namespace volcano-trial --name volcano-trial
```

运行以下命令验证安装是否成功:
```shell
#1. 验证Pods是否正常运行

# kubectl get pods --namespace <namespace>
NAME                                                READY   STATUS    RESTARTS   AGE
<specified-name>-admission-84fd9b9dd8-9trxn          1/1     Running   0          43s
<specified-name>-controllers-75dcc8ff89-42v6r        1/1     Running   0          43s
<specified-name>-scheduler-b94cdb867-89pm2           1/1     Running   0          43s
<specified-name>--admission-init-qbtmb               0/1     Completed 0          43s

#2. 验证Services
# kubectl get services --namespace <namespace>
NAME                                     TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
<specified-name>-admission-service       ClusterIP   10.105.78.53   <none>        443/TCP   91s
```
#### 您也可以观察视频学习如何部署Volcano

<iframe title="video" width="560" height="315" src="https://www.youtube.com/embed/hsXXmWSUtyo" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
