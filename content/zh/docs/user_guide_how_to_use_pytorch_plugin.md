+++
title = "Pytorch 插件用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_pytorch_plugin/"
[menu.docs]
  parent = "user-guide"
+++

## 介绍

**Pytorch 插件** 用于优化在 Volcano 上运行 Pytorch 分布式训练作业时的体验，既可以减少 YAML 配置量，又可以确保 Pytorch 作业的正确运行。

## Pytorch 插件的工作机制

Pytorch 插件会执行以下操作：

* 为作业中的所有容器打开 Pytorch 所需的端口；
* 强制开启 `svc` 插件；
* 自动为容器注入 Pytorch 分布式训练所需的环境变量，例如 `MASTER_ADDR`、`MASTER_PORT`、`WORLD_SIZE`、`RANK` 等；
* 在 worker Pod 中添加一个 init 容器，在 master 节点就绪之前阻塞 worker 启动（保证 master 先启动）。

## Pytorch 插件参数

### 参数列表

| ID | 名称                 | 类型   | 默认值           | 必须 | 描述                                                                                       | 示例                                      |
|----|----------------------|--------|------------------|------|--------------------------------------------------------------------------------------------|-------------------------------------------|
| 1  | master               | string | master           | 否   | Pytorch master 对应的 Task 名                                                              | `--master=master`                         |
| 2  | worker               | string | worker           | 否   | Pytorch worker 对应的 Task 名                                                              | `--worker=worker`                         |
| 3  | port                 | int    | 23456            | 否   | 容器中开放的端口                                                                           | `--port=23456`                            |
| 4  | wait-master-enabled  | bool   | false            | 否   | 是否启用等待 master 的 init 容器                                                           | `--wait-master-enabled=true`              |
| 5  | wait-master-timeout  | int    | 300              | 否   | 等待 master 的超时时间（秒），仅在启用 wait-master 时生效                                  | `--wait-master-timeout=600`               |
| 6  | wait-master-image    | string | busybox:1.36.1   | 否   | wait‑for‑master init 容器镜像，仅在启用 wait-master 时生效                                 | `--wait-master-image=busybox:latest`      |

## 示例

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: pytorch-job
spec:
  minAvailable: 1
  schedulerName: volcano
  plugins:
    pytorch: [
      "--master=master",
      "--worker=worker",
      "--port=23456",
      "--wait-master-enabled=true",          # 启用等待 master 的 init 容器（可选，默认：false）
      "--wait-master-timeout=600",           # 等待超时时间（秒，可选，默认：300）
      "--wait-master-image=busybox:1.36.1"   # init 容器镜像（可选，默认：busybox:1.36.1）
    ]
  tasks:
    - replicas: 1
      name: master
      policies:
        - event: TaskCompleted
          action: CompleteJob
      template:
        spec:
          containers:
            - image: gcr.io/kubeflow-ci/pytorch-dist-sendrecv-test:1.0
              imagePullPolicy: IfNotPresent
              name: master
          restartPolicy: OnFailure
    - replicas: 2
      name: worker
      template:
        spec:
          containers:
            - image: gcr.io/kubeflow-ci/pytorch-dist-sendrecv-test:1.0
              imagePullPolicy: IfNotPresent
              name: worker
              workingDir: /home
          restartPolicy: OnFailure
```

## 说明

* `wait-for-master` init 容器特性默认 **关闭**，通过 `--wait-master-enabled=true` 启用；
* 启用后会在 worker Pod 中添加一个 init 容器，用于在 master 就绪前阻塞 worker 启动；
* 默认 init 容器镜像为 `busybox:1.36.1`，可通过 `--wait-master-image` 自定义；
* worker 会在可配置的超时时间内等待 master（默认 300 秒）；若在超时时间内 master 仍未就绪，worker Pod 会失败并输出错误信息；
* init 容器会通过多种方式探测 master 端口连通性：
  1. 若存在 `nc -z`（netcat），优先使用；
  2. 若支持 `/dev/tcp` 与 `timeout` 命令，使用其作为备选方式；
  3. 最后回退为直接使用 `/dev/tcp` 建立连接。
* 仅当 `--wait-master-enabled=true` 时，`--wait-master-timeout` 与 `--wait-master-image` 参数才会生效。
* 自定义镜像应至少包含：
  - `nc` 命令（推荐，busybox / alpine 中默认为可用）；或
  - Shell 对 `/dev/tcp` 的支持（bash/sh）。

推荐镜像示例：`busybox:1.36.1`、`alpine:latest`、`bash:latest`。

