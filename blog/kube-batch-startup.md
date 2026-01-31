+++
title =  "Bringing Up Kube-Batch"
description = "A Batch Scheduler for Kubernetes"
subtitle =""

date = 2019-01-28
lastmod = 2019-01-29
datemonth = "Jan"
dateyear = "2019"
dateday = 29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["Volcano"]

tags = ["Tutorials"]
summary = "Bring up the Batch Scheduler for scheduling batch workloads"

# Add menu entry to sidebar.
linktitle = "Bringing Up Kube-Batch"
[menu.posts]
  parent = "tutorials"
  weight = 2
+++

# Tutorial of kube-batch

This document describes how to run `kube-batch` as a batch scheduler for Kubernetes. To get the complete code, go to [master](https://github.com/kubernetes-sigs/kube-batch/tree/master).

## 1. Prerequisites
Before running `kube-batch`, you must start up a Kubernetes cluster (see [Creating a Cluster with Kubeadm](https://kubernetes.io/docs/setup/independent/create-cluster-kubeadm/)). To complete local testing and deployment, you can use Minikube (see [Running Kubernetes Locally with Minikube](https://kubernetes.io/docs/getting-started-guides/minikube/). You can also use [kind](https://github.com/kubernetes-sigs/kind) to run local Kubernetes clusters with Docker container "nodes".

`kube-batch` needs to be run as a Kubernetes scheduler. The following sections describe how to run `kube-batch` as a Kubernetes scheduler quickly. For details, see [Configure Multiple Schedulers](https://kubernetes.io/docs/tasks/administer-cluster/configure-multiple-schedulers/).

## 2. Configuring kube-batch for Kubernetes

### (1) kube-batch image

You can download the official kube-batch image from [DockerHub](https://hub.docker.com/r/kubesigs/kube-batch/). The latest version is `v0.4`.

```bash
# docker pull kubesigs/kube-batch:v0.4
```

### (2) Creating a Kubernetes Deployment for kube-batch

#### Downloading kube-batch

```bash
# mkdir -p $GOPATH/src/github.com/kubernetes-sigs/
# cd $GOPATH/src/github.com/kubernetes-sigs/
# git clone https://github.com/kubernetes-sigs/kube-batch
```

#### Deploying `kube-batch` with Helm

Run `kube-batch` as a Kubernetes scheduler.

```bash
# helm install $GOPATH/src/github.com/kubernetes-sigs/kube-batch/deployment/kube-batch --namespace kube-system
```

Check the version of `kube-batch`.

```bash
# helm list
NAME        	REVISION	UPDATED                 	STATUS  	CHART                	NAMESPACE
dozing-otter	1       	Thu Jun 14 18:52:15 2018	DEPLOYED	kube-batch-0.4.0    	kube-system
```

NOTE: `kube-batch` needs to collect cluster information (such as pods, nodes, and CRDs) for scheduling, so the service account used by the Deployment must have permission to access those cluster resources. Otherwise, `kube-batch` cannot start up. If you are not familiar with Kubernetes RBAC, please copy example/role.yaml to `$GOPATH/src/github.com/kubernetes-sigs/kube-batch/deployment/kube-batch/templates/` and reinstall `kube-batch`.

### (3) Creating a Job

Create a file named `job-01.yaml` with the following content:

```yaml
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

The YAML file represents a job named `qj-01`, which is used to create 6 pods (specified by `parallelism`). These pods will be scheduled by the scheduler `kube-batch` (specified by `schedulerName`). `kube-batch` watches the `PodGroup` and the annotation `scheduling.k8s.io/group-name`. The annotation identifies to which group a pod belongs to. `kube-batch` will start `.spec.minMember` pods for a job at the same time. If resources are insufficient, `kube-batch` will not start any pods for the job.

Create a job.

```bash
# kubectl create -f job-01.yaml
```

Check the job status.

```bash
# kubectl get jobs
NAME      DESIRED   SUCCESSFUL   AGE
qj-1      6         6            2h 
```

Check the pod statuses.

```bash
# kubectl get pod --all-namespaces
```


## 4. Creating a PriorityClass for Pods

The `kube-batch` scheduler starts pods by their priority in the same QueueJob. Pods with a higher priority are started first. The following example demonstrates how to use `PriorityClass`:

Create a file named `priority_1000.yaml` with the following content:

```yaml
apiVersion: scheduling.k8s.io/v1beta1
kind: PriorityClass
metadata:
  name: high-priority
  namespace: batch-ns01
value: 1000
```

Create a PriorityClass with priority 1000.

```
# kubectl create -f priority_1000.yaml
```

Create a pod configuration file named `pod-config-ns01-r01.yaml`.

```yaml
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

Create a pod with priority 1000.

```
# kubectl create -f pod-config-ns01-r01.yaml
```


NOTE:

* `PriorityClass` is supported only by Kubernetes 1.9 or later.
* Pods in the same Deployment, RS, or job share the same pod template, so they have the same `PriorityClass`. To specify a different `PriorityClass` for each pod in the same QueueJob, please create a new controller.
