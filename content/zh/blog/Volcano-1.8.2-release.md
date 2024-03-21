+++
title =  "Volcano v1.8.2正式发布"
description = "新增特性：支持vGPU调度及隔离、支持vGPU和用户自定义资源的抢占能力、新增JobFlow工作流编排引擎、节点负载感知调度与重调度支持多样化的监控系统、优化Volcano对通用服务调度的能力、优化Volcano charts包的发布与归档等"
subtitle = ""

date = 2024-01-31
lastmod = 2024-01-31
datemonth = "Jan"
dateyear = "2024"
dateday = 31

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["volcano"]

tags = ["Practice"]
summary = "新增特性：支持vGPU调度及隔离、支持vGPU和用户自定义资源的抢占能力、新增JobFlow工作流编排引擎、节点负载感知调度与重调度支持多样化的监控系统、优化Volcano对通用服务调度的能力、优化Volcano charts包的发布与归档等"

# Add menu entry to sidebar.
linktitle = "Volcano v1.8.2正式发布"
[menu.posts]
parent = "tutorials"
weight = 6
+++


北京时间2024年1月9日，Volcano 社区 v1.8.2 版本正式发布，此次版本增加了以下新特性：

- **支持vGPU调度及隔离**

- **支持vGPU和用户自定义资源的抢占能力**

- **新增JobFlow工作流编排引擎**

- **节点负载感知调度与重调度支持多样化的监控系统**

- **优化Volcano对通用服务调度的能力**

- **优化Volcano charts包的发布与归档**

{{<figure library="1" src="volcano_logo.png" width="50%">}}
Volcano是业界首个云原生批量计算项目，于2019年6月在上海 KubeCon 正式开源，并在2020年4月成为 CNCF 官方项目。2022年4月，Volcano 正式晋级为CNCF 孵化项目。Volcano 社区开源以来，受到众多开发者、合作伙伴和用户的认可和支持。截至目前，累计有600+全球开发者参与社区贡献。

### Volcano v1.8.2 关键特性介绍

#### 支持vGPU调度及隔离
自 ChatGPT 爆火之后，AI大模型的研发层出不穷，不同种类的AI大模型也相继推出，由于其庞大的训练任务需要大量算力，以 GPU 为核心的算力供给已成为大模型产业发展的关键基础设施。在实际使用场景中，用户对于 GPU 资源的使用存在资源利用率低，资源分配不灵活等痛点问题，必须采购大量冗余的异构算力才能满足业务需求，而异构算力本身成本高昂，为企业的发展带来了很大的负担。
从 1.8版本开始，Volcano 为可共享设备（GPU、NPU、FPGA...）提供一个抽象的通用框架，开发者可以基于该框架自定义多种类型的共享设备；当前，Volcano 已基于该框架实现 GPU 虚拟化特性，支持 GPU 设备复用、资源隔离等能力，详情如下：

- GPU共享：每个任务可以申请使用一个 GPU 卡的部分资源，GPU 卡可以在多个任务之间共享。

- 设备显存控制：GPU 可以按照设备显存分配（比如：3000M）或者按比例分配（比如：50%），实现 GPU 虚拟化资源隔离能力。

关于 vGPU 的更多信息，请参考：

- 如何使用 vGPU 功能：

    https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_vgpu.md

- 如何增加新的异构算力共享策略：

    https://github.com/volcano-sh/volcano/blob/master/docs/design/device-sharing.md

#### 支持vGPU和用户自定义资源的抢占能力
当前 Volcano 支持 CPU、Memory 等基础资源抢占功能，对于 GPU 资源和用户基于 Volcano 框架二次开发调度插件，并自主管理的资源（如：NPU、网络资源等）尚不能很好的支持抢占能力。
在1.8版本中，Volcano 对节点过滤相关处理（ PredicateFn 回调函数）进行重构，返回结果中增加 Status 类型，用于标识在调度、抢占等场景下，当前节点是否满足作业下发条件。GPU 抢占功能已基于优化后的框架实现发布，用户基于Volcano 进行二次开发的调度插件可以结合业务场景适配升级。
在1.8.2版本中，Volcano支持节点CSI挂盘数量和节点Pods数量的抢占。

关于支持扩展资源抢占的更多信息，请参考：

https://github.com/volcano-sh/volcano/pull/2916

