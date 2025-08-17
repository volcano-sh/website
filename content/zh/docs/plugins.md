+++
title =  "Plugins"

date = 2021-05-13
lastmod = 2021-05-13

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Plugins"
[menu.docs]
  parent = "scheduler"
  weight = 3
+++

### Env

#### 简介

Env 插件是 Volcano Job 的一个重要组件，专为需要 Pod 感知其在任务中索引位置的业务场景设计。当创建 Volcano Job 时，这些索引会自动注册为环境变量，使得每个 Pod 能够了解自己在任务组中的位置。这对于分布式计算框架（如 MPI、TensorFlow、PyTorch 等）尤为重要，因为它们需要协调多个节点共同完成计算任务。

#### 场景

Env 插件特别适用于以下场景：

1. **分布式机器学习**：在 TensorFlow、PyTorch 等框架的分布式训练中，每个工作节点需要知道自己的角色（如参数服务器或工作节点）以及在工作组中的索引位置。
2. **数据并行处理**：当多个 Pod 需要处理不同数据分片时，每个 Pod 可以通过环境变量获取自己的索引，从而确定应处理的数据范围。
3. **MPI 并行计算**：在高性能计算场景中，MPI 任务需要每个进程了解自己的 rank，以便正确地进行进程间通信。

#### 关键特性

- 自动为每个 Pod 注册 `VK_TASK_INDEX` 和 `VC_TASK_INDEX` 环境变量
- 索引值范围从 0 到副本数量减 1，表示 Pod 在任务中的位置
- 无需额外配置，只需在 Job 定义中注册插件即可使用
- 与其他 Volcano 插件（如 Gang、SVC 等）完美配合，增强分布式任务的协调能力

#### 使用方法

在 Volcano Job 定义中添加 Env 插件非常简单：

```yaml
yamlspec:
  plugins:
    env: []   # 注册 Env 插件，数组中不需要任何值
```

如需了解更多关于 Env 插件的信息，请参考[Volcano Env 插件指南](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_env_plugin.md) 获取更多信息。

### SSH

#### 简介

SSH 插件是为 Volcano Job 中的 Pod 之间提供免密登录功能而设计的，这对于像 MPI 这样的工作负载来说是必不可少的。它通常与 SVC 插件一起使用，以实现分布式计算环境中节点间的高效通信。

#### 应用场景

SSH 插件特别适用于以下场景：

1. **MPI 并行计算**：MPI 框架需要各节点间能够无障碍通信，免密 SSH 登录是其基础设施的关键部分。
2. **分布式机器学习**：在分布式训练过程中，主节点可能需要通过 SSH 连接到工作节点执行命令或监控状态。
3. **集群管理**：当需要在作业的多个 Pod 之间执行管理操作时，免密 SSH 可以简化操作流程。
4. **高性能计算**：HPC 工作负载通常需要节点间的高效通信和协调，SSH 插件提供了这种能力。

#### 关键特性

- 自动为 Job 中的所有 Pod 配置 SSH 免密登录
- 创建包含 `authorized_keys`、`id_rsa`、`config` 和 `id_rsa.pub` 的 Secret
- 将 SSH 配置文件挂载到 Job 中所有容器的指定路径
- 提供 `/root/.ssh/config` 文件，包含 Job 中所有 Pod 的主机名和子域名对应关系
- 支持自定义 SSH 密钥和配置路径

#### 配置参数

| 参数                | 类型   | 默认值       | 必填 | 描述                          |
| ------------------- | ------ | ------------ | ---- | ----------------------------- |
| `ssh-key-file-path` | 字符串 | `/root/.ssh` | 否   | 用于存储 SSH 私钥和公钥的路径 |
| `ssh-private-key`   | 字符串 | 默认私钥     | 否   | 私钥的输入字符串              |
| `ssh-public-key`    | 字符串 | 默认公钥     | 否   | 公钥的输入字符串              |

#### 使用方法

在 Volcano Job 定义中添加 SSH 插件非常简单：

