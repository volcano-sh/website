+++
title =  "pyTorch on volcano"

date = 2021-06-29
lastmod = 2021-06-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "pyTorch"
[menu.docs]
  parent = "zoology"
  weight = 10

+++



### PyTorch简介

**Torch**是一个有大量机器学习算法支持的科学计算框架，是一个与Numpy类似的张量（Tensor）操作库。**PyTorch**是一个基于Torch的Python开源机器学习库，用于自然语言处理等应用程序。但是对于PyTorch，通过**反向求导**技术，可以让你零延迟地任意改变神经网络的行为，而且其实现速度快。正是这一**灵活性**是PyTorch对比TensorFlow的最大优势。具有支持GPU、灵活，支持动态神经网络、底层代码易于理解、命令式体验和自定义扩展等诸多优点。

### 前提条件

PyTorch的工具集成在kubeflow中，所以确认环境中安装配置好了kubernetes、volcnao、kubeflow。安装部署kubeflow可以参考[1]。

### 安装pyTorch operator

1.默认条件下，pyTorch在kubeflow部署成功之后，已经被部署了。

2.确认kubeflow是否安装PyTorch custom resource。

```
# kubectl get crd
NAME                                             CREATED AT
...
pytorchjobs.kubeflow.org                         2021-09-06T18:33:58Z
...
```

3.检查Training operator是否成功运行。

```
# kubectl get pods -n kubeflow
NAME                                READY   STATUS    RESTARTS   AGE
training-operator-d466b46bc-xbqvs   1/1     Running   0          4m37s
```



### 创建PyTorch训练作业

1.创建PyTorch训练负载(将调度器的字段修改为volcano)

```
kubectl create -f https://raw.githubusercontent.com/kubeflow/tf-operator/master/examples/pytorch/simple.yaml
```

2.查看pod运行情况。

```
kubectl get pods -l job-name=pytorch-simple -n kubeflow
```



[1][安装kubeflow官方文档](https://www.kubeflow.org/docs/started/installing-kubeflow/)

[2][pytorch on kubeflow](https://www.kubeflow.org/docs/components/training/pytorch/)
