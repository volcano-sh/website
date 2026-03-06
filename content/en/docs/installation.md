+++
title =  "Installation"


date = 2019-01-28
lastmod =2024-09-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Installation"
[menu.docs]
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


## Resource Requirements

The resources requested for Volcano pods can be customized as follows:

```yaml
# container resources
resources:
  requests:
    cpu: 500m
    memory: 500Mi
  limits:
    cpu: 2
    memory: 2Gi
```

The resource quotas of the volcano-admission component are related to the cluster scale. For details, see Table 1.

Table 1 Recommended requested resources and resource limits for volcano-admission

| Cluster Scale      | CPU Request (m) | CPU Limit (m) | Memory Request (Mi) | Memory Limit (Mi) |
| ------------------ | --------------- | ------------- | ------------------- | ----------------- |
| 50 nodes           | 200             | 500           | 500                 | 500               |
| 200 nodes          | 500             | 1000          | 1000                | 2000              |
| 1000 or more nodes | 1500            | 2500          | 3000                | 4000              |

The resource quotas of volcano-controller and volcano-scheduler are related to the number of cluster nodes and pods. The recommended values are as follows:

- If the number of nodes is less than 100, retain the default configuration. The requested CPUs are 500m, and the limit is 2000m. The requested memory is 500Mi, and the limit is 2000 Mi.
- If the number of nodes is greater than 100, increase the requested CPUs by 500m and the requested memory by 1000 MiB each time 100 nodes (10,000 pods) are added. Increase the CPU limit by 1500m relative to the CPU request, and increase the memory limit by 1000Mi relative to the memory request.

Recommended formula for calculating the requested value:

- Requested CPUs: Calculate the number of target nodes multiplied by the number of target pods, perform interpolation search based on the number of nodes in the cluster multiplied by the number of target pods in Table 2, and round up the request value and limit value that are closest to the specifications.

  For example, for 2000 nodes and 20,000 pods, Number of target nodes x Number of target pods = 40 million, which is close to the specification of 700/70,000 (Number of cluster nodes x Number of pods = 49 million). According to the following table, set the requested CPUs to 4000m and the limit value to 5500m.

- Requested memory: It is recommended that 2.4 GiB memory be allocated to every 1000 nodes and 1 GiB memory be allocated to every 10,000 pods. The requested memory is the sum of these two values. (The obtained value may be different from the recommended value in Table 2. You can use either of them.)

  Requested memory = Number of target nodes/1000 * 2.4 GiB + Number of target pods/10,000 * 1 GiB. For example, for 2000 nodes and 20,000 pods, the requested memory is 6.8 GiB (2000/1000 * 2.4 GiB + 20,000/10,000 * 1 GiB).

Table 2 Recommended requested resources and resource limits for volcano-controller and volcano-scheduler

| Nodes/Pods in a Cluster | CPU Request (m) | CPU Limit (m) | Memory Request (Mi) | Memory Limit (Mi) |
| ----------------------- | --------------- | ------------- | ------------------- | ----------------- |
| 50/5000                 | 500             | 2000          | 500                 | 2000              |
| 100/10000               | 1000            | 2500          | 1500                | 2500              |
| 200/20000               | 1500            | 3000          | 2500                | 3500              |
| 300/30000               | 2000            | 3500          | 3500                | 4500              |
| 400/40000               | 2500            | 4000          | 4500                | 5500              |
| 500/50000               | 3000            | 4500          | 5500                | 6500              |
| 600/60000               | 3500            | 5000          | 6500                | 7500              |
| 700/70000               | 4000            | 5500          | 7500                | 8500              |

