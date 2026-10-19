---
title: "PyTorch 插件用户指南"
---


## 简介

**PyTorch 插件**用于优化 PyTorch Job 的使用体验：既减少 YAML 编写量，又保障 PyTorch Job 正常运行。

## PyTorch 插件工作原理

PyTorch 插件会完成以下工作：

* 为 Job 中所有容器开放 PyTorch 使用的端口
* 强制启用 `svc` 插件
* 自动为容器添加 PyTorch 分布式训练所需的环境变量，如 `MASTER_ADDR`、`MASTER_PORT`、`WORLD_SIZE`、`RANK`
* 在 worker Pod 中添加 init 容器，等待 master 就绪后再启动（确保 master 先启动）

## PyTorch 插件参数

### 参数说明

| 编号 | 名称 | 类型 | 默认值 | 必填 | 说明 | 示例 |
| ---- | -------------------- | ------ | ------------------ | -------- | ------------------------------------------------------------------------------------ | -------------------------------------- |
| 1 | master | string | master | 否 | PyTorch master Task 名称 | --master=master |
| 2 | worker | string | worker | 否 | PyTorch worker Task 名称 | --worker=worker |
| 3 | port | int | 23456 | 否 | 为容器开放的端口 | --port=23456 |
| 4 | wait-master-enabled | bool | false | 否 | 启用 init 容器等待 master | --wait-master-enabled=true |
| 5 | wait-master-timeout | int | 300 | 否 | 等待 master 的超时时间（秒），仅当 wait-master-enabled=true 时生效 | --wait-master-timeout=600 |
| 6 | wait-master-image | string | busybox:1.36.1 | 否 | wait-for-master init 容器镜像，仅当 wait-master-enabled=true 时生效 | --wait-master-image=busybox:latest |

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
      "--wait-master-enabled=true",          # 启用 init 容器等待 master（可选，默认 false）
      "--wait-master-timeout=600",           # 超时时间（秒，可选，默认 300）
      "--wait-master-image=busybox:1.36.1"   # init 容器镜像（可选，默认 busybox:1.36.1）
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

* `wait-for-master` init 容器功能**默认关闭**，通过 `--wait-master-enabled=true` 启用。
* 启用后，worker Pod 会添加 init 容器，确保 master 就绪后再启动 worker。
* 默认 init 容器镜像为 `busybox:1.36.1`，可通过 `--wait-master-image` 自定义。
* worker 会等待 master 就绪，默认超时 300 秒（5 分钟）。
* 若超时内 master 未就绪，worker Pod 将失败并输出错误信息。
* init 容器通过多种回退方式检查 master 端口连通性：
  1. 若可用则使用 `nc -z`（netcat）
  2. 若可用则使用带 timeout 的 `/dev/tcp`
  3. 回退为直接 `/dev/tcp` 连接
* `--wait-master-timeout` 与 `--wait-master-image` **仅在** `--wait-master-enabled=true` 时生效。
* **镜像要求**：自定义镜像至少具备以下之一：
  * `nc`（netcat）命令（推荐，busybox、alpine 均提供）
  * shell 支持 `/dev/tcp`（bash/sh）
  * 推荐镜像：`busybox:1.36.1`、`alpine:latest`、`bash:latest`
* 自定义示例：
  * 启用功能：`--wait-master-enabled=true`
  * 自定义超时：`--wait-master-enabled=true --wait-master-timeout=600`（10 分钟）
  * 自定义镜像：`--wait-master-enabled=true --wait-master-image=busybox:latest`
