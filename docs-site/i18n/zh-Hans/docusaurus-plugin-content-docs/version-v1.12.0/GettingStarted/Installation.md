---
title: "安装"
---

开始使用 Volcano 最简单的方法是从 GitHub 下载 [release](https://github.com/volcano-sh/volcano/releases) 包并按照以下步骤操作：

## 前置条件

 - Kubernetes 1.12+ 并支持 CRD。

## 安装方式
 - 使用 YAML 文件安装
 - 源码安装
 - 使用 Helm 安装


### 使用 YAML 文件安装

在现有的 Kubernetes 集群上安装 Volcano。这种方式同时支持 x86_64 和 arm64 架构。

```shell
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/master/installer/volcano-development.yaml
```

您也可以将上述 url 中的 `master` 替换为特定的 tag/branch（例如 `release-1.10` 分支对应最新的 v1.10.x 版本，`v1.10.0` tag 对应 v1.10.0 版本）来安装特定版本的 Volcano。


### 源码安装

如果您没有 Kubernetes 集群，可以尝试从代码库一键安装。这种方式暂时仅支持 x86_64。

```
git clone https://github.com/volcano-sh/volcano.git

cd volcano

./hack/local-up-volcano.sh
```


### 使用 Helm 安装

本文档指导如何安装最新版本的 Volcano。

使用 Helm charts 通过以下命令安装 Volcano。

```shell
helm repo add volcano-sh https://volcano-sh.github.io/helm-charts

helm repo update

helm install volcano volcano-sh/volcano -n volcano-system --create-namespace
```

执行上述命令后的输出如下：
```
NAME: volcano
LAST DEPLOYED: Tue Sep 29 10:18:44 2024
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


## 验证 Volcano 组件状态

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

配置完成后，您可以使用 Volcano 部署 AI/ML 和大数据工作负载。