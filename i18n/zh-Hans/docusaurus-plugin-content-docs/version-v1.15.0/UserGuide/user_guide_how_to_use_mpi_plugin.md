---
title: "MPI 插件用户指南"
---


## 简介

**MPI 插件**用于优化 MPI Job 的使用体验：既减少 YAML 编写量，又保障 MPI Job 正常运行。

## MPI 插件工作原理

MPI 插件会完成以下工作：

* 为 Job 中所有容器开放 MPI 使用的端口
* 强制启用 `ssh` 与 `svc` 插件
* 为 master Pod 添加 `MPI_HOST` 环境变量（包含 worker 域名），供 `mpiexec` 的 `--host` 参数使用

## MPI 插件参数

### 要点

* 若配置了 `master` 或 `worker`，请确保对应 Task 存在，且角色与参数含义一致。
* 若配置了 `port`，请使 `sshd` 端口与参数值一致。
* 若启用了 `gang` 插件，请确保 `minAvailable` **等于** worker 的 `replicas` 数量。

### 参数说明

| 编号 | 名称 | 类型 | 默认值 | 必填 | 说明 | 示例 |
| ---- | ------ | ------ | ------------- | -------- | ---------------------------------- | ------------------ |
| 1 | master | string | master | 否 | MPI master Task 名称 | --master=mpimaster |
| 2 | worker | string | worker | 否 | MPI worker Task 名称 | --worker=mpiworker |
| 3 | port | string | 22 | 否 | 为容器开放的端口 | --port=5000 |

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
