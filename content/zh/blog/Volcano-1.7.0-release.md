+++
title =  "Volcano v1.7.0正式发布"
description = "新增特性：Pytorch Job强化插件功能、Ray on Volcano、增强Volcano对Kubernetes通用服务的调度能力、支持Volcano的多架构镜像、优化队列状态信息等"
subtitle = ""

date = 2023-01-12
lastmod = 2023-01-12
datemonth = "Jan"
dateyear = "2023"
dateday = 12

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["volcano"]

tags = ["Practice"]
summary = "新增特性：Pytorch Job强化插件功能、Ray on Volcano、增强Volcano对Kubernetes通用服务的调度能力、支持Volcano的多架构镜像、优化队列状态信息等"

# Add menu entry to sidebar.
linktitle = "Volcano v1.7.0正式发布"
[menu.posts]
parent = "tutorials"
weight = 6
+++

<p></p>
北京时间2023年1月9日，Volcano社区v1.7.0版本正式发布。此次版本增加了以下新特性：

- **Pytorch Job强化功能插件**
- **Ray on Volcano**
- **增强Volcano对Kubernetes通用服务的调度能力**
- **支持Volcano的多架构镜像**
- **优化队列状态信息等**

{{<figure library="1" src="volcano_logo.png" width="50%">}}
Volcano是业界首个云原生批量计算项目，于2019年6月在上海KubeCon正式开源，并在2020年4月成为CNCF官方项目。2022年4月，Volcano正式晋级为CNCF孵化项目。Volcano社区开源以来，受到众多开发者、合作伙伴和用户的认可和支持。截止目前，累计有490+全球开发者向项目贡献了代码。

### Volcano v1.7.0 关键特性介绍

#### 1. Pytorch Job 强化功能插件
Pytorch是当下最流行的AI框架之一，已被广泛应用于计算机视觉，自然语言处理等深度学习领域，并且已有越来越多的用户开始以容器化的方式在Kubernetes上运行Pytorch来获得更高资源利用率和并行效率。

本次1.7版本提供了Pytorch Job强化功能插件，免去了容器端口、MASTER_ADDR、MASTER_PORT、WORLD_SIZE、RANK环境变量等众多繁琐的手动配置环节，让用户可以用极简的方式在Volcano上运行Pytorch Job。

Volcano社区当前提供了TensorFlow、MPI和Pytorch等Job强化功能插件，帮助用户更简洁高效的运行对应的训练框架和计算作业。

此外，Volcano还提供了Job插件的扩展开发框架，满足高阶用户针对复杂场景定制Job插件的需求。


