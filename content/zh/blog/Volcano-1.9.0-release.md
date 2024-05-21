+++
title =  "Volcano v1.9.0正式发布"
description = "新增特性：支持弹性队列容量capacity调度、支持队列与节点间的亲和调度、Volcano支持Kubernetes v1.29、GPU共享支持节点打分调度、增强scheduler metrics指标、新增License合规性检查、提升调度稳定性等"
subtitle = ""

date = 2024-05-21
lastmod = 2024-05-21
datemonth = "May"
dateyear = "2024"
dateday = 21

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["volcano"]

tags = ["Practice"]
summary = "新增特性：支持弹性队列容量capacity调度、支持队列与节点间的亲和调度、Volcano支持Kubernetes v1.29、GPU共享支持节点打分调度、增强scheduler metrics指标、新增License合规性检查、提升调度稳定性等"

# Add menu entry to sidebar.
linktitle = "Volcano v1.9.0正式发布"
[menu.posts]
parent = "tutorials"
weight = 6
+++


北京时间2024年5月21日，Volcano 社区 v1.9.0 版本正式发布，此次版本增加了以下新特性：
- **支持弹性队列容量capacity调度**

- **支持队列与节点间的亲和调度**

- **Volcano支持Kubernetes v1.29**

- **GPU共享支持节点打分调度**

- **增强scheduler metrics指标**

- **新增License合规性检查**

- **提升调度稳定性**

{{<figure library="1" src="volcano_logo.png" width="50%">}}
Volcano是业界首个云原生批量计算项目，于2019年6月在上海 KubeCon 正式开源，并在2020年4月成为 CNCF 官方项目。2022年4月，Volcano 正式晋级为CNCF 孵化项目。Volcano 社区开源以来，受到众多开发者、合作伙伴和用户的认可和支持。截至目前，累计有600+全球开发者参与社区贡献。

### Volcano v1.9.0 关键特性介绍

#### 支持弹性队列容量capacity调度

Volcano现在使用proportion插件来进行队列管理，用户可以设置队列的guarantee、capability等字段来设置队列的预留资源和容量上限。并通过设置队列的weight值来实现集群内的资源共享，队列按照weight值按比例划分集群资源，但这种队列管理方式存在以下问题：

- 队列划分的资源容量通过权重体现，不够直观。
- 队列内的所有资源使用相同的比例进行划分，不能为队列的每一维资源单独设置容量。

基于以上考虑，Volcano实现了新的队列弹性容量管理能力，它支持：

- 用户可以直接为队列设置每一维度资源的容量，而不是设置weigh值来实现。
- 基于deserved的队列弹性容量调度，支持队列的资源共享和回收。

比如在AI大模型训练中分别为队列中不同的GPU型号如A100和V100，设置不同的资源容量。同时在集群资源空闲时，队列可以复用其他空闲队列的资源，并在需要时进行资源回收，直到回收到用户为队列设置的资源容量为止，即应得资源量deserved，从而实现弹性容量能力。

使用改功能时需要设置队列的deserved字段，为每一维资源设置应得资源量。同时需要在调度配置中打开capacity插件，并关闭proportion插件。

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: demo-queue
spec:
  reclaimable: true
  deserved: # set the deserved field.
    cpu: 64
    memeory: 128Gi
    nvidia.com/a100: 40
    nvidia.com/v100: 80
```

队列弹性容量调度的完整使用例子，请参考：[How to use capacity plugin](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_capacity_plugin.md).

关于弹性队列容量设计文档，请参考[Capacity scheduling Design](https://github.com/volcano-sh/volcano/blob/master/docs/design/capacity-scheduling.md).

#### 支持队列与节点间的亲和调度

队列通常关联着公司内的部门，而不同部门通常需要使用不同的异构资源类型，比如大模型训练团队需要使用NIVDIA的Tesla GPU，而推荐团队需要使用AMD的GPU，当用户提交作业到队列时，需要根据队列的属性将作业自动调度到对应资源类型的节点上。

为此Volcano实现了队列和节点的亲和调度能力，用户只需在队列的affinity字段设置需要亲和的节点标签，Volcano会自动将提交到当前队列的作业调度到队列关联的节点上，用户无需单独设置作业的亲和性，而只需统一设置队列的亲和性，提交到队列的作业都会根据队列与节点的亲和性将作业调度到对应的节点。

该特性同时支持硬亲和、软亲和、反亲和调度，使用时需要为节点设置key为`volcano.sh/nodegroup-name`的标签，然后设置队列的affinity字段，指定硬亲和、软亲和和反亲和的标签值。例如如下的队列设置，表示提交到该队列的作业需要调度到标签值为groupname1和groupname2的节点，并优先调度到标签值为groupname2的节点，同时，作业不能调到到标签值为groupname3和groupname4的节点，当资源不足时则也可以调度到标签值为groupname3的节点上。

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: default
  spec:
    reclaimable: true
    weight: 1
    affinity:            # added field
      nodeGroupAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
        - <groupname1>
        - <groupname2>	
        preferredDuringSchedulingIgnoredDuringExecution:
        - <groupname1>
      nodeGroupAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
        - <groupname3>
        - <gropuname4>
        preferredDuringSchedulingIgnoredDuringExecution:
        - <groupname3>
```

该功能对应的调度插件名为nodegroup，完整使用例子请参考：[How to use nodegroup plugin](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_nodegroup_plugin.md).

