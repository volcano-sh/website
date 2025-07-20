+++
title =  "MXNet on Volcano"

date = 2025-07-20
lastmod = 2025-07-20

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "MXNet"
[menu.docs]
  parent = "zoology"
  weight = 3

+++





### MXNet简介

MXNet是一个开源的深度学习框架，它设计用于高效且灵活地训练和部署深度神经网络，支持从单GPU到多GPU，再到分布式多机多GPU的无缝扩展。

### MXNet on volcano

将MXNet与Volcano结合使用，可以充分利用Kubernetes的容器编排能力和Volcano的批处理调度功能，实现高效的分布式训练。

点击[这里](https://github.com/apache/mxnet/blob/master/example/distributed_training-horovod/gluon_mnist.py)查看MXNet 团队给出的示例。该目录包含以下文件：

- Dockerfile：构建独立工作器镜像。
- Makefile：用于构建上述图像。
- train-mnist-cpu.yaml：Volcano Job 规范。

要运行示例，请编辑`train-mnist-cpu.yaml`镜像的名称和版本。然后运行

```
kubectl apply -f train-mnist-cpu.yaml -n ${NAMESPACE}
```

来创造Job。

然后使用

```
kubectl -n ${NAMESPACE} describe job.batch.volcano.sh mxnet-job
```

查看状态。

