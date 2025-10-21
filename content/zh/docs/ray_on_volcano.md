+++
title =  "Ray on Volcano"

date = 2025-07-20
lastmod = 2025-07-20

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Ray"
[menu.docs]
  parent = "zoology"
  weight = 6

+++

### Ray简介

如今，机器学习工作负载的计算密集度日益提升。单节点开发环境（例如笔记本电脑）虽然便捷，但无法扩展以满足这些需求。

Ray 是一种将 Python 和 AI 应用程序从笔记本电脑扩展到集群的统一方法。

使用 Ray，您可以将同一段代码从笔记本电脑无缝扩展到集群。Ray 的设计目标是通用，这意味着它可以高效地运行任何类型的工作负载。如果您的应用程序是用 Python 编写的，您可以使用 Ray 进行扩展，无需其他基础架构。

KubeRay 是一个功能强大的开源 Kubernetes 运维工具，可简化Ray应用程序在 Kubernetes 上的部署和管理。

### Ray on volcano

KubeRay 的 Volcano 集成能够在多租户 Kubernetes 环境中更高效地调度 Ray Pod。

#### 安装 KubeRay Operator

部署 KubeRay Operator 并启用 Volcano 批量调度支持，您可以通过以下两种方式实现：

##### 方式一：使用 values.yaml 配置文件

在 values.yaml 文件中设置 Volcano 作为批量调度器：

```yaml
yaml# values.yaml 文件
batchScheduler:
  name: volcano
```

然后使用此配置文件安装 Helm chart：

```bash
bashhelm install kuberay-operator kuberay/kuberay-operator --version 1.4.2 -f values.yaml
```

##### 方式二：使用命令行参数

直接在 Helm 安装命令中通过 --set 参数指定批量调度器：

```bash
bashhelm install kuberay-operator kuberay/kuberay-operator --version 1.4.2 --set batchScheduler.name=volcano
```

#### 安装 RayCluster 并配置 Volcano 调度

要使用 Volcano 调度器管理 RayCluster，请按照以下步骤操作：

##### 基本安装

1. 下载支持 Volcano 调度的 RayCluster 示例配置：

   ```bash
   bashcurl -LO https://raw.githubusercontent.com/ray-project/kuberay/v1.4.2/ray-operator/config/samples/ray-cluster.volcano-scheduler.yaml
   ```

2. 应用配置创建 RayCluster：

   ```bash
   bashkubectl apply -f ray-cluster.volcano-scheduler.yaml
   ```

3. 验证集群状态：

   ```bash
   bashkubectl get pod -l ray.io/cluster=test-cluster-0
   ```

   成功部署后应显示如下输出：

   ```
   NAME                       READY   STATUS    RESTARTS   AGE
   test-cluster-0-head-jj9bg  1/1     Running   0          36s
   ```

接下来即可使用 Volcano 和 KubeRay 协同工作。如果要查看详细信息，请查看[链接](https://docs.ray.io/en/master/cluster/kubernetes/k8s-ecosystem/volcano.html)了解更多。

#### 