```yaml
yamlspec:
  plugins:
    ssh: []   # 注册 SSH 插件，大多数情况下不需要额外参数
    svc: []   # 通常与 SVC 插件一起使用
```

#### 注意事项

- 如果配置了 `ssh-key-file-path`，请确保目标目录下存在私钥和公钥。大多数情况下建议保持默认值。
- 如果配置了 `ssh-private-key` 或 `ssh-public-key`，请确保值正确。大多数情况下建议使用默认密钥。
- 一旦配置了 SSH 插件，将创建一个名称为 "作业名-ssh" 的 Secret，其中包含所需的 SSH 配置文件。
- 请确保所有容器中都可用 `sshd` 服务，否则 SSH 登录功能将无法正常工作。

如需了解更多关于 SSH 插件的信息，请参考[Volcano SVC 插件指南](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_ssh_plugin.md) 获取更多信息。

### SVC

#### 简介

SVC 插件是为 Volcano Job 中的 Pod 之间提供通信能力而设计的，这对于像 TensorFlow 和 MPI 这样的工作负载来说是必不可少的。例如，TensorFlow 作业需要在参数服务器(PS)和工作节点(Worker)之间进行通信。Volcano 的 SVC 插件使 Job 中的 Pod 能够通过域名相互访问，大大简化了分布式应用的部署。

#### 应用场景

SVC 插件特别适用于以下场景：

1. **分布式机器学习**：TensorFlow、PyTorch 等框架需要工作节点和参数服务器之间的高效通信。
2. **大数据处理**：Spark 等框架中的 Driver 和 Executor 需要相互通信。
3. **高性能计算**：MPI 等并行计算框架需要节点间的低延迟通信。
4. **微服务架构**：当一个作业包含多个相互依赖的服务组件时。

#### 关键特性

- 自动为所有 Pod 设置 `hostname`（Pod 名称）和 `subdomain`（Job 名称）
- 为所有容器注册环境变量 `VC_%s_NUM`（任务副本数）和 `VC_%s_HOSTS`（任务下所有 Pod 的域名）
- 创建包含所有任务副本数和 Pod 域名的 ConfigMap，并挂载到 `/etc/volcano/` 目录
- 创建与 Job 同名的无头服务(Headless Service)
- 可选择性地创建 NetworkPolicy 对象以控制 Pod 间通信

#### 配置参数

| 参数                          | 类型   | 默认值  | 描述                          |
| ----------------------------- | ------ | ------- | ----------------------------- |
| `publish-not-ready-addresses` | 布尔值 | `false` | 是否在 Pod 未就绪时发布其地址 |
| `disable-network-policy`      | 布尔值 | `false` | 是否禁用为 Job 创建网络策略   |

#### 使用方法

在 Volcano Job 定义中添加 SVC 插件：

```yaml
yamlspec:
  plugins:
    svc: []   # 使用默认配置
    # 或者自定义配置
    # svc: ["--publish-not-ready-addresses=true", "--disable-network-policy=true"]
```

#### 注意事项

- 您的 Kubernetes 集群需要 DNS 插件（如 CoreDNS）
- Kubernetes 版本需要 >= v1.14
- SVC 插件创建的资源（ConfigMap、Service、NetworkPolicy）会随 Job 一起被自动管理
- 可以通过环境变量或挂载的配置文件访问 Pod 域名信息

如需了解更多关于 SVC 插件的信息，请参考[Volcano SVC 插件指南](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_ssh_plugin.md) 获取更多信息。

### Gang

{{<figure library="1" src="gang.png" title="Gang plugin">}}

#### 简介

Gang调度策略是volcano-scheduler的核心调度算法之一，它满足了调度过程中的“All or nothing”的调度需求，避免Pod的任意调度导致集群资源的浪费。具体算法是，观察Job下的Pod已调度数量是否满足了最小运行数量，当Job的最小运行数量得到满足时，为Job下的所有Pod执行调度动作，否则，不执行。

#### 场景

