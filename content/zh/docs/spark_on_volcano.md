+++
title =  "Spark on Volcano"

date = 2021-04-07
lastmod = 2021-04-07

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Spark"
[menu.docs]
  parent = "zoology"
  weight = 8

+++



### Spark简介

Spark 是一款快速通用的大数据集群计算系统。它提供了 Scala、Java、Python 和R的高级 api，以及一个支持用于数据分析的通用计算图的优化引擎。它还支持一组丰富的高级工具，包括用于 SQL 和 DataFrames 的 Spark SQL、用于机器学习的 MLlib、用于图形处理的 GraphX 和用于流处理的 Spark Streaming。

### Spark on Volcano

当前，有两种方式可以支持 Spark 和 Volcano 集成：
- Spark on Kubernetes native 支持: 由[Apache Spark社区](https://github.com/apache/spark)和 Volcano 社区共同维护。
- Spark Operator 支持: 由[GoogleCloudPlatform community](https://github.com/GoogleCloudPlatform/spark-on-k8s-operator)和 Volcano 社区共同维护。

#### Spark on Kubernetes native支持 (spark-submit)

从 Apache Spark v3.3.0 版本及 Volcano v1.5.1 版本开始，Spark 支持 Volcano 作为自定义调度，查看[链接](https://spark.apache.org/docs/latest/running-on-kubernetes.html#using-volcano-as-customized-scheduler-for-spark-on-kubernetes)了解更多。

#### Spark Operator 支持 (spark-operator)

通过 helm 安装 spark-operator。

```
$ helm repo add spark-operator https://googlecloudplatform.github.io/spark-on-k8s-operator

$ helm install my-release spark-operator/spark-operator --namespace spark-operator --create-namespace
```

为确保 spark-operator 已经正常运行，通过如下指令查看。

```
$ kubectl get po -nspark-operator
```

这里是用官方提供的 spark-pi.yaml.

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

部署 spark 应用并查看状态。

```
$ kubectl apply -f spark-pi.yaml
$ kubectl get SparkApplication
```
