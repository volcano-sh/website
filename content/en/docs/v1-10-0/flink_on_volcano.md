+++
title =  "Flink on Volcano"

date = 2024-09-29
lastmod = 2024-09-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Flink"
[menu.v1-10-0]
  parent = "ecosystem"
  weight = 2

+++



### Flink introduction

Apache Flink is an open-source streaming framework developed by the Apache Software Foundation. At its core, Apache Flink is a distributed streaming data streaming engine written in Java and Scala. Flink executes any stream data program in data parallelism and pipelining. Flink's pipelined runtime system can execute both batch and stream programs. In addition, the Flink runtime itself supports the execution of iterative algorithms.

### The premise condition

Make sure the deployed Kubernate, Kubectl, Volcano are installed correctly.

### Deployment process

##### 1. Download

To run Flink, which requires a Java 8 or 11 environment, use the following instructions to determine the Java version.

```bash
java -version
```

Download the package and go to the directory.

```
$ wget https://www.apache.org/dyn/closer.lua/flink/flink-1.12.2/flink-1.12.2-src.tgz
$ cd flink-1.12.2
```

##### 2. Start a Cluster

Running the script completes the deployment of Flink on the cluster.

```bash
$ ./bin/start-cluster.sh
```

##### 3. Submit a job

Submit the job using the following instructions.

```bash
$ ./bin/flink run examples/streaming/WordCount.jar
$ tail log/flink-*-taskexecutor-*.out
```

### Flink on Volcano

##### 1. The deployment of the component

Deploying a Flink Cluster requires creating two deploys, a Service, and a ConfigMap. The scheduling strategy is Volcano.The contents of `flink-configuration-configmap.yaml` are shown below.

```
apiVersion: v1
kind: ConfigMap
metadata:
  name: flink-config
  labels:
    app: flink
data:
  flink-conf.yaml: |+
    jobmanager.rpc.address: flink-jobmanager
    taskmanager.numberOfTaskSlots: 2
    blob.server.port: 6124
    jobmanager.rpc.port: 6123
    taskmanager.rpc.port: 6122
    queryable-state.proxy.ports: 6125
    jobmanager.memory.process.size: 1600m
    taskmanager.memory.process.size: 1728m
    parallelism.default: 2
  log4j-console.properties: |+
    # This affects logging for both user code and Flink
    rootLogger.level = INFO
    rootLogger.appenderRef.console.ref = ConsoleAppender
    rootLogger.appenderRef.rolling.ref = RollingFileAppender

    # Uncomment this if you want to _only_ change Flink's logging
    #logger.flink.name = org.apache.flink
    #logger.flink.level = INFO

    # The following lines keep the log level of common libraries/connectors on
    # log level INFO. The root logger does not override this. You have to manually
    # change the log levels here.
    logger.akka.name = akka
    logger.akka.level = INFO
    logger.kafka.name= org.apache.kafka
    logger.kafka.level = INFO
    logger.hadoop.name = org.apache.hadoop
    logger.hadoop.level = INFO
    logger.zookeeper.name = org.apache.zookeeper
    logger.zookeeper.level = INFO

    # Log all infos to the console
    appender.console.name = ConsoleAppender
    appender.console.type = CONSOLE
    appender.console.layout.type = PatternLayout
    appender.console.layout.pattern = %d{yyyy-MM-dd HH:mm:ss,SSS} %-5p %-60c %x - %m%n

    # Log all infos in the given rolling file
    appender.rolling.name = RollingFileAppender
    appender.rolling.type = RollingFile
    appender.rolling.append = false
    appender.rolling.fileName = ${sys:log.file}
    appender.rolling.filePattern = ${sys:log.file}.%i
    appender.rolling.layout.type = PatternLayout
    appender.rolling.layout.pattern = %d{yyyy-MM-dd HH:mm:ss,SSS} %-5p %-60c %x - %m%n
    appender.rolling.policies.type = Policies
    appender.rolling.policies.size.type = SizeBasedTriggeringPolicy
    appender.rolling.policies.size.size=100MB
    appender.rolling.strategy.type = DefaultRolloverStrategy
    appender.rolling.strategy.max = 10

    # Suppress the irrelevant (wrong) warnings from the Netty channel handler
    logger.netty.name = org.apache.flink.shaded.akka.org.jboss.netty.channel.DefaultChannelPipeline
    logger.netty.level = OFF
```