基于容器组概念的Gang调度算法十分适合需要多进程协作的场景。AI场景往往包含复杂的流程，Data Ingestion、Data Analysts、Data Splitting、Trainer、Serving、Logging等，需要一组容器进行协同工作，就很适合基于容器组的Gang调度策略。MPI计算框架下的多线程并行计算通信场景，由于需要主从进程协同工作，也非常适合使用Gang调度策略。容器组下的容器高度相关也可能存在资源争抢，整体调度分配，能够有效解决死锁。

在集群资源不足的场景下，gang的调度策略对于集群资源的利用率的提升是非常明显的。



### Binpack

#### 简介

binpack调度算法的目标是尽量把已有的节点填满（尽量不往空白节点分配）。具体实现上，binpack调度算法是给可以投递的节点打分，分数越高表示节点的资源利用率越高。binpack算法能够尽可能填满节点，将应用负载靠拢在部分节点，这非常有利于K8S集群节点的自动扩缩容功能。

Binpack算法以插件的形式，注入到volcano-scheduler调度过程中，将会应用在Pod优选节点的阶段。Volcano-scheduler在计算binpack算法时，会考虑Pod请求的各种资源，并根据各种资源所配置的权重做平均。每种资源在节点分值计算过程中的权重并不一样，这取决于管理员为每种资源配置的权重值。同时不同的插件在计算节点分数时，也需要分配不同的权重，scheduler也为binpack插件设置了分数权重。

#### 场景

binpack算法对能够尽可能填满节点的小作业有利。例如大数据场景下的单次查询作业、电商秒杀场景订单生成、AI场景的单次识别作业以及互联网高并发的服务场景等。这种调度算法能够尽可能减小节点内的碎片，在空闲的机器上为申请了更大资源请求的Pod预留足够的资源空间，使集群下空闲资源得到最大化的利用。



### Priority

{{<figure library="1" src="fair-share.png" title="fair-share调度">}}

#### 简介

Priority plugin提供了job、task排序的实现，以及计算牺牲作业的函数preemptableFn。job的排序根据priorityClassName，task的排序依次根据priorityClassName、createTime、id。

#### 场景

当集群运行了多个Job，但资源不足，并且每个Job下有不等数量的Pod等待被调度的时候，如果使用Kubernetes默认调度器，那么最终，具有更多Pod数量的Job将分得更多的集群资源。在这种情况下，volcano-scheduler提供算法支持不同的Job以fair-share的形式共享集群资源。

Priority plugin能够让用户自定义job、task优先级，根据自己的需求在不同层次来定制调度策略。根据job的priorityClassName在应用层面进行优先级排序，例如集群中有金融场景、物联网监控场景等需要较高实时性的应用，Priority plugin能够保证其优先得到调度。



### DRF
{{<figure library="1" src="drfjob.png" title="drf plugin">}}
#### 简介

DRF调度算法的全称是Dominant Resource Fairness，是基于容器组Dominant Resource的调度算法。volcano-scheduler观察每个Job请求的主导资源，并将其作为对集群资源使用的一种度量，根据Job的主导资源，计算Job的share值，在调度的过程中，具有较低share值的Job将具有更高的调度优先级。这样能够满足更多的作业，不会因为一个胖业务，饿死大批小业务。DRF调度算法能够确保在多种类型资源共存的环境下,尽可能满足分配的公平原则。

#### 场景

DRF调度算法优先考虑集群中业务的吞吐量，适用单次AI训练、单次大数据计算以及查询等批处理小业务场景。



### Proportion

#### 简介
Proportion调度算法是使用queue的概念，用来控制集群总资源的分配比例。每一个queue分配到的集群资源比例是一定的。举例来说，有3个团队，共享一个集群上的资源池：A团队最多使用总集群的40%，B团队最多使用30%，C团队最多使用30%。如果投递的作业量超过团队最大可用资源，就需要排队。

#### 场景

Proportion调度算法为集群的调度带来了弹性、灵活性上面的提升。最典型的场景就是在一个公司的多个开发团队，共用一个集群的时候，这种调度算法能够很好的处理不同部门之间的共享资源配比和隔离的需求。在多业务混合场景，如计算密集型的AI业务，网络IO密集型的MPI、HPC业务，存储密集型的大数据业务，Proportion调度算法通过配比，能很好的按需分配共享资源。



