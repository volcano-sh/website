+++
title =  "Pytorch on Volcano"

date = 2021-06-29
lastmod = 2021-06-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Pytorch"
[menu.docs]
  parent = "zoology"
  weight = 6

+++

### PyTorch简介

PyTorch 是一个开源的机器学习框架，由 Facebook（现 Meta）AI 研究团队开发。它以其动态计算图和直观的 Python 接口而闻名，使研究人员和开发者能够更灵活地构建和训练深度学习模型。PyTorch 提供了强大的 GPU 加速功能，支持分布式训练，并拥有丰富的工具生态系统，

### PyTorch on volcano

Volcano 对 pytorch的支持通过PyTorch 插件实现，它不仅允许用户编写更少的 YAML 配置，还能确保 PyTorch 作业的正常运行。

PyTorch 插件将完成三项任务：

- 为作业的所有容器开放 PyTorch 使用的端口
- 强制启用 `svc` 插件
- 自动为容器添加 PyTorch 分布式训练所需的环境变量，如 `MASTER_ADDR`、`MASTER_PORT`、`WORLD_SIZE`、`RANK` 等

#### 参数列表

| 序号 | 名称   | 类型   | 默认值 | 是否必需 | 描述                   | 示例            |
| ---- | ------ | ------ | ------ | -------- | ---------------------- | --------------- |
| 1    | master | 字符串 | master | 否       | PyTorch 主节点的名称   | --master=master |
| 2    | worker | 字符串 | worker | 否       | PyTorch 工作节点的名称 | --worker=worker |
| 3    | port   | 字符串 | 23456  | 否       | 为容器开放的端口       | --port=23456    |

#### 示例

```yaml
yamlapiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: pytorch-job
spec:
  minAvailable: 1
  schedulerName: volcano
  plugins:
    pytorch: ["--master=master","--worker=worker","--port=23456"] # PyTorch 插件注册
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