#### 新增JobFlow工作流编排引擎
工作流编排引擎广泛应用于高性能计算、AI 生物医药、图片处理、美颜、游戏AGI、科学计算等场景，帮助用户简化多个任务并行与依赖关系的管理，大幅度提升整体计算效率。
JobFlow 是一种轻量化的任务流编排引擎，专注于 Volcano 的作业编排，为Volcano 提供作业探针、作业完成依赖，作业失败率容忍等多样化作业依赖类型，并支持复杂的流程控制原语，具体能力如下：

- 支持大规模作业管理以及复杂任务流编排

- 支持实时查询到所有关联作业的运行情况以及任务进度

- 支持作业自动运行、定时启动释放人力成本

- 支持不同任务可以设置多种动作策略，当任务满足特定条件时即可触发对应动作，如超时重试、节点故障漂移等

JobFlow 任务运行演示如下：

<center> {{<figure library="1" src="./v1.8.2/jobflow.gif">}}</center>

关于 JobFlow 的更多信息，请参考：

https://github.com/volcano-sh/volcano/blob/master/docs/design/jobflow/README.md

#### 节点负载感知调度与重调度支持多样化的监控系统
Kubernetes 集群状态随着任务的创建和结束实时变化，在某些场景（如：增加、删除节点，Pod、Node 的亲和性改变，作业生命周期动态变化等），出现集群节点间资源利用率不均衡，节点性能瓶颈掉线等问题，此时基于真实负载的调度与重调度可以帮助我们解决上述问题。
Volcano 1.8版本之前，真实负载调度与重调度的指标获取仅支持 Prometheus，从1.8版本开始，Volcano 优化监控指标获取框架，新增 ElasticSearch 监控系统支持，并支持以较小适配工作量平滑对接更多类型监控系统。

关于支持多种监控系统的更多信息，请参考：

- 基于节点负载感知调度：

    https://github.com/volcano-sh/volcano/blob/master/docs/design/usage-based-scheduling.md

- 重调度：

    https://github.com/volcano-sh/volcano/blob/master/docs/design/rescheduling.md

#### 优化Volcano对微服务调度的能力

##### 增加Kubernetes默认调度器插件开关
Volcano 是一个统一的融合调度系统，不仅支持 AI、BigData 等计算类作业，也支持微服务工作负载，兼容 Kubernetes 默认调度器的 PodTopologySpread、VolumeZone、VolumeLimits、NodeAffinity、PodAffinity等调度插件，Kubernetes 默认调度插件能力在 Volcano 中默认开启。
自 Volcano 1.8 版本开始，Kubernetes 默认调度插件可以通过配置文件的方式自由选择打开和关闭，默认全部打开，如果选择关闭部分插件，比如：关闭PodTopologySpread 和 VolumeZone插件，可以在 predicate 插件中将对应的值设置为 false，配置如下：

```yaml
actions: "allocate, backfill, preempt"
tiers:
- plugins:
    - name: priority
    - name: gang
    - name: conformance
- plugins:
    - name: drf
    - name: predicates
      arguments:
      predicate.VolumeZoneEnable: false
      predicate.PodTopologySpreadEnable: false
    - name: proportion
    - name: nodeorder
```

更多信息，请参考：

https://github.com/volcano-sh/volcano/issues/2748

##### 增强ClusterAutoscaler兼容性
在 Kubernetes 平台中，Volcano 除了作为批量计算业务的调度器之外，也被越来越多的用作通用服务的调度器。Node 水平伸缩（ClusterAutoscaler）是Kubernetes 的核心功能之一，在面对用户业务量激增和节省运行成本方面发挥重要作用。Volcano 优化作业调度等相关逻辑，增强与 ClusterAutoscaler 的兼容互动能力，主要为以下两个方面：
调度阶段进入 pipeline 状态的 pod 及时触发扩容
候选节点分梯度打分，减少集群 terminating pod 对调度负载的影响，避免pod 进入无效 pipeline 状态，从而导致集群误扩容

更多信息，请参考：

https://github.com/volcano-sh/volcano/issues/3000
https://github.com/volcano-sh/volcano/issues/2782

