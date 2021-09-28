+++
title =  "jon plugins"

date = 2021-09-26
lastmod = 2021-09-26

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "job Plugins"
[menu.docs]
  parent = "scheduler"
  weight = 4

+++



### job plugins场景诉求

volcano的作业有很多定制化的需求。考虑分布式的训练场景，多个pod运行起来之后，pod之间需要网络互访问，进行数据同步。

- env：job中含有多个pod，通过环境变量的形式，找到pod属于job中的那个task，为task提供**索引**。

- svc: 支持pod之间的互访。典型的场景是tensorflow的机器学习任务中，参数服务节点和工作节点的交互访问。提供作业运行所需要的网络信息，host文件、headless service等。

- ssh: 提供任务之间的免密码认证。 常用于基于MPI框架的高性能计算场景中。



### job plugin使用方法

在配置的yaml中的plugin字段填写使用的插件，并传入参数。默认的使用方式是没有参数的。

```
spec:
	minAvailable:6
	schedulerName:volcano
	plugins:
		env:[]
		svc:[]
		ssh:[]
```

ssh参数含义：在ssh[]中可以配置三个参数，分别是sshKeyFilePath、sshPrivateKey、sshPublicKey。

- sshKeyFilePath是文件路径，ssh plugin的mountRsaKey函数会为每个容器配置挂载sshKeyFilePath。
- sshPrivateKey、sshPublicKey是免密访问中的密钥。ssh plugin的OnJobAdd函数中，会检测用户是否提供了RSA私钥，如果没有（即默认参数表），会调用ssh plugin的密钥生成函数generateRsaKey。

svc参数含义：再svc[]中可以配置两个参数，分别好似publishNotReadyAddresses和disableNetworkPolicy，均为布尔类型的参数。

- publishNotReadyAddresses：在svc plugin的createServiceIfNotExist函数中，该配置字段被赋值给PublishNotReadAddresses字段。默认被赋值为true。
- disableNetworkPolicy：默认被赋值为true。如果被设置为false，在svc plugin的OnJobAdd函数中会调用createNetworkPolicyIfNotExist创建新的网络协议。



### 以tensorflow on volcano为例

```
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-dist-mnist
spec:
  minAvailable: 3
  schedulerName: volcano
  plugins:
    env: []
    svc: []
  policies:
    - event: PodEvicted
      action: RestartJob
  tasks:
    - replicas: 1
      name: ps
      template:
        spec:
          containers:
            - command:
                - sh
                - "-c"
                - |
                  PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' |sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  WORKER_HOST=`cat /etc/volcano/worker.host | sed 's/$/&:2222/g' |sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  export TF_CONFIG={\"cluster\":{\"ps\":[${PS_SHOT}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"ps\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};

                  python /var/tf_dist_mnist/dist_mnist.py
              image: volcanosh/dist-mnist-tf-example:0.0.1
              name: tensorflow
              ports:
                - containerPort: 2222
                  name: tfjob-port
              resources:
                requests:
                  cpu: "200m"
          restartPolicy: Never
    - replicas: 2
      name: worker
      policies:
        - event: TaskCompleted
          action: CompleteJob
      template:
        spec:

          containers:
            - command:
                - sh
                - "-c"
                - |
                  PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' |sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  WORKER_HOST=`cat /etc/volcano/worker.host | sed 's/$/&:2222/g' |sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  export TF_CONFIG={\"cluster\":{\"ps\":[${PS_SHOT}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"ps\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};
                  python /var/tf_dist_mnist/dist_mnist.py
              image: volcanosh/dist-mnist-tf-example:0.0.1
              name: tensorflow
              ports:
                - containerPort: 2222
                  name: tfjob-port
              resources:
                requests:
                  cpu: "200m"
              
          restartPolicy: Never
```

在job中task的具体配置中，command字段包含对job plugin的配置。

```
 PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' |sed 's/^/"/;s/$/"/' | tr "\n" ","`;
 WORKER_HOST=`cat /etc/volcano/worker.host | sed 's/$/&:2222/g' |sed 's/^/"/;s/$/"/' | tr "\n" ","`;
```

svc插件将job中所有ps（参数服务器）相关的host name信息挂载到文件路径 /etc/volcano/ps.host。同理worker相关信息在下一行进行了配置。

```
export TF_CONFIG={\"cluster\":{\"ps\":[${PS_SHOT}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"ps\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};
```

env插件通过VK_TASK_INDEX得知task的索引号是多少。





### 以MPI on volcano为例

```
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: lm-mpi-job
spec:
  minAvailable: 3
  schedulerName: volcano
  plugins:
    ssh: []
    svc: []
  tasks:
    - replicas: 1
      name: mpimaster
      policies:
        - event: TaskCompleted
          action: CompleteJob
      template:
        spec:
          containers:
            - command:
                - /bin/sh
                - -c
                - |
                  MPI_HOST=`cat /etc/volcano/mpiworker.host | tr "\n" ","`;
                  mkdir -p /var/run/sshd; /usr/sbin/sshd;
                  mpiexec --allow-run-as-root --host ${MPI_HOST} -np 2 mpi_hello_world > /home/re;
              image: volcanosh/example-mpi:0.0.1
              name: mpimaster
              ports:
                - containerPort: 22
                  name: mpijob-port
              workingDir: /home
          restartPolicy: OnFailure
    - replicas: 2
      name: mpiworker
      template:
        spec:
          containers:
            - command:
                - /bin/sh
                - -c
                - |
                  mkdir -p /var/run/sshd; /usr/sbin/sshd -D;
              image: volcanosh/example-mpi:0.0.1
              name: mpiworker
              ports:
                - containerPort: 22
                  name: mpijob-port
              workingDir: /home
          restartPolicy: OnFailure
---
```

在MPI_HOST字段中挂载ssh免密登陆相关的信息的文件。