### Task-topology

#### 简介

Task-topology算法是一种根据Job内task之间亲和性和反亲和性配置计算task优先级和Node优先级的算法。通过在Job内配置task之间的亲和性和反亲和性策略，并使用task-topology算法，可优先将具有亲和性配置的task调度到同一个节点上，将具有反亲和性配置的Pod调度到不同的节点上。

#### 场景

node affinity：

- Task-topology对于提升深度学习计算场景下的计算效率非常重要。以TensorFlow计算为例，配置“ps”和“worker”之间的亲和性。Task-topology算法，可使“ps”和“worker”尽量调度到同一台节点上，从而提升“ps”和“worker”之间进行网络和数据交互的效率，进而提升计算效率。
- HPC、MPI场景下task之间具有高度同步性，需要高速的网络IO。

Anti-affinity：

- 以TensorFlow计算为例，“ps”与“ps”之间的反亲和性。
- 电商服务场景的主从备份，数据容灾，保证一个作业挂掉之后有备用作业继续提供服务。



### Predicates   

#### 简介

Predicate plugin通过pod、nodeInfo作为参数，调用predicateGPU，根据计算结果对作业进行评估预选。

#### 场景

在AI的应用场景下，GPU资源是必需，Predicate plugin可以快速筛选出来需要GPU的进行集中调度。



### Nodeorder                                                                                                                                                                                                                                                                           

#### 简介

Nodeorder plugin是一种调度优选策略：通过模拟分配从各个维度为node打分，找到最适合当前作业的node。打分参数由用户来配置。参数包含了Affinity、reqResource，、LeastReqResource、MostReqResource、balanceReqResouce。

#### 场景

Nodeorder plugin给调度提供了多个维度的打分标准，不同维度的组合，能够让用户根据自身需求灵活的配置合适的调度策略。



### SLA

#### 简介

SLA的全称是Service Level agreement。用户向volcano提交job的时候，可能会给job增加特殊的约束，例如最长等待时间(JobWaitingTime)。这些约束条件可以视为用户与volcano之间的服务协议。SLA plugin可以为单个作业/整个集群接收或者发送SLA参数。

#### 场景

根据业务的需要用户可以在自己的集群定制SLA相关参数。例如实时性服务要求较高的集群，JobWaitingTime可以设置的尽量小。批量计算作业为主的集群，JobWaitingTime可以设置较大。具体SLA的参数以及参数的优化需要结合具体的业务以及相关的性能测评结果。



### Tdm

#### 简介

Tdm的全称是Time Division Multiplexing。在一些场景中，一些节点既属于Kubernetes集群也属于Yarn集群。Tdm plugin 需要管理员为这些节点标记为`revocable node`。Tdm plugin会在该类节点可被撤销的时间段内尝试把`preemptable task`调度给`revocable node`，并在该时间段之外清除`revocable node`上的`preemptable task`。Tdm plugin提高了volcano在调度过程中节点资源的分时复用能力。

#### 场景

适用于ToB业务中，云厂商为商家提供云化资源，不同的商家采取不同的容器编排框架(Kubernetes/Yarn等)，Tdm plugin提高公共节点资源的分时使用效率，进一步提升资源的利用率。



### Numa-aware

#### 简介

当节点运行多个cpu密集的pod。基于pod是否可以迁移cpu已经调度周期cpu资源状况，工作负载可以迁移到不同的cpu核心下。许多工作负载对cpu资源迁移并不敏感。然而，有一些cpu的缓存亲和度以及调度延迟显著影响性能的工作负载，kubelet允许可选的cpu编排策略(cpu management)来确定节点上cpu资源的绑定分配。

cpu manager以及topology manager都是kubelet的组件，它存在如下局限：

- 基于kubelet的调度组件不支持topology-aware。所以可能由于Topology manager，导致整个node上的调度失败。这对Tensorflow job是难以接受的，因为一旦有任何worker task挂掉，整个作业都将调度失败。
- 这些manager是节点级这导致无法在整个集群中匹配numa topology的最佳节点。

