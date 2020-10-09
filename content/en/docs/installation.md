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

#### Prerequisites

 - A Kubernetes cluster of V1.13 or later is available.
 - [Optional] Helm is downloaded and installed for your cluster. For details on how to install the Helm, click [here](https://helm.sh/docs/using_helm/#install-helm). (This operation is required only if Volcano is installed using Helm.)
 - The latest version of Volcano is downloaded from [here](https://github.com/volcano-sh/volcano/releases).
 - The release package is decompressed.
    ```shell
    #tar -xvf volcano-{Version}-linux-gnu.tar.gz
    
    #cd volcano-{Version}-linux-gnu
    
    #ll
    total 60
    drwxr-xr-x  4 root1 root1  4096 Jul 23 11:38 ./
    drwxr-xr-x 11 root1 root1 12288 Jul 23 11:37 ../
    drwxr-xr-x  3 root1 root1  4096 Jul 16 16:15 bin/
    -rw-r--r--  1 root1 root1   153 Jul 16 16:15 default-queue.yaml
    drwxr-xr-x  3 root1 root1  4096 Jul 16 16:15 helm/
    -rw-r--r--  1 root1 root1  4169 Jul 16 16:15 README.md
    -rw-r--r--  1 root1 root1 23453 Jul 16 16:15 volcano-{Version}.yaml

    
    ```

#### Installation Modes
 - [Using Deployment](#installation-using-deployment-yaml)
 - [Using Helm](#installation-using-helm-charts)



### Installation Using Deployment

Create a deployment using the `volcano-{Version}.yaml` file embedded in the release package.

```shell
# kubectl apply -f volcano-{Version}.yaml 
namespace/volcano-system created
configmap/volcano-scheduler-configmap created
serviceaccount/volcano-scheduler created
clusterrole.rbac.authorization.k8s.io/volcano-scheduler created
clusterrolebinding.rbac.authorization.k8s.io/volcano-scheduler-role created
deployment.apps/volcano-scheduler created
serviceaccount/volcano-admission created
clusterrole.rbac.authorization.k8s.io/volcano-admission created
clusterrolebinding.rbac.authorization.k8s.io/volcano-admission-role created
deployment.apps/volcano-admission created
service/volcano-admission-service created
job.batch/volcano-admission-init created
serviceaccount/volcano-controllers created
clusterrole.rbac.authorization.k8s.io/volcano-controllers created
clusterrolebinding.rbac.authorization.k8s.io/volcano-controllers-role created
deployment.apps/volcano-controllers created
customresourcedefinition.apiextensions.k8s.io/jobs.batch.volcano.sh created
customresourcedefinition.apiextensions.k8s.io/commands.bus.volcano.sh created
customresourcedefinition.apiextensions.k8s.io/podgroups.scheduling.incubator.k8s.io created
customresourcedefinition.apiextensions.k8s.io/queues.scheduling.incubator.k8s.io created
customresourcedefinition.apiextensions.k8s.io/podgroups.scheduling.sigs.dev created
customresourcedefinition.apiextensions.k8s.io/queues.scheduling.sigs.dev created

```
Verify running status of Volcano components.
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

### Installation Using Helm

If you want to use Helm to deploy Volcano, ensure that you have Helm charts installed in your cluster.

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

###### Step: 3 

Verify running status of Volcano components.
```shell
# kubectl get all -n volcano-system
NAME                                       READY   STATUS              RESTARTS   AGE
pod/volcano-admission-b45b7b76-84jmw       0/1     ContainerCreating   0          4m42s
pod/volcano-admission-init-fw47j           0/1     ImagePullBackOff    0          4m42s
pod/volcano-controllers-5f66f8d76c-27584   0/1     ImagePullBackOff    0          4m42s
pod/volcano-scheduler-bb4467966-z642p      0/1     ImagePullBackOff    0          4m42s


NAME                                TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)   AGE
service/volcano-admission-service   ClusterIP   10.107.128.208   <none>        443/TCP   4m42s


NAME                                  READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/volcano-admission     0/1     1            0           4m42s
deployment.apps/volcano-controllers   0/1     1            0           4m42s
deployment.apps/volcano-scheduler     0/1     1            0           4m42s

NAME                                             DESIRED   CURRENT   READY   AGE
replicaset.apps/volcano-admission-b45b7b76       1         1         0       4m42s
replicaset.apps/volcano-controllers-5f66f8d76c   1         1         0       4m42s
replicaset.apps/volcano-scheduler-bb4467966      1         1         0       4m42s



NAME                               COMPLETIONS   DURATION   AGE
job.batch/volcano-admission-init   0/1           4m42s      4m42s

```

After Volcano is installed, you can use some examples provided in [here](https://github.com/volcano-sh/volcano/tree/master/example) to verify the installation.