+++
title = "Batch Processing with Apache Spark"
linktitle = "Apache Spark"
date = 2026-02-11
publishdate = 2026-02-11
lastmod = 2026-02-11
draft = false
toc = true
type = "docs"

[menu.docs]
  parent = "tutorial-series"
  weight = 20
+++

This tutorial explains how to orchestrate Apache Spark applications using Volcano for optimized resource utilization and scheduling.

## Background

Apache Spark is a widely used engine for large-scale data processing. When running Spark on Kubernetes, a driver pod is created to manage several executor pods. In clusters with high concurrency or limited resources, this model faces a specific challenge:

- **Resource Starvation**: Standard schedulers may allow multiple Spark drivers to start, but fail to provide enough resources for their executors. This leads to a state where many jobs are "started" but none can progress, effectively deadlocking the cluster.
- **Gang Scheduling**: To prevent starvation, Spark jobs should ideally be scheduled as a "gang" ensuring the driver only starts if the minimum required resources for executors are also available.

Volcano enables gang scheduling for Spark, ensuring that resources are allocated efficiently and preventing drivers from idling while waiting for executors.

## Scenario

A typical Spark batch job consists of one driver and multiple executors performing parallel data processing tasks. In this tutorial, you will run a simple Spark Pi application using the **Spark Operator**. Volcano will act as the batch scheduler to ensure the driver and its executors are managed as a single unit.

## Prerequisites

Before you begin, ensure you have:
- A Kubernetes cluster with Volcano installed.
- The [Spark Operator](https://github.com/GoogleCloudPlatform/spark-on-k8s-operator) installed in your cluster.
- A ServiceAccount (e.g., `spark`) with the necessary permissions to manage pods.

## Deployment Step-by-Step

### 1. Create the SparkApplication Manifest

Create a file named `spark-pi.yaml` using the `SparkApplication` Custom Resource:

```yaml
apiVersion: "sparkoperator.k8s.io/v1beta2"
kind: SparkApplication
metadata:
  name: spark-tutorial-pi
  namespace: default
spec:
  type: Scala
  mode: cluster
  image: "gcr.io/spark-operator/spark:v3.1.1"
  mainClass: org.apache.spark.examples.SparkPi
  mainApplicationFile: "local:///opt/spark/examples/jars/spark-examples_2.12-3.1.1.jar"
  sparkVersion: "3.1.1"
  batchScheduler: "volcano" # Crucial: tells the operator to use Volcano
  restartPolicy:
    type: OnFailure
    onFailureRetries: 3
    onFailureRetryInterval: 10
  driver:
    cores: 1
    memory: "512m"
    labels:
      version: 3.1.1
    serviceAccount: spark # Ensure this SA exists
  executor:
    cores: 1
    instances: 2
    memory: "512m"
    labels:
      version: 3.1.1
```

### 2. Apply the manifest

Deploy the Spark application using `kubectl`:

```bash
kubectl apply -f spark-pi.yaml
```

## Verification

### Check Application Status

You can monitor the progress of your Spark application using the standard `kubectl` command:

```bash
kubectl get sparkapplication spark-tutorial-pi
```

Expected output:
```text
NAME                STATUS      ATTEMPTS   START                  FINISH                 AGE
spark-tutorial-pi   COMPLETED   1          2026-02-11T09:40:00Z   2026-02-11T09:42:00Z   2m
```

### Monitor Pods

Watch the driver and executor pods as they are scheduled by Volcano:

```bash
kubectl get pods -l spark-role=driver
kubectl get pods -l spark-role=executor
```

## Notes

- **Starvation Prevention**: If your driver pod remains in `Pending` state, check if your Volcano `Queue` has enough `capability` to satisfy the combined resource requests of the driver and the minimum executors.
- **Scheduler Configuration**: Ensure that the `batchScheduler` field in your manifest is explicitly set to `"volcano"`. If omitted, the application will default to the standard Kubernetes scheduler.
- **RBAC**: If the driver fails to create executor pods, verify that the `serviceAccount` used has a `RoleBinding` allowing it to create and manage pods in the namespace.

## Tutorial Series

- **[Distributed TensorFlow](/en/docs/tutorial-tensorflow/)**: Orchestrate high-performance ML training jobs with parameter servers and workers.
- **[GPU Resource Management](/en/docs/tutorial-gpu-scheduling/)**: Maximize hardware efficiency through fractional sharing (vGPU) and isolation.
- **[Multi-tenancy](/en/docs/tutorial-multi-tenancy/)**: Configure fair share scheduling and hierarchical queues for different teams.
- **[Argo Workflows](/en/docs/tutorial-argo-workflows/)**: Integrate Volcano's advanced scheduling into your CI/CD and data pipelines.

Back to basics? Check out our **[Quick Start](/en/docs/tutorials/)** 