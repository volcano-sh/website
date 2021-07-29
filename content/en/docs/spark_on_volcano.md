+++
title =  "spark on volcano"

date = 2021-06-29
lastmod = 2021-06-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "spark"
[menu.docs]
  parent = "ecosystem"
  weight = 8

+++



### Spark introduction

Spark is a fast and versatile big data clustering computing system. It provides high-level APIs for Scala, Java, Python, and R, as well as an optimization engine that supports a generic computational graph for data analysis. It also supports a rich set of advanced tools, including Spark SQL for SQL and Dataframes, MLLib for machine learning, GraphX for graphics processing, and Spark Streaming for Streaming.

### Spark on volcano

Spark operates on Volcano in two forms.Here we take the form of a simpler spark-operator [1]. There is also a more complex deployment method that can be referred to [2].

Install spark-operator through Helm.

```
$ helm repo add spark-operator https://googlecloudplatform.github.io/spark-on-k8s-operator

$ helm install my-release spark-operator/spark-operator --namespace spark-operator --create-namespace
```

To ensure that the spark-operator is up and running, check with the following directive.

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



Reference：

[1][spark on k8s官方文档](https://github.com/GoogleCloudPlatform/spark-on-k8s-operator/blob/master/docs/quick-start-guide.md)

[2][spark on CCE部署文档](https://support.huaweicloud.com/bestpractice-cce/cce_bestpractice_0131.html)

[3][大数据在volcano上的实践](http://live.vhall.com/357806873)