设计文档：[Pytorch-plugin](https://github.com/volcano-sh/volcano/blob/master/docs/design/distributed-framework-plugins.md#pytorch-plugin)<br>
用户手册：[Pytorch-plugin-user-guide](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_pytorch_plugin.md#pytorch-plugin-user-guide)<br>
Issue：[#2292](https://github.com/volcano-sh/volcano/issues/2292)<br>


#### 2. Ray on Volcano
Ray 是一个用于扩展 AI 和 Python 应用程序的统一框架，可以在任何机器、集群、云提供商和 Kubernetes 上运行，并具有不断发展完善的社区生态。

当前，机器学习工作负载的计算密集度越来越高，单节点开发环境已无法满足训练任务在资源上的需求，Ray可以将同一套代码从单机运行无缝扩展到集群中运行。Ray是面向通用场景进行的设计，可以高效运行任何类型的工作负载。

该特性实现Volcano和Ray的协同工作，使用Volcano为Ray提供批量调度功能。目前该特性已在[KubeRay v0.4](https://github.com/ray-project/kuberay/releases/tag/v0.4.0)版本正式发布。

用户手册：[KubeRay-integration-with-Volcano](https://ray-project.github.io/kuberay/guidance/volcano-integration/#kuberay-integration-with-volcano)<br>
Issue：[#2429](https://github.com/volcano-sh/volcano/issues/2429)，  [#213](https://github.com/ray-project/kuberay/issues/213)<br>

#### 3. 增强Volcano对Kubernetes通用服务的调度能力
在不同的业务场景下，调度器发挥的价值与能力各有不同。比如，在批量计算场景中，Volcano的调度策略和能力更为丰富；通用服务调度场景中，Kubernetes默认调度器的能力更为均衡。但用户的集群中通常不会只运行一种类型的任务，在既有批量计算任务运行，又需要调度通用服务的场景下，如何兼顾不同类型任务的调度是一项值得研究的工作。

从1.7版本开始，Volcano提供对Kubernetes 默认调度器完全兼容的能力，可用于调度管理长期运行的服务。通过本次功能强化，用户可以使用 Volcano 统一调度长时间运行的服务和批处理工作负载。

**重点增强项如下：**
<ul>
    <li>Volcano的 scheduler 和 webhook 支持多调度器</li>
    <li>支持 NodeVolumeLimits 插件</li>
    <li>支持 VolumeZone 插件</li>
    <li>支持 PodTopologySpread 插件</li>
    <li>支持 SelectorSpread插件</li>
</ul>

另外，本次版本将对Kubernetes的支持升级到了v1.25。

Issue： [#2394](https://github.com/volcano-sh/volcano/issues/2394)，[#2510](https://github.com/volcano-sh/volcano/issues/2510)

#### 4. 支持Volcano的多架构镜像
该特性通过交叉编译实现一键化编译Volcano多架构镜像功能，比如，可以在amd64架构机器上，一键化编译amd64和arm64架构的Volcano基础镜像，并上传至镜像仓库。用户安装部署时，会根据自身环境中机器架构自动选择合适的镜像运行，对开发者和用户更友好。

使用手册：[building-docker-images](https://github.com/volcano-sh/volcano/blob/master/docs/development/development.md#building-docker-images)<br>
Issue：[#2435](https://github.com/volcano-sh/volcano/pull/2435)<br>

#### 5. 优化队列状态信息
该特性在队列状态信息中增加已分配资源实时统计功能，通过该功能，用户可以实时查看队列的资源分配情况，方便管理员动态规划资源，使集群资源得到最大化利用。

Volcano通过队列的方式对集群资源进行分配管理，使用Capability字段来限制每个队列的资源上限，这是我们进行队列资源分配的硬约束。

当前，在集群运行过程中，用户无法清楚的了解到队列中已分配资源和Capability中空闲资源的详细信息，有可能会在队列空闲资源不足时提交大量工作负载，导致作业挂起和autoScaler非预期的触发集群扩容，从而增加云资源的使用成本。通过该特性中新增加的状态信息，用户可以更清晰有效的管理集群资源，控制使用成本。

Issue：[#2571](https://github.com/volcano-sh/volcano/issues/2571)

### 致谢贡献者
Volcano v1.7.0 版本包含了来自29位贡献者的数百次代码提交，在此对各位贡献者表示由衷的感谢：

**贡献者 GitHub ID：**<br>
<table>
  <tr>
    <td>@xiaoxubeii</td>
    <td>@jsolbrig</td>
    <td>@Yikun</td>
  </tr>
  <tr>
    <td>@tgaddair</td>
    <td>@william-wang</td>
    <td>@elinx</td>
  </tr>
  <tr>
    <td>@Abirdcfly</td>
    <td>@xiaoanyunfei</td>
    <td>@qiankunli</td>
  </tr>
  <tr>
    <td>@wpeng102</td>
    <td>@waiterQ</td>
    <td>@hwdef</td>
  </tr>
  <tr>
    <td>@WingkaiHo</td>
    <td>@Monokaix</td>
    <td>@kerthcet</td>
  </tr>
  <tr>
    <td>@WulixuanS</td>
    <td>@autumn0207</td>
    <td>@jinzhejz</td>
  </tr>
  <tr>
    <td>@lucming</td>
    <td>@jimoosciuc</td>
    <td>@LY-today</td>
  </tr>
  <tr>
    <td>@dontan001</td>
    <td>@wangyang0616</td>
    <td>@Akiqqqqqqq</td>
  </tr>
  <tr>
    <td>@zhoumingcheng</td>
    <td>@jiangkaihua</td>
    <td>@Thor-wl</td>
  </tr>
  <tr>
    <td>@ccchenjiahuan</td>
    <td>@zhifanggao</td>
    <td>&nbsp;</td>
  </tr>
</table>                              

#### 相关链接
Release note：[v1.7.0](https://github.com/volcano-sh/volcano/releases/tag/v1.7.0)<br>
Branch：[release-1.7](https://github.com/volcano-sh/volcano/tree/release-1.7)<br>

### 深入了解Volcano
Volcano云原生批量计算项目主要用于 AI、大数据、基因、渲染等诸多高性能计算场景，对主流通用计算框架均有很好的支持。社区已吸引2.6万+全球开发者，并获得2.8k Star和670+ Fork，参与贡献企业包括华为、AWS、百度、腾讯、京东、小红书等。目前，Volcano在人工智能、大数据、基因测序等海量数据计算和分析场景已得到快速应用，已完成对Spark、Flink、Tensorflow、PyTorch、Argo、MindSpore、Paddlepaddle 、Kubeflow、MPI、Horovod、mxnet、KubeGene、Ray等众多主流计算框架的支持，并构建起完善的上下游生态。