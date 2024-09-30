+++
title =  "MPI on Volcano"

date = 2024-09-29
lastmod = 2024-09-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "MPI"
[menu.v1-10-0]
  parent = "zoology"
  weight = 5

+++



### HPC简介

高性能计算（High Performance Computing，缩写HPC）指利用聚集起来的计算能力来处理标准工作站无法完成的数据密集型的计算任务。

HPC = PBS + Maui + OpenMPI[1]

- PBS：资源管理器，负责管理集群中所有节点的资源
- Maui：第三方任务调度器，支持资源预留，支持各种复杂的优先级策略，支持抢占等。
- OpenMPI：上层通信环境，兼顾通信库、编译、分布式启动任务的功能。

### openMPI简介

openMPI项目是一个开源消息传递接口实现，由学术，研究和行业合作伙伴联盟开发和维护。通过它我们来进行并行化的程序设计。

### opensMPI如何执行

下面是一个简单的4线程mpi程序例子。

{{<figure library="1" src="mpi1.png" title="mpi工作原理">}}



### MPI on Volcano

创建mpi-example.yaml

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

部署mpi-example.yaml

```
kubectl apply -f mpi-example.yaml
```

在集群下查看作业执行情况

```
kubectl get pod
```