详细设计文档请参考：[The nodegroup design](https://github.com/volcano-sh/volcano/blob/master/docs/design/node-group.md).

#### GPU共享功能支持节点打分调度

GPU共享是Volcano v1.8版本推出的GPU共享与隔离方案，提供GPU共享、设备显存控制能力，以提升AI训练推理场景下GPU资源利用率低的问题。v1.9在该功能基础上新增了对GPU节点打分的策略，从而可以在作业分配时选择最优的节点，进一步提升资源利用率，用户可以设置不同的打分策略。目前支持以下两种策略：

- Binpack：提供GPU卡粒度的binpack算法，优先把一个节点上的已经分配了资源的GPU卡占满，避免资源碎片和浪费。


- Spread：优先使用空闲的GPU卡而不是已经分配了资源的共享卡。


详细使用文档请参考：[How to use gpu sharing](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_gpu_sharing.md)

#### Volcano支持Kubernetes v1.29

Volcano版本紧跟Kubernetes社区版本节奏，对Kubernetes的每个大的基数版本都进行支持，目前最新支持的版本为v1.29，并运行了完整的UT、E2E用例，保证功能和可靠性。如果您想参与Volcano适配Kubernetes新版本的开发工作，请参考：https://github.com/volcano-sh/volcano/pull/3459 进行社区贡献。

#### 增强scheduler metrics指标

Volcano使用了client-go客户端和Kubernetes交互，尽管客户端可以设置QPS来避免请求被限流，但是客户端实际使用的QPS到底达到了多少却很难观察到，为了实时观测到客户端请求的频率，Volcano新增了client-go客户端的metrics指标，用户可以通过访问metrics接口，查看GET、POST等请求在每秒钟的请求数量，从而确定每秒钟实际使用的QPS，以此决定是否需要调整客户端设置的QPS。同时client-go的相关指标还包括客户端证书轮转周期统计、每个请求的response size统计等。

用户可以使用curl http://$volcano_scheduler_pod_ip:8080/metrics 来获取volcano scheduler的所有详细指标。

详细PR见：[[feat\] Add rest client metrics by Monokaix · Pull Request #3274 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3274)

#### 新增License合规性检查

为了增强Volcano社区开源license合规治理规范，避免引入传染性开源协议，规避潜在风险，Volcano社区引入了开源license合规检查工具，所谓传染性协议指的是使用了该协议作为开源许可的软件在修改、使用、复制之后生成的衍生作品，也必须以该协议进行开源。开发者提交的PR会引入的三库如果包含了传染性开源协议比如GPL，LGPL等，CI门禁会进行拦截，开发者需要将三方库替换为松自由软件许可协议比如MIT、Apache 2.0，BSD等，以通过开源license合规检查。

#### 提升调度稳定性

Volcano v1.9.0版本在抢占、调度失败重试、避免内存泄露、安全性增强等方面做了较多优化，具体内容包括：

- 修复极端情况下deployment频繁扩缩容导致的pod无法调度的问题，详见PR：[[cherry-pick for release-1.9\]fix PodGroup being incorrectly deleted due to frequent creation and deletion of pods by guoqinwill · Pull Request #3376 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3376)


- 修复Pod抢占问题：详见PR：[ignore PredicateFn err info for preempt & reclaim scheduler plugin by LivingCcj · Pull Request #3458 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3458)


- 优化Pod调度失败重试机制：详见PR：[fix errTask channel memory leak by bibibox · Pull Request #3435 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3435)


- metrics指标优化：详见PR：[Fix queue metrics when there are no jobs in it by Monokaix · Pull Request #3463 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3463)


- 安全性增强：详见PR：[Remove list secret in controller ClusterRole by lekaf974 · Pull Request #3449 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3449)

### 致谢贡献者

Volcano 1.9.0 版本包含了来自多位贡献者的代码提交，在此对各位贡献者表示由衷的感谢：

**贡献者 GitHub ID：**<br>
<table>
  <tr>
    <td>@daniel-hutao</td>
    <td>@wuyueandrew</td>
    <td>@googs1025</td>
  </tr>
  <tr>
    <td>@7sunarni</td>
    <td>@flyingfang</td>
    <td>@LivingCcj</td>
  </tr>
  <tr>
    <td>@guoqinwill</td>
    <td>@panoswoo</td>
    <td>@william-wang</td>
  </tr>
  <tr>
    <td>@lekaf974</td>
    <td>@yangqz</td>
    <td>@lowang-bh</td>
  </tr>
  <tr>
    <td>@loheagn</td>
    <td>@hwdef</td>
    <td>@archlitchi</td>
  </tr>
  <tr>
    <td>@Lily922</td>
    <td>@bibibox</td>
    <td>@Monokaix</td>
  </tr>
  <tr>
    <td>@belo4ya</td>
  </tr>  
</table>    

**参考链接**

Release note: v1.9.0

https://github.com/volcano-sh/volcano/releases/tag/v1.9.0

Branch：release-1.9

https://github.com/volcano-sh/volcano/tree/release-1.9

### 深入了解Volcano

Volcano 云原生批量计算项目主要用于 AI、大数据、基因、渲染等诸多高性能计算场景，对主流通用计算框架均有很好的支持。社区已吸引5.8万+全球开发者，并获得3.5k+ Star 和800+ Fork，参与贡献企业包括华为、AWS、百度、腾讯、京东、小红书、博云、第四范式等。目前，Volcano在人工智能、大数据、基因测序等海量数据计算和分析场景已得到快速应用，已完成对 Spark、Flink、Tensorflow、PyTorch、Argo、MindSpore、Paddlepaddle 、Kubeflow、MPI、Horovod、mxnet、KubeGene、Ray 等众多主流计算框架的支持，并构建起完善的上下游生态。
