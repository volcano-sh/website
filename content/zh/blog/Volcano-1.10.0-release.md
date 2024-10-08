+++
title =  "Volcano v1.10.0正式发布"
description = "新增特性：新增队列优先级设置策略、支持细粒度的GPU资源共享与回收、支持Pod Scheduling Readiness调度、支持Sidecar container调度、增强vcctl命令行工具功能、Volcano支持Kubernetes v1.30、增强Volcano安全性、优化Volcano性能、提升GPU监控功能、优化helm chart包安装升级流程等"
subtitle = ""

date = 2024-09-29
lastmod = 2024-09-29
datemonth = "Sep"
dateyear = "2024"
dateday = 29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["volcano"]

tags = ["Practice"]
summary = "新增特性：新增队列优先级设置策略、支持细粒度的GPU资源共享与回收、支持Pod Scheduling Readiness调度、支持Sidecar container调度、增强vcctl命令行工具功能、Volcano支持Kubernetes v1.30、增强Volcano安全性、优化Volcano性能、提升GPU监控功能、优化helm chart包安装升级流程等"

# Add menu entry to sidebar.
linktitle = "Volcano v1.10.0正式发布"
[menu.posts]
parent = "tutorials"
weight = 6
+++



北京时间2024年9月19日，Volcano社区v1.10.0版本正式发布，此次版本增加了以下新特性：

- **新增队列优先级设置策略**

- **支持细粒度的GPU资源共享与回收**

- **支持Pod Scheduling Readiness调度**

- **支持Sidecar container调度**

- **增强vcctl命令行工具功能**

- **Volcano支持Kubernetes v1.30**

- **增强Volcano安全性**

- **优化Volcano性能**

- **提升GPU监控功能**

- **优化helm chart包安装升级流程**

{{<figure library="1" src="volcano_logo.png" width="50%">}}
Volcano是业界首个云原生批量计算项目，于2019年6月在上海 KubeCon 正式开源，并在2020年4月成为 CNCF 官方项目。2022年4月，Volcano 正式晋级为CNCF 孵化项目。Volcano 社区开源以来，受到众多开发者、合作伙伴和用户的认可和支持。截至目前，累计有800+全球开发者参与社区贡献。

## Volcano v1.10.0 关键特性介绍

### 新增队列优先级设置策略

在传统的大数据处理场景下，用户可以直接设置队列优先级来控制作业的调度顺序，为了更好的帮助用户从Hadoop/Yarn迁移到云原生平台，Volcano也支持了在队列层面直接设置优先级，降低大数据用户的迁移成本，提升用户体验和资源利用效率。

队列是Volcano中的一种基本资源，不同队列有着优先级区分，在默认情况下，队列的优先级是由队列的`share`值决定的，share值是由队列中已分配的资源量除以队列的总容量计算得到的，不需要用户手动配置，`share`值越小，则代表队列中已分配的资源比例越小，即队列越不饱和，需要优先分配资源，因此队列的`share`越小，队列的优先级越高，在分配资源时会优先分配给`share`较小的队列，以保证资源分配的公平性。

但是在生产环境尤其是大数据处理场景下，用户更希望可以直接设置队列的优先级，从而能更直观的知道不同队列的优先级顺序，由于`share`值是实时计算得到的，因此会根据队列分配资源的饱和程度而实时变化，为了更加直观的表示队列优先级同时支持用户自行配置，Volcano在`share`值的基础上为队列新增了`priority`字段，支持用户配置队列优先级，`priority`越高则表示队列优先级越高，会优先分配资源给高优先级的队列，并且在回收队列资源时会优先回收低优先级队列内的作业。

队列优先级定义：

```go
type QueueSpec struct {
...
  // Priority define the priority of queue. Higher values are prioritized for scheduling and considered     later during reclamation.
  // +optional
  Priority int32 `json:"priority,omitempty" protobuf:"bytes,10,opt,name=priority"`
}
```

同时为了兼容share值的使用方式，Volcano在计算队列优先级时也会考虑share值，默认情况下用户不设置队列优先级或者队列的优先级相等时，Volcano会再比较队列的share值，此时share越小队列优先级越高。用户可以根据实际场景选择设置不同的优先级策略，即priority和share两种方式。

