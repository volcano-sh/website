+++
title =  "Installation"


date = 2019-01-28
lastmod = 2020-08-29

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

```
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/master/installer/volcano-development.yaml
```

You can also replace `master` of above url with specific tag/branch (such as `release-1.5` branch for latest v1.5.x version, `v1.5.1` tag for v1.5.1 version) to install Volcano with specific version.


### Install from code

If you don't have a Kubernetes cluster, try one-click install from code base.This way is only available for x86_64 temporarily.

```
# git clone https://github.com/volcano-sh/volcano.git
# tar -xvf volcano-{Version}-linux-gnu.tar.gz
# cd volcano-{Version}-linux-gnu

# ./hack/local-up-volcano.sh
```





### Install with Helm

Helm is downloaded and installed for your cluster. For details on how to install the Helm, click [here](https://helm.sh/docs/using_helm/#install-helm). 

###### Step: 1 
Create a new namespace.
```shell
# kubectl create namespace volcano-system
namespace/volcano-system created

```

###### Step: 2
Use Helm charts to install Volcano.
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
