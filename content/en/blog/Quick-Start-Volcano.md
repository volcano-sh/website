+++
title =  "Quick Start Guide for Volcano"
description = "Bring up the Volcano in any K8s Cluster within few mins"
subtitle =""

date = 2019-03-28
lastmod = 2019-03-29 
datemonth = "Mar"
dateyear = "2019"
dateday = 28

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["Volcano"]
authors_img = "/img/icon_user.svg"

tags = ["Tutorials"]
summary = "Quick Start Guide for Volcano"

# Add menu entry to sidebar.
linktitle = "Quick Start Guide for Volcano"
[menu.posts]
  parent = "tutorials"
  weight = 1
+++
# Quick Start Guide
The easiest way to deploy Volcano is using Helm charts.
### Preparation
Clone the repository to a local path:
```
# mkdir -p $GOPATH/src/volcano.sh/
# cd $GOPATH/src/volcano.sh/
# git clone https://github.com/volcano-sh/volcano.git
```
### 1. Volcano Images
Official images are available on [DockerHub](https://hub.docker.com/u/volcanosh). You can also build local images by running the following command:
```
cd $GOPATH/src/volcano.sh/volcano
make images
## Verify your images.
# docker images
REPOSITORY                 TAG                 IMAGE ID            CREATED             SIZE
volcanosh/vk-admission     latest              a83338506638        8 seconds ago       41.4MB
volcanosh/vk-scheduler     latest              faa3c2a25ac3        9 seconds ago       49.6MB
volcanosh/vk-controllers   latest              7b11606ebfb8        10 seconds ago      44.2MB
```
**NOTE**: Ensure that the images are correctly loaded to your Kubernetes cluster. For example, if you are using [kind luster](https://github.com/kubernetes-sigs/kind), run the ```kind load docker-image <image-name>:<tag> ``` command for each image.
### 2. Helm Charts

Install Helm charts.
```
helm install installer/chart --namespace <namespace> --name <specified-name>
For eg :
helm install installer/chart --namespace volcano-trial --name volcano-trial
```

Run the following commands to verify the installation:
```
#1. Verify whether pods are running normally.

# kubectl get pods --namespace <namespace>
NAME                                                READY   STATUS    RESTARTS   AGE
<specified-name>-admission-84fd9b9dd8-9trxn          1/1     Running   0          43s
<specified-name>-controllers-75dcc8ff89-42v6r        1/1     Running   0          43s
<specified-name>-scheduler-b94cdb867-89pm2           1/1     Running   0          43s
<specified-name>--admission-init-qbtmb               0/1     Completed 0          43s

#2. Verify the Services.
# kubectl get services --namespace <namespace>
NAME                                     TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
<specified-name>-admission-service       ClusterIP   10.105.78.53   <none>        443/TCP   91s
```
#### Watch the following video to learn how to deploy Volcano:

<iframe title="video" width="560" height="315" src="https://www.youtube.com/embed/hsXXmWSUtyo" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
