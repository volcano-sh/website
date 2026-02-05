++
title = "MPI 插件用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_mpi_plugin/"
[menu.docs]
  parent = "user-guide"
++

## 介绍

**MPI 插件** 用于优化在 Volcano 上运行 MPI 作业时的使用体验，既可以减少用户需要编写的 YAML 配置量，又可以确保 MPI 作业的正常运行。

## MPI 插件的工作机制

MPI 插件主要做三件事：

* 为作业中的所有容器打开 MPI 所需的端口；
* 强制开启 `ssh` 和 `svc` 插件；
* 为 master Pod 添加 `MPI_HOST` 环境变量，其中包含 worker 的域名，供 `mpiexec` 的 `--host` 参数使用。

## MPI 插件参数

### 关键点

* 如果配置了 `master` 或 `worker` 参数，请确保对应名称的 Task 存在，并且其角色与参数含义一致；
* 如果配置了 `port`，请确保容器中 `sshd` 使用的端口与该参数值一致；
* 如果启用了 `gang` 插件，请保证 `minAvailable` 的取值 **等于 worker Task 的副本数**。

### 参数列表

| ID  | 名称   | 类型   | 默认值  | 必须 | 描述                       | 示例                |
|-----|--------|--------|---------|------|----------------------------|---------------------|
| 1   | master | string | master  | 否   | MPI master 对应的 Task 名  | `--master=mpimaster` |
| 2   | worker | string | worker  | 否   | MPI worker 对应的 Task 名  | `--worker=mpiworker` |
| 3   | port   | string | 22      | 否   | 容器中开放的 SSH 端口      | `--port=5000`        |

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
    mpi: ["--master=mpimaster","--worker=mpiworker","--port=22"]  ## 注册 MPI 插件
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