Service is used to provide services for the REST and UI ports of the JobManager.The contents of `jobManager-Service.yaml` are as follows.

```
apiVersion: v1
kind: Service
metadata:
  name: flink-jobmanager
spec:
  type: ClusterIP
  ports:
  - name: rpc
    port: 6123
  - name: blob-server
    port: 6124
  - name: webui
    port: 8081
  selector:
    app: flink
    component: jobmanager
```

The contents of `jobmanager-session-deployment.yaml` are as follows.

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flink-jobmanager
spec:
  replicas: 1
  selector:
    matchLabels:
      app: flink
      component: jobmanager
  template:
    metadata:
      labels:
        app: flink
        component: jobmanager
    spec:
      containers:
      - name: jobmanager
        image: flink:1.11.0-scala_2.11
        args: ["jobmanager"]
        ports:
        - containerPort: 6123
          name: rpc
        - containerPort: 6124
          name: blob-server
        - containerPort: 8081
          name: webui
        livenessProbe:
          tcpSocket:
            port: 6123
          initialDelaySeconds: 30
          periodSeconds: 60
        volumeMounts:
        - name: flink-config-volume
          mountPath: /opt/flink/conf
        securityContext:
          runAsUser: 9999  # refers to user _flink_ from official flink image, change if necessary
      volumes:
      - name: flink-config-volume
        configMap:
          name: flink-config
          items:
          - key: flink-conf.yaml
            path: flink-conf.yaml
          - key: log4j-console.properties
            path: log4j-console.properties
```

The contents of  `taskmanager-session-deployment.yaml` are as follows.

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flink-taskmanager
spec:
  replicas: 2
  selector:
    matchLabels:
      app: flink
      component: taskmanager
  template:
    metadata:
      labels:
        app: flink
        component: taskmanager
    spec:
      containers:
      - name: taskmanager
        image: flink:1.11.0-scala_2.11
        args: ["taskmanager"]
        ports:
        - containerPort: 6122
          name: rpc
        - containerPort: 6125
          name: query-state
        livenessProbe:
          tcpSocket:
            port: 6122
          initialDelaySeconds: 30
          periodSeconds: 60
        volumeMounts:
        - name: flink-config-volume
          mountPath: /opt/flink/conf/
        securityContext:
          runAsUser: 9999  # refers to user _flink_ from official flink image, change if necessary
      volumes:
      - name: flink-config-volume
        configMap:
          name: flink-config
          items:
          - key: flink-conf.yaml
            path: flink-conf.yaml
          - key: log4j-console.properties
            path: log4j-console.properties
```

Create the above four YAML configuration files on the cluster node and deploy them using the following instructions.

```
kubectl create -f flink-configuration-configmap.yaml
kubectl create -f jobmanager-service.yaml
kubectl create -f jobmanager-session-deployment.yaml
kubectl create -f taskmanager-session-deployment.yaml
```

Query to see if the payload was successfully created：

```
kubectl get cm| grep flink
kubectl get svc | grep flink
kubectl get pod -owide | grep Flink
```

##### 2. Outward publishing service

Once the Flink payload is created, you need to publish the service externally。

- If you use Huawei Cloud CCE for testing, go to the "Workloads - Stateless Loads" page of CCE. Select Flink-JobManager and click Access Mode.
- Click "Add Service", select node access, and enter container port bit 8081.
- Click Network Management in CCE, you can see the service we just added, and visit the link for external publication.
- Go to the Dashboard page of Flink and click Submit New Job to submit the task. Here you have the option to submit an officially-provided WordCount sample.The directory is `flink-1.12.2/examples/streaming/WordCount.jar`