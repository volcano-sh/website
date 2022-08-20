+++
title =  "安装"

date = 2019-01-28
lastmod = 2021-07-10

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "安装"
[menu.docs]
  parent = "getting-started"
  weight = 1

+++

上手 Volcano 最容易的方式是从 github 下载[release](https://github.com/volcano-sh/volcano/releases) ，然后按照以下步骤操作：

## 准备

- 一个 Kubernetes 集群，集群版本不低于 V1.13，支持CRD。



##  安装

- [通过 Deployment Yaml 安装](#通过-deployment-yaml-文件方式安装).
- [通过源代码安装](#通过源代码安装)
- [通过 Helm 方式安装](#使用-helm-安装).



### 通过 Deployment Yaml 安装

这种安装方式支持x86_64/arm64两种架构。在你的kubernetes集群上，执行如下的kubectl指令。

```
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/master/installer/volcano-development.yaml
```

你也可以将`master`替换为指定的标签或者分支（比如，`release-1.5`分支表示最新的v1.5.x版本，`v1.5.1`标签表示`v1.5.1`版本）以安装指定的Volcano版本。


### 通过源代码安装

如果你没有kubernetes集群，您可以选择在github下载volcano源代码压缩包，解压后运行volcano的安装脚本。这种安装方式暂时只支持x86_64平台。

```
# git clone https://github.com/volcano-sh/volcano.git
# tar -xvf volcano-{Version}-linux-gnu.tar.gz
# cd volcano-{Version}-linux-gnu

# ./hack/local-up-volcano.sh

```



### 通过 Helm 安装

 在您的集群中下载 Helm，您可以根据以下指南安装 Helm：[安装 Helm](https://helm.sh/docs/using_helm/#install-helm)。(仅当您使用helm 模式进行安装时需要)

如果您想使用 Helm 部署 Volcano，请先确认已经在您的集群中安装了[Helm](https://helm.sh/docs/intro/install)。


###### 步骤 1：

创建一个新的命名空间。

```shell
# kubectl create namespace volcano-system
namespace/volcano-system created

```

###### 步骤 2：

使用 Helm 进行安装。

```shell
# helm install helm/chart/volcano --namespace volcano-system --name volcano
NAME:   volcano
LAST DEPLOYED: Tue Jul 23 20:07:29 2019
NAMESPACE: volcano-system
STATUS: DEPLOYED

RESOURCES:
==> v1/ClusterRole
NAME                 AGE
volcano-admission    1s
volcano-controllers  1s
volcano-scheduler    1s

==> v1/ClusterRoleBinding
NAME                      AGE
volcano-admission-role    1s
volcano-controllers-role  1s
volcano-scheduler-role    1s

==> v1/ConfigMap
NAME                         DATA  AGE
volcano-scheduler-configmap  2     1s

==> v1/Deployment
NAME                 READY  UP-TO-DATE  AVAILABLE  AGE
volcano-admission    0/1    1           0          1s
volcano-controllers  0/1    1           0          1s
volcano-scheduler    0/1    1           0          1s

==> v1/Job
NAME                    COMPLETIONS  DURATION  AGE
volcano-admission-init  0/1          1s        1s

==> v1/Pod(related)
NAME                                  READY  STATUS             RESTARTS  AGE
volcano-admission-b45b7b76-84jmw      0/1    ContainerCreating  0         1s
volcano-admission-init-fw47j          0/1    ContainerCreating  0         1s
volcano-controllers-5f66f8d76c-27584  0/1    ContainerCreating  0         1s
volcano-scheduler-bb4467966-z642p     0/1    Pending            0         1s

==> v1/Service
NAME                       TYPE       CLUSTER-IP      EXTERNAL-IP  PORT(S)  AGE
volcano-admission-service  ClusterIP  10.107.128.208  <none>       443/TCP  1s

==> v1/ServiceAccount
NAME                 SECRETS  AGE
volcano-admission    1        1s
volcano-controllers  1        1s
volcano-scheduler    1        1s

==> v1beta1/CustomResourceDefinition
NAME                           AGE
podgroups.scheduling.sigs.dev  1s
queues.scheduling.sigs.dev     1s


NOTES:
Thank you for installing volcano.

Your release is named volcano.

For more information on volcano, visit:
https://volcano.sh/


```

 

## 验证 Volcano 组件的状态

```shell
# kubectl get all -n volcano-system
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