关于队列优先级设计文档，请参考：[Queue Priority](https://github.com/volcano-sh/volcano/blob/master/docs/design/queue-priority.md).

### 支持细粒度的GPU资源共享与回收

Volcano在v1.9版本发布了弹性队列容量capacity调度功能，用户可以直接为队列设置每一维度资源的容量，同时支持基于`deserved`的队列弹性容量调度，实现了更加细粒度的队列资源共享和回收机制。

弹性队列容量`capacity`调度的设计文档请参考：[Capacity scheduling Design](https://github.com/volcano-sh/volcano/blob/master/docs/design/capacity-scheduling.md)

使用指导请参考：[Capacity Plugin User Guide](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_capacity_plugin.md).

为队列配置每一维度deserved使用样例：

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

在v1.10版本中，Volcano在弹性队列容量`capacity`的基础上，支持了上报不同型号的GPU资源，NVIDIA默认的`Device Plugin`在上报GPU资源时无法区分GPU型号，统一上报为`nvidia.com/gpu`，AI训推任务无法根据业务特点选择不同型号的GPU，比如A100、T4等型号的GPU，为了解决这一问题，以满足不同类型的AI任务需求，Volcano在`Device Plugin`层面支持上报不同型号的GPU资源到节点，配合`capacity`插件实现更加细粒度的GPU资源共享和回收。

关于`Device Plugin`上报不同型号GPU的实现和使用指导，请参考：[GPU Resource Naming](https://github.com/volcano-sh/devices/tree/release-1.1/docs/resource-naming).

**注意：**

`capacity`在v1.10.0版本中作为了默认的队列管理插件，`capacity`与`proportion`插件互相冲突，当升级到v1.10.0后，你需要再设置队列的`deserved`字段，以保证队列功能正常工作，具体的使用说明请参考：[Capacity Plugin User Guide](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_capacity_plugin.md).

`capacity`插件根据用户指定的队列`deserved`值来划分集群资源，而`proportion`插件则根据队列权重动态划分集群资源，用户可以根据实际场景选择使用`capacity`或者`proportion`插件进行队列管理。proportion插件的介绍请参考：[proportion plugin](https://volcano.sh/en/docs/plugins/#proportion).

#### 支持Pod Scheduling Readiness调度

Pod 一旦创建就被认为已准备好进行调度，在 Kube-scheduler 中，它会尽力寻找合适的节点来放置所有Pending的 Pod。然而，在现实情况下，某些 Pod 可能会长时间处于“缺少必要资源”状态，这些 Pod 实际上以不必要的方式干扰调度程序（以及 Cluster AutoScaler 等下游组件）的决策和运行，造成资源浪费等问题。Pod Scheduling Readiness是 Kube-sheduler 的一项新增功能，在Kubernetes v.1.30版本GA，成为了一个稳定特性，它通过设置Pod的schedulingGates字段来控制Pod的调度时机。

<div style="text-align: center;"> {{<figure library="1" src="./v1.10.0/podSchedulingGates.svg">}}
Pod SchedulingGates
</div>

在前面的版本中，Volcano已集成了K8s默认调度器的所有算法，全面涵盖了Kube-scheduler的原生调度功能。因此，Volcano能够无缝替代Kube-scheduler，作为云原生平台下的统一调度器，支持微服务和AI/大数据工作负载的统一调度。在最新发布的v1.10版本中，Volcano更是引入了Pod Scheduling Readiness调度能力，进一步满足了用户在多样化场景下的调度需求。

关于Pod Scheduling Readiness特性的文档，请参考：[Pod Scheduling Readiness | Kubernetes](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-scheduling-readiness/)

Volcano支持Pod Scheduling Readiness调度的设计文档，请参考：[Proposal for Support of Pod Scheduling Readiness by ykcai-daniel · Pull Request #3581 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3581)

### 支持Sidecar container调度

Sidecar container是一种相对于业务容器而言的辅助容器，通常用来辅助业务容器的运行，比如收集业务容器日志、监控、初始化网络等。

在Kubernetes v1.28之前，Sidecar container只是一种概念，并没有单独的API来标识一个容器是否是Sidecar container，Sidecar容器和业务容器处于同等地位，有着相同的生命周期，Kubelet会并发启动所有Sidecar容器和业务容器，这样带来的问题是Sidecar容器可能会在业务容器启动之后才启动，并且在业务容器结束之前先结束，而我们期望的是Sidecar容器先于业务容器启动，并在业务容器结束之后再结束，这样就能保证Sidecar容器收集的日志，监控等信息是完整的。

Kubernetes v1.28在API层面支持了Sidecar container，并对init container、Sidecar container、业务container做了统一的生命周期管理，同时调整了Pod的request/limit资源计算方式，该特性在v1.29成为Beta特性。

该特性在设计阶段经历了漫长的讨论时间，特性本身并不复杂，主要的考虑点在于兼容旧的使用方式，如果定义一个除了init container、业务容器之外的新的容器类型，会对API有较大的破坏性，同时周边组件适配该特性的话会有较多的侵入式修改，带来很多额外开销，因此Kubernetes社区并没有引入新的容器类型来支持Sidecar container，而是直接复用了init container，通过设置init container的restartPolicy为Always来标识Sidecar container，完美的解决了API兼容性问题和Sidecar容器的生命周期问题。

在调度层面，该特性的影响在于Pod申请的request资源计算方式有所变化，因为Sidecar container作为一种特殊的init container是持久运行的，需要将Sidecar container的request值累加到业务容器的request值上，因此需要重新计算init container、Sidecar container和业务容器的资源request值。

Volcano调度器在新版本更改了Sidecar container的资源计算方式，支持了Sidecar container的调度，用户可以使用Volcano调度Sidecar container。

关于Sidecar container的详细信息，请参考：[Sidecar Containers | Kubernetes](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)

### 增强vcctl命令行工具功能

vcctl是操作Volcano内置CRD资源的一个命令行工具，可以方便的用来查看/删除/暂停/恢复vcjob资源，并支持查看/删除/开启/关闭/更新queue资源。Volcano在新版本对vcctl做了功能增强，新增以下功能：

- 支持创建/删除/查看/描述`jobflow`和`jobtemplate`资源

- 支持查询指定队列里的vcjob

- 支持通过queue和vcjob过滤查询Pod

vcctl的详细指导文档，请参考：[`vcctl` Command Line Enhancement](https://github.com/volcano-sh/volcano/blob/master/docs/design/command-line-enhancement.md#new-format-of-volcano-command-line).

### Volcano支持Kubernetes v1.30

Volcano版本紧跟Kubernetes社区版本节奏，对Kubernetes的每个大版本都进行支持，目前最新支持的版本为v1.30，并运行了完整的UT、E2E用例，保证功能和可靠性。

如果您想参与Volcano适配Kubernetes新版本的开发工作，请参考：[adapt-k8s-todo](https://github.com/volcano-sh/volcano/blob/master/docs/design/adapt-k8s-todo.md) 进行社区贡献。

### 增强Volcano安全性

Volcano一直都很重视开源软件供应链的安全，在license合规、安全漏洞披露和修复、仓库分支保护、CI检查等方面遵循OpenSSF定义的规范，Volcano近期在Github Action加入了新的workflow，它会在代码合入时运行OpenSSF安全性检查，并实时更新软件安全评分，持续提升软件安全性。

同时Volcano对各个组件的RBAC权限进行了收缩，只保留必要的权限，避免了潜在的越权风险，提升了系统的安全性。

相关PR参见：

[Added the scorecard github action and its badge by harshitasao · Pull Request #3655 · volcano-sh/volcano](https://github.com/volcano-sh/volcano/pull/3655)

[Shrink permissions of vc scheduler & controller by Monokaix · Pull Request #3545 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3545)

[Add pre-install&pre-upgrade hook for admission-init job by Monokaix · Pull Request #3504 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3504)

### 优化Volcano性能

在大规模场景下，Volcano做了很多性能优化的工作，主要包括：

- 优化vcjob更新策略，降低vcjob的更新和同步频次，降低API Server压力，提升提交任务的QPS

- vc controller新增controller gate开关，用户可以选择关闭不需要的controller，减低内存占用和CPU负载

- 所有的controller使用共享的informer，减少内存占用

### 提升GPU监控功能

新版本的Volcano针对GPU监控指标做了优化和增强，修复了GPU监控不精确的问题，并在GPU的算力和显存监控指标上新增了节点信息，方便用户更加直观的查看每个节点上每一张GPU的算力、显存的总量和已分配量。

详细PR参见：[Update volcano-vgpu monitoring system by archlitchi · Pull Request #3620 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3620/)

### 优化helm chart包安装升级流程

Volcano针对helm chart的安装、升级流程进行了优化，并支持安装helm chart包设置更多自定义参数，主要包括：

- 利用helm的hook机制，在安装成功Volcano之后，自动删除volcano-admission-init这一job，避免后续使用helm upgrade升级失败的问题，相关PR参见：[Add pre-install&pre-upgrade hook for admission-init job by Monokaix · Pull Request #3504 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3504)
- 每次安装成功后更新Volcano admission需要的secret文件，避免在不指定helm包名情况下，重复安装卸载volcano导致volcano admission处理失败的问题，详细PR参见：[Update volcano-admission secret when it already exists by Monokaix · Pull Request #3653 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3653)
- 支持为helm包中的资源对象设置通用label，相关PR参见：[Add common labels for chart objects by Aakcht · Pull Request #3511 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3511)
- 支持通过helm为Volcano组件设置日志等级，相关PR参见：[Expose volcano components (controller, scheduler, etc.) log level control to the helm chat values by chenshiwei-io · Pull Request #3656 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3656)
- 支持通过helm设置Volcano组件的镜像代理仓库，相关PR参见：[add image registry for helm by calvin0327 · Pull Request #3436 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3436)
- 支持通过helm设置容器级别的securityContext，相关PR参加：[feat: Add securityContext support at container level in helm chart templates by lekaf974 · Pull Request #3704 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3704)

## 致谢贡献者

Volcano 1.10.0 版本包含了来自36位社区贡献者的上百次代码提交，在此对各位贡献者表示由衷的感谢：

**贡献者GitHub ID**

| **@googs1025**      | **@WulixuanS**    | **@SataQiu**       |
| ------------------- | ----------------- | ------------------ |
| **@guoqinwill**     | **@lowang-bh**    | **@shruti2522**    |
| **@lukasboettcher** | **@wangyysde**    | **@bibibox**       |
| **@Wang-Kai**       | **@y-ykcir**      | **@lekaf974**      |
| **@yeahdongcn**     | **@Monokaix**     | **@Aakcht**        |
| **@yxxhero**        | **@babugeet**     | **@liuyuanchun11** |
| **@MichaelXcc**     | **@william-wang** | **@lengrongfu**    |
| **@xieyanker**      | **@lx1036**       | **@archlitchi**    |
| **@hwdef**          | **@wangyang0616** | **@microyahoo**    |
| **@snappyyouth**    | **@harshitasao**  | **@chenshiwei-io** |
| **@TaiPark**        | **@Aakcht**       | **@ykcai-daniel**  |
| **@lekaf974**       | **@JesseStutler** | **@belo4ya**       |


## 参考链接

Release note: v1.10.0

https://github.com/volcano-sh/volcano/releases/tag/v1.10.0

Branch：release-1.10

https://github.com/volcano-sh/volcano/tree/release-1.10

## 深入了解Volcano

Volcano 云原生批量计算项目主要用于 AI、大数据、基因、渲染等诸多高性能计算场景，对主流通用计算框架均有很好的支持。社区已吸引5.8万+全球开发者，并获得4.1k+ Star 和900+ Fork，参与贡献企业包括华为、AWS、百度、腾讯、京东、小红书、博云、第四范式等。目前，Volcano在人工智能、大数据、基因测序等海量数据计算和分析场景已得到快速应用，已完成对 Spark、Flink、Tensorflow、PyTorch、Argo、MindSpore、Paddlepaddle 、Kubeflow、MPI、Horovod、mxnet、KubeGene、Ray 等众多主流计算框架的支持，并构建起完善的上下游生态。