Numa-aware plugin致力于解决如上局限。

- 支持cpu资源的拓扑调度。
- 支持pod级别的拓扑协议。

#### 场景

Numa-aware的常见场景是那些对cpu参数敏感\调度延迟敏感的计算密集型作业。如科学计算、视频解码、动漫动画渲染、大数据离线处理等具体场景。

### Capacity

#### 简介

Capacity插件是Volcano调度器中负责管理队列资源配额的插件。它确保各个队列根据预设的资源配额进行资源分配，并支持层级队列结构。Capacity插件主要功能包括：跟踪队列的资源使用情况、确保队列不超过其资源上限、支持资源抢占以及管理作业入队逻辑。

Capacity插件通过监控每个队列的已分配资源、请求资源、保障资源和弹性资源，实现对资源分配的精确控制。它还支持层级队列结构，允许管理员创建父子队列关系，实现更复杂的资源管理策略。

#### 场景

- 多租户环境：在多个团队或部门共享集群资源的环境中，通过队列资源配额限制各租户资源使用，确保资源公平分配。
- 资源保障需求：当某些关键业务需要资源保障时，可以通过设置队列的guarantee资源确保这些业务始终能获得所需资源。
- 层级资源管理：在大型组织中，通过层级队列结构实现部门、团队、项目的多级资源管理，上级队列可以控制下级队列的资源使用。

### CDP

#### 简介

CDP插件是Volcano调度器中专为弹性调度场景设计的。在弹性调度环境中，可抢占任务的Pod可能会频繁地在被抢占和恢复运行之间切换，如果没有冷却保护机制，这些Pod可能在刚刚启动运行后很短时间内就再次被抢占，这会导致服务稳定性下降。

CDP插件通过为Pod提供冷却时间保护，确保Pod在进入Running状态后的一段时间内不会被抢占，从而提高服务的稳定性。这种保护机制对于需要一定启动时间才能提供稳定服务的应用尤为重要。

#### 场景

- 弹性训练系统：在机器学习训练任务中，模型训练Pod需要一定的稳定运行时间才能有效学习。CDP可以确保这些Pod在刚启动后不会立即被抢占，提高训练效率。
- 弹性服务系统：对于提供在线服务的应用，Pod启动后通常需要进行初始化、预热等操作才能正常提供服务。CDP可以保证这些服务Pod有足够的时间完成初始化。
- 资源争抢激烈的集群：在资源紧张的集群中，高优先级任务可能频繁抢占低优先级任务的资源。CDP可以为低优先级但仍需要一定稳定运行时间的任务提供保护。
- 有状态应用：对于有状态应用，频繁的抢占和恢复可能导致状态不一致或数据丢失。CDP可以减少这种情况的发生。
- 启动时间较长的应用：某些应用可能有较长的启动时间，如果在启动过程中被频繁抢占，可能永远无法正常提供服务。CDP可以确保这些应用至少有一个完整的启动周期。

### Conformance

#### 简介

Conformance插件是Volcano调度器中的一个安全插件，旨在保护Kubernetes系统中的关键Pod不被抢占或回收。该插件确保系统关键组件的稳定运行，防止调度决策影响集群的核心功能。

Conformance插件通过识别特定的优先级类名（PriorityClassName）和命名空间来判断Pod是否为关键Pod。它会过滤掉具有系统级别优先级或运行在系统命名空间中的Pod，使这些Pod不会成为抢占或资源回收的目标。

#### 场景

- 系统组件保护：确保kube-system命名空间中运行的核心Kubernetes组件（如kube-apiserver、kube-scheduler、kube-controller-manager等）不会因为用户工作负载的调度需求而被抢占。
- 保障集群稳定性保障：通过防止关键Pod被抢占，维护集群的基本功能和稳定性，即使在资源紧张的情况下也能保证集群管理功能正常运行。

### DeviceShare

#### 简介