##### 精细化管理Node资源，增强韧性
当节点中由于某种原因比如 device-plugin 上报信息异常，出现节点的某种资源总量小于已分配资源量时，Volcano 认为该节点数据不一致，会隔离节点，停止向该节点调度任何新的工作负载。在1.8版本中，对于节点资源进行精细化管理，比如：当节点的 GPU 总资源容量小于已分配资源量时，申请 GPU 资源的 pod 禁止再调度至该节点，申请非 GPU 资源的作业，将仍然允许正常向该节点调度。

更多信息，请参考：

https://github.com/volcano-sh/volcano/issues/2999

#### 优化Volcano charts包的发布与归档
随着 Volcano 在用户越来越多的生产环境和云环境中使用，简洁标准的安装动作至关重要。自1.8版本开始，Volcano 优化 charts 包发布归档动作，标准化安装使用流程，并完成历史版本（v1.6、v1.7）向新 helm 仓库的迁移，使用方式如下：

- 添加 Volcano charts 仓地址
```shell
helm repo add volcano-sh https://volcano-sh.github.io/helm-charts
```

- 查询所有可安装的 Volcano 版本
```shell
helm search repo volcano -l
```

- 安装最新版 Volcano
```shell
helm install volcano volcano-sh/volcano -n volcano-system --create-namespace
```

- 安装指定版本 Volcano，比如：1.8.2
```shell
helm install volcano volcano-sh/volcano -n volcano-system --create-namespace --version 1.8.2
```


关于 Volcano charts 包的更多信息，请参考：

https://github.com/volcano-sh/helm-charts

### 致谢贡献者

Volcano 1.8.2 版本包含了来自 33 位贡献者的数百次代码提交，在此对各位贡献者表示由衷的感谢：

**贡献者 GitHub ID：**<br>
<table>
  <tr>
    <td>@shaobo76</td>
    <td>@william-wang</td>
    <td>@gengwg</td>
  </tr>
  <tr>
    <td>@kingeasternsun</td>
    <td>@Aakcht</td>
    <td>@waiterQ</td>
  </tr>
  <tr>
    <td>@Shoothzj</td>
    <td>@hwdef</td>
    <td>@halegreen</td>
  </tr>
  <tr>
    <td>@wulixuan</td>
    <td>@Monokaix</td>
    <td>@medicharlachiranjeevi</td>
  </tr>
  <tr>
    <td>@WulixuanS</td>
    <td>@rayoluo</td>
    <td>@lowang-bh</td>
  </tr>
  <tr>
    <td>@gj199575</td>
    <td>@noyoshi</td>
    <td>@Tongruizhe</td>
  </tr>
  <tr>
    <td>@jinzhejz</td>
    <td>@Cdayz</td>
    <td>@Mufengzhe</td>
  </tr>
  <tr>
    <td>@renwenlong-github</td>
    <td>@wangyang0616</td>
    <td>@jiamin13579</td>
  </tr>
  <tr>
    <td>@zbbkeepgoing</td>
    <td>@jiangkaihua</td>
    <td>@z2Zhang</td>
  </tr>
  <tr>
    <td>@archlitchi</td>
    <td>@lixin963</td>
    <td>@xiao-jay</td>
  </tr>
  <tr>
    <td>@Yanping-io</td>
    <td>@Lily922</td>
    <td>@shusley244</td>
  </tr>
</table>    

**参考链接**

Release note: v1.8.0

https://github.com/volcano-sh/volcano/releases/tag/v1.8.0

Release note: v1.8.1

https://github.com/volcano-sh/volcano/releases/tag/v1.8.1

Release note: v1.8.2

https://github.com/volcano-sh/volcano/releases/tag/v1.8.2

Branch：release-1.8

https://github.com/volcano-sh/volcano/tree/release-1.8

### 深入了解Volcano

Volcano 云原生批量计算项目主要用于 AI、大数据、基因、渲染等诸多高性能计算场景，对主流通用计算框架均有很好的支持。社区已吸引5.8万+全球开发者，并获得3.5k+ Star 和800+ Fork，参与贡献企业包括华为、AWS、百度、腾讯、京东、小红书、博云、第四范式等。目前，Volcano在人工智能、大数据、基因测序等海量数据计算和分析场景已得到快速应用，已完成对 Spark、Flink、Tensorflow、PyTorch、Argo、MindSpore、Paddlepaddle 、Kubeflow、MPI、Horovod、mxnet、KubeGene、Ray 等众多主流计算框架的支持，并构建起完善的上下游生态。