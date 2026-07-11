---
title: Pytorch
---


## 介绍

**Pytorch插件**旨在优化运行Pytorch作业时的用户体验，它不仅可以让用户编写更少的yaml，还可以保证Pytorch作业的正常运行。

## Pytorch 插件的工作原理

Pytorch 插件将执行以下操作：

* 打开 Pytorch 为作业的所有容器使用的端口
* 强制打开 `svc` 插件
* 添加一些环境，例如`MASTER_ADDR`，`MASTER_PORT`，`WORLD_SIZE`，`RANK`，pytorch自动将所需的训练分发到容器
* 在worker pods中添加一个init容器，以等待master节点准备好后再启动（确保master先启动）

## Pytorch插件参数

### 参数

| ID   | 名称                 | 类型   | 默认值      | 是否必填 | 描述                                                                          | 示例                                |
| ---- | -------------------- | ------ | ------------------ | -------- | ------------------------------------------------------------------------------------ | -------------------------------------- |
| 1    | master               | string | master             | 否       | Pytorch 主节点名称 | --master=master                        |
| 2    | worker               | string | worker             | 否       | Pytorch 工作节点名称 | --worker=worker                        |
| 3    | port                 | int    | 23456              | 否       | 为容器打开的端口 | --port=23456                           |
| 4    | wait-master-enabled  | bool   | false              | 否       | 启用 init 容器以等待主节点 | --wait-master-enabled=true             |
| 5    | wait-master-timeout  | int    | 300                | 否       | 等待主节点的超时时间（秒，仅在 wait-master-enabled=true 时有效） | --wait-master-timeout=600              |
| 6    | wait-master-image    | string | busybox:1.36.1     | 否       | 用于等待主节点的 init 容器镜像（仅在 wait-master-enabled=true 时有效） | --wait-master-image=busybox:latest  |

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
      "--wait-master-enabled=true",          # Enable init container to wait for master (optional, default: false)
      "--wait-master-timeout=600",           # Timeout in seconds (optional, default: 300)
      "--wait-master-image=busybox:1.36.1"   # Init container image (optional, default: busybox:1.36.1)
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

## 笔记

* “wait-for-master”初始化容器功能**默认禁用**。通过设置 `--wait-master-enabled=true` 来启用它
* 启用后，一个 init 容器将被添加到worker pod中，以确保master在启动worker之前准备就绪
* 默认初始化容器镜像为 `busybox:1.36.1`，可以通过 `--wait-master-image` 自定义
* Workers 将等待 master 准备好，超时时间可配置（默认 300 秒/5 分钟）
* 如果 master 在超时时间内没有准备好，worker pod 将失败并显示错误消息
* init容器使用多种后备方法检查master的端口连接：
  1. `nc -z` (netcat) 如果可用
  2. `/dev/tcp` 带有超时命令（如果可用）
  3. `/dev/tcp` 直接连接作为后备
* **注意**：参数`--wait-master-timeout`和`--wait-master-image`仅在`--wait-master-enabled=true`时有效
* **图像要求**：自定义图像应至少具有以下之一：
  * `nc` (netcat) 命令 - 推荐，在 busybox、alpine 中可用
  * shell 中的 `/dev/tcp` 支持 - 在 bash/sh 中可用
  * 推荐镜像：`busybox:1.36.1`、`alpine:latest`、`bash:latest`
* 定制示例：
  * 启用功能：`--wait-master-enabled=true`
  * 自定义超时：`--wait-master-enabled=true --wait-master-timeout=600`（10 分钟）
  * 自定义镜像： `--wait-master-enabled=true --wait-master-image=busybox:latest`