+++
title =  "安装"

date = 2019-01-28
lastmod = 2024-05-21

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "安装"
[menu.v1-11-0]
  parent = "getting-started"
  weight = 1

+++

本文档指导如何安装最新版本volcano。

## 准备

- 一个 Kubernetes 集群，集群版本不低于 V1.13，支持CRD。



##  安装

- [通过 Deployment Yaml 安装](#通过-deployment-yaml-安装).
- [通过源代码安装](#通过源代码安装)
- [通过 Helm 方式安装](#通过-helm-安装).


### 通过 Deployment Yaml 安装

这种安装方式支持x86_64/arm64两种架构。在你的kubernetes集群上，执行如下的kubectl指令。

```shell
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/master/installer/volcano-development.yaml
```

你也可以将`master`替换为指定的标签或者分支（比如，`release-1.9`分支表示最新的v1..x版本，`v1.9.0`标签表示`v1.9.0`版本）以安装指定的Volcano版本。

### 通过源代码安装

如果你没有kubernetes集群，您可以选择在github下载volcano源代码，然后运行volcano的安装脚本。这种安装方式暂时只支持x86_64平台。

```shell
git clone https://github.com/volcano-sh/volcano.git

cd volcano

./hack/local-up-volcano.sh
```


### 通过 Helm 安装

在您的集群中下载 Helm，您可以根据以下指南安装 Helm：[安装 Helm](https://helm.sh/docs/using_helm/#install-helm)。(仅当您使用helm 模式进行安装时需要)

如果您想使用 Helm 部署 Volcano，请先确认已经在您的集群中安装了[Helm](https://helm.sh/docs/intro/install)。


执行如下命令使用 Helm 进行安装。

```shell
helm repo add volcano-sh https://volcano-sh.github.io/helm-charts

helm repo update

helm install volcano volcano-sh/volcano -n volcano-system --create-namespace
```

执行以上命令后有如下输出。
```
NAME: volcano
LAST DEPLOYED: Tue Jan 16 17:30:34 2024
NAMESPACE: volcano-system
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
Thank you for installing volcano.

Your release is named volcano.

For more information on volcano, visit:
https://volcano.sh/
```
 

## 验证 Volcano 组件的状态

```shell
kubectl get all -n volcano-system
NAME                                       READY   STATUS      RESTARTS   AGE
pod/volcano-admission-5bd5756f79-p89tx     1/1     Running     0          6m10s
pod/volcano-admission-init-d4dns           0/1     Completed   0          6m10s
pod/volcano-controllers-687948d9c8-bd28m   1/1     Running     0          6m10s
pod/volcano-scheduler-94998fc64-9df5g      1/1     Running     0          6m10s


NAME                                TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
service/volcano-admission-service   ClusterIP   10.96.140.22   <none>        443/TCP   6m10s


NAME                                  READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/volcano-admission     1/1     1            1           6m10s
deployment.apps/volcano-controllers   1/1     1            1           6m10s
deployment.apps/volcano-scheduler     1/1     1            1           6m10s

NAME                                             DESIRED   CURRENT   READY   AGE
replicaset.apps/volcano-admission-5bd5756f79     1         1         1       6m10s
replicaset.apps/volcano-controllers-687948d9c8   1         1         1       6m10s
replicaset.apps/volcano-scheduler-94998fc64      1         1         1       6m10s



NAME                               COMPLETIONS   DURATION   AGE
job.batch/volcano-admission-init   1/1           28s        6m10s

```

一切配置就绪，您可以开始使用 Volcano 部署 AI/ML 和大数据负载了。现在您已经完成了 Volcano 的全部安装，您可以运行如下的例子测试安装的正确性：[样例](https://github.com/volcano-sh/volcano/tree/master/example)