DeviceShare插件是Volcano调度器中专门用于管理和调度共享设备资源的组件，特别是针对GPU等高价值计算资源。该插件支持多种设备共享模式，包括GPU共享（GPUShare）和虚拟GPU（VGPU），使集群能够更高效地利用有限的设备资源。

DeviceShare插件通过细粒度的设备资源分配机制，允许多个任务共享同一个物理设备，从而提高设备利用率和集群吞吐量。它提供了设备资源的预选（Predicate）和优选（Score）功能，确保任务被调度到合适的节点上，同时支持节点锁定功能，防止资源争用导致的问题。

#### 场景

- GPU共享环境：在机器学习和深度学习工作负载中，许多任务可能只需要部分GPU资源。通过GPU共享，多个任务可以共享同一个物理GPU，提高资源利用率。
- 混合工作负载：在同时运行计算密集型和非计算密集型任务的集群中，DeviceShare可以帮助更合理地分配GPU资源，确保资源不被浪费。
- 虚拟GPU应用：对于支持虚拟GPU技术的环境，DeviceShare提供了VGPU调度支持，使虚拟化GPU资源能够被有效管理和分配。

### Extender

#### 简介

Extender插件是Volcano调度器的扩展机制，允许用户通过HTTP接口将自定义的调度逻辑集成到Volcano调度系统中。该插件通过HTTP调用外部服务，将调度决策的部分或全部环节委托给外部系统处理，使Volcano调度器能够支持更复杂、更特定领域的调度需求。

Extender插件支持多种调度阶段的扩展，包括会话开启/关闭、节点预选（Predicate）、节点优选（Prioritize）、任务抢占（Preemptable）、资源回收（Reclaimable）、队列过载检查（QueueOverused）以及作业入队检查（JobEnqueueable）等。用户可以根据需要实现这些接口中的一个或多个，以定制化调度行为。

#### 场景

- 特定领域的调度需求：当标准Volcano调度器无法满足特定领域（如HPC、AI训练等）的复杂调度需求时，可以通过Extender插件集成专门的调度逻辑。
- 外部系统集成：对于已有的调度系统或资源管理系统，可以通过Extender插件将其与Volcano集成，实现平滑过渡。

### NodeGroup

#### 简介

NodeGroup插件是Volcano调度器中用于管理节点组亲和性和反亲和性的组件。该插件允许用户基于队列和节点组之间的关系来控制工作负载的分布，提供了一种更高级别的资源分配和隔离机制。通过NodeGroup插件，用户可以定义队列与特定节点组之间的亲和性（Affinity）和反亲和性（Anti-Affinity）规则，这些规则可以是硬性要求（Required）或软性偏好（Preferred）。

NodeGroup插件通过标签机制识别节点所属的节点组，并根据队列的亲和性配置，在调度过程中进行节点预选（Predicate）和优选（Score）。这使得管理员可以更精细地控制不同队列的工作负载在集群中的分布方式。

#### 场景

- 资源隔离：在多租户环境中，可以将不同租户的工作负载限制在特定的节点组上，避免资源干扰，提高安全性和性能稳定性。
- 硬件亲和性：当集群中存在不同硬件配置的节点时（如GPU节点、高内存节点等），可以通过NodeGroup将特定类型的工作负载引导到合适的硬件节点上。
- 故障域隔离：通过将工作负载分散到不同的节点组，可以减少单点故障的影响范围，提高系统的可用性。
- 渐进式升级：在集群升级过程中，可以使用NodeGroup控制工作负载在新旧节点组之间的分布，实现平滑过渡。

### Overcommit

#### 简介

Overcommit插件是Volcano调度器中用于实现资源超售（Resource Overcommitting）的插件。该插件允许集群在物理资源不足的情况下，通过设置超售因子（Overcommit Factor）来接受更多的作业入队请求，从而提高集群的资源利用率和作业吞吐量。

Overcommit插件通过计算集群的总资源、已使用资源和已入队作业的资源需求，结合超售因子，来决定新的作业请求是否可以入队。超售因子定义了集群可以超出其物理资源容量的比例，默认值为1.2，表示集群可以接受超出其实际容量20%的资源请求。

#### 场景

