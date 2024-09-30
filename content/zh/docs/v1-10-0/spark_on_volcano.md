+++
title =  "Spark on Volcano"

date = 2024-09-29
lastmod = 2024-09-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Spark"
[menu.v1-10-0]
  parent = "zoology"
  weight = 8

+++



### Spark简介

Spark是一款快速通用的大数据集群计算系统。它提供了Scala、Java、Python和R的高级api，以及一个支持用于数据分析的通用计算图的优化引擎。它还支持一组丰富的高级工具，包括用于SQL和DataFrames的Spark SQL、用于机器学习的MLlib、用于图形处理的GraphX和用于流处理的Spark Streaming。

### Spark on Volcano

当前，有两种方式可以支持Spark和Volcano集成：
- Spark on Kubernetes native支持: 由[Apache Spark社区](https://github.com/apache/spark)和Volcano社区共同维护。
- Spark Operator支持: 由[GoogleCloudPlatform community](https://github.com/GoogleCloudPlatform/spark-on-k8s-operator)和Volcano社区共同维护。

#### Spark on Kubernetes native支持 (spark-submit)

从Apache Spark v3.3.0版本及Volcano v1.5.1版本开始，Spark支持Volcano作为自定义调度，查看[链接](https://spark.apache.org/docs/latest/running-on-kubernetes.html#using-volcano-as-customized-scheduler-for-spark-on-kubernetes)了解更多。

#### Spark Operator支持 (spark-operator)

通过helm安装spark-operator。

```
$ helm repo add spark-operator https://googlecloudplatform.github.io/spark-on-k8s-operator

$ helm install my-release spark-operator/spark-operator --namespace spark-operator --create-namespace
```

为确保spark-operator已经正常运行，通过如下指令查看。

```
$ kubectl get po -nspark-operator
```

这里是用官方提供的spark-pi.yaml.

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

部署spark应用并查看状态。

```
$ kubectl apply -f spark-pi.yaml
$ kubectl get SparkApplication
```
