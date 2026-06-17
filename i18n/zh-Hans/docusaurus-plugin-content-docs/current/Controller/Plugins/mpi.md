---
title: MPI

---


## 介绍

**MPI插件**旨在优化运行MPI作业时的用户体验，它不仅可以让用户编写更少的yaml，而且可以保证MPI作业的正常运行。

## MPI 插件的工作原理

MPI 插件将做三件事：

* 打开 MPI 用于作业的所有容器的端口
* 强制打开`ssh`和`svc`插件
*为主pod添加`MPI_HOST`环境变量，该环境变量包含worker的域名，由`mpiexec`的`--host`参数使用

## MPI 插件参数

### 要点

* 如果配置了`master`或`worker`，请确保其值对应的任务存在，并且这些任务的角色与参数的含义相对应
* 如果配置了“port”，则使“sshd”的端口值与参数值相同。
* 如果启用了“gang”插件，请确保“minAvailable”的值**等于**“worker 的副本”数量。

### 参数

| ID   | 名称   | 类型   | 默认值 | 是否必填 | 描述                        | 示例            |
| ---- | ------ | ------ | ------------- | -------- | ---------------------------------- | ------------------ |
| 1    | master | string | master        | 否       | MPI 主节点名称 | --master=mpimaster |
| 2    | worker | string | worker        | 否       | MPI 工作节点名称 | --worker=mpiworker |
| 3    | port   | string | 22            | 否       | 为容器打开的端口 | --port=5000        |

## 示例

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: lm-mpi-job
spec:
  minAvailable: 1
  schedulerName: volcano
  plugins:
    mpi: ["--master=mpimaster","--worker=mpiworker","--port=22"]  ## MPI plugin register
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
                  mkdir -p /var/run/sshd; /usr/sbin/sshd;
                  mpiexec --allow-run-as-root --host ${MPI_HOST} -np 2 mpi_hello_world;
              image: volcanosh/example-mpi:0.0.3
              name: mpimaster
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
              image: volcanosh/example-mpi:0.0.3
              name: mpiworker
              workingDir: /home
          restartPolicy: OnFailure
```