- 资源利用率优化：在实际运行中，许多应用程序的资源请求往往高于其实际使用量。通过资源超售，可以接受更多的作业，提高集群的整体资源利用率。
- 弹性工作负载环境：对于具有波动性资源需求的工作负载，超售机制可以在资源需求高峰期临时接受更多作业，提高系统的弹性和响应能力。
- 批处理作业集群：在批处理作业为主的环境中，作业的资源使用通常不会同时达到峰值。通过超售，可以增加集群的作业吞吐量，减少作业等待时间。

### PDB

#### 简介

PDB是Volcano调度器中用于保护应用可用性的插件。该插件确保在资源回收和抢占过程中，遵守Kubernetes的PodDisruptionBudget资源对象定义的应用可用性约束，防止因调度决策导致的服务中断。

PDB插件通过与Kubernetes的PodDisruptionBudget资源集成，在选择牺牲者（victims）任务时，会检查每个潜在的牺牲者是否会违反PDB约束。如果移除某个Pod会导致应用实例数低于PDB定义的最小可用实例数，那么该Pod将不会被选为牺牲者，从而保护应用的可用性。

#### 场景

- **高可用服务保护**：对于需要保持高可用性的在线服务（如Web服务、数据库服务等），PDB插件可以确保在资源回收和抢占过程中，服务的可用实例数不会低于预设的阈值，避免服务中断。
- **有状态应用管理**：对于有状态应用（如分布式数据库、消息队列等），PDB插件可以防止过多的实例同时被驱逐，减少数据复制和同步的压力，保持系统稳定性。

### Rescheduling

#### 简介

Rescheduling插件是Volcano调度器中用于优化集群资源利用率的插件。该插件通过周期性地评估集群状态，识别资源分配不均衡的情况，并主动触发任务重调度，以实现更优的资源分布和利用率。

Rescheduling插件支持多种重调度策略，默认使用"lowNodeUtilization"策略，该策略专注于识别利用率低的节点，并将任务从利用率低的节点迁移到利用率更高的节点，从而提高整体集群效率。插件通过可配置的时间间隔（默认为5分钟）周期性地执行重调度评估，确保集群资源分配持续优化。

#### 场景

- 资源利用率优化：对于长时间运行的集群，资源分配可能随着时间变得不均衡。Rescheduling插件可以定期重新平衡资源分配，提高整体利用率。
- 节点资源碎片整合：当集群中存在多个低利用率节点时，Rescheduling可以通过任务迁移，将资源碎片整合，释放完整节点用于大型任务或节点维护。
- 定期维护：作为集群定期维护流程的一部分，Rescheduling可以在低峰期优化资源分配，为高峰期做准备。
- 弹性伸缩后优化：在集群进行自动伸缩后，资源分配可能不是最优的。Rescheduling可以在伸缩操作后重新优化任务分布。

### ResourceQuota

#### 简介

ResourceQuota插件是Volcano调度器中用于实现命名空间资源配额控制的插件。该插件确保作业在入队时遵守Kubernetes ResourceQuota资源对象定义的命名空间资源限制，防止单个命名空间过度消耗集群资源。

ResourceQuota插件通过检查作业的最小资源需求（MinResources）与命名空间的资源配额状态，判断作业是否可以入队。当作业的资源需求加上命名空间已使用的资源超过配额限制时，作业将被拒绝入队，并记录相应的事件信息。插件还维护了一个待处理资源使用量的跟踪机制，确保在同一调度周期内多个作业的资源需求不会超过命名空间配额。

#### 场景

ResourceQuota插件适用于以下场景：

- 多租户环境：在多个团队或项目共享同一集群的环境中，ResourceQuota插件可以确保每个租户只能使用分配给其命名空间的资源量，防止资源争用和"邻居噪音"问题。
- 资源分配管理：管理员可以通过设置不同命名空间的资源配额，实现集群资源的合理分配和精细化管理，确保重要业务获得足够资源。
- 防止资源滥用：ResourceQuota插件可以防止因程序错误或恶意行为导致的资源过度申请，保护集群稳定性。
