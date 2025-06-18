+++
title =  "Installation"


date = 2019-01-28
lastmod =2024-09-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Installation"
[menu.v1-12-0]
  parent = "getting-started"
  weight = 1
+++

The easiest way to get started with Volcano is to download the [release](https://github.com/volcano-sh/volcano/releases) package from GitHub and follow the following steps:

## Prerequisites

 - Kubernetes 1.12+ with CRD support.

## Installation Modes
 - Install with YAML files
 - Install from code
 - Install with Helm


### Install with YAML files

Install Volcano on an existing Kubernetes cluster. This way is both available for x86_64 and arm64 architecture.

```shell
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/master/installer/volcano-development.yaml
```

You can also replace `master` of above url with specific tag/branch (such as `release-1.10` branch for latest v1.10.x version, `v1.10.0` tag for v1.10.0 version) to install Volcano with specific version.


### Install from code

If you don't have a Kubernetes cluster, try one-click install from code base.This way is only available for x86_64 temporarily.

```
git clone https://github.com/volcano-sh/volcano.git

cd volcano

./hack/local-up-volcano.sh
```


### Install with Helm

This document guides how to install the latest version of volcano.

Use Helm charts to install Volcano with the following command.

```shell
helm repo add volcano-sh https://volcano-sh.github.io/helm-charts

helm repo update

helm install volcano volcano-sh/volcano -n volcano-system --create-namespace
```

The output is as follows after executing the above command.
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


## Verify status of Volcano components.

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

After the configuration is complete, you can use Volcano to deploy the AI/ML and big data workloads.
