+++
title =  "Spark on Volcano"

date = 2024-01-16
lastmod = 2024-01-16

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Spark"
[menu.v1-8-2]
  parent = "ecosystem"
  weight = 8

+++



### Spark introduction

Spark is a fast and versatile big data clustering computing system. It provides high-level APIs for Scala, Java, Python, and R, as well as an optimization engine that supports a generic computational graph for data analysis. It also supports a rich set of advanced tools, including Spark SQL for SQL and Dataframes, MLLib for machine learning, GraphX for graphics processing, and Spark Streaming for Streaming.

### Spark on Volcano

Currently, there are two ways to support the integration of Spark on Kubernetes and volcano.
- Spark on Kubernetes native support: maintained by the [Apache Spark community](https://github.com/apache/spark) and Volcano community
- Spark Operator support: maintained by the [GoogleCloudPlatform community](https://github.com/GoogleCloudPlatform/spark-on-k8s-operator) and Volcano community

#### Spark on Kubernetes native support (spark-submit)

Spark on Kubernetes with Volcano as a custom scheduler is supported since Spark v3.3.0 and Volcano v1.5.1. See more detail in [link](https://spark.apache.org/docs/latest/running-on-kubernetes.html#using-volcano-as-customized-scheduler-for-spark-on-kubernetes).

#### Spark Operator support (spark-operator)

Install Spark-Operator through Helm.

```
$ helm repo add spark-operator https://googlecloudplatform.github.io/spark-on-k8s-operator

$ helm install my-release spark-operator/spark-operator --namespace spark-operator --create-namespace
```

To ensure that the Spark-Operator is up and running, check with the following directive.

```
$ kubectl get po -nspark-operator
```

Here's the official `spark.yaml`.

```
apiVersion: "sparkoperator.k8s.io/v1beta2"
kind: SparkApplication
metadata:
  name: spark-pi
  namespace: default
spec:
  type: Scala
  mode: cluster
  image: "gcr.io/spark-operator/spark:v3.0.0"
  imagePullPolicy: Always
  mainClass: org.apache.spark.examples.SparkPi
  mainApplicationFile: "local:///opt/spark/examples/jars/spark-examples_2.12-3.0.0.jar"
  sparkVersion: "3.0.0"
  batchScheduler: "volcano"   #Note: the batch scheduler name must be specified with `volcano`
  restartPolicy:
    type: Never
  volumes:
    - name: "test-volume"
      hostPath:
        path: "/tmp"
        type: Directory
  driver:
    cores: 1
    coreLimit: "1200m"
    memory: "512m"        
    labels:
      version: 3.0.0
    serviceAccount: spark
    volumeMounts:
      - name: "test-volume"
        mountPath: "/tmp"
  executor:
    cores: 1
    instances: 1
    memory: "512m"    
    labels:
      version: 3.0.0
    volumeMounts:
      - name: "test-volume"
        mountPath: "/tmp"
```

Deploy the Spark application and see the status.

```
$ kubectl apply -f spark-pi.yaml
$ kubectl get SparkApplication
```
