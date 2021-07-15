+++
title =  "Actions"


date = 2021-04-07
lastmod = 2021-04-07

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Actions"
[menu.docs]
  parent = "scheduler"
  weight = 2
+++



### Enqueue

#### 简介

Enqueue action筛选符合要求的作业进入待调度队列。当一个Job下的最小资源申请量不能得到满足时，即使为Job下的Pod执行调度动作，Pod也会因为gang约束没有达到而无法进行调度；只有当job的最小资源量得到满足，状态由"Pending"刷新为"Inqueue"才可以进行。一般来说Enqueue action是调度器配置必不可少的action。

####  场景

Enqueue action是调度流程中的准备阶段，只有当集群资源满足作业调度的最小资源请求，作业状态才可由"pending"变为"enqueue"。这样在AI/MPI/HPC这样的集群资源可能不足的高负荷的场景下，Enqueue action能够防止集群下有大量不能调度的pod，提高了调度器的性能。



### Allocate 

#### 简介

Allocate action是调度流程中的正常分配步骤，用于处理在待调度Pod列表中具有资源申请量的Pod调度，是调度过程必不可少的action。这个过程包括作业的predicate和prioritize。使用predicateFn预选，过滤掉不能分配作业的node；使用NodeOrderFn打分来找到最适合的分配节点。

Allocate action遵循commit机制，当一个Pod的调度请求得到满足后，最终并不一定会为该Pod执行绑定动作，这一步骤还取决于Pod所在Job的gang约束是否得到满足。只有Pod所在Job的gang约束得到满足，Pod才可以被调度，否则，Pod不能够被调度。

#### 场景

在集群混合业务场景中，Allocate的预选部分能够将特定的业务（AI、大数据、HPC、科学计算）按照所在namespace快速筛选、分类，对特定的业务进行快速、集中的调度。在Tensorflow、MPI等复杂计算场景中，单个作业中会有多个任务，Allocate action会遍历job下的多个task分配优选，为每个task找到最合适的node。



### Preempt

#### 简介

Preempt action是调度流程中的抢占步骤，用于处理高优先级调度问题。Preempt用于同一个Queue中job之间的抢占，或同一Job下Task之间的抢占。

#### 场景

- Queue内job抢占：一个公司中多个部门共用一个集群，每个部门可以映射成一个Queue，不同部门之间的资源不能互相抢占，这种机制能够很好的保证部门资源的隔离性。多业务类型混合场景中，基于Queue的机制满足了一类业务对于某一类资源的集中诉求，也能够兼顾集群的弹性。例如，AI业务组成的queue对集群GPU占比90%，其余图像类处理的业务组成的queue占集群GPU10%。前者占用了集群绝大部分GPU资源但是依然有一小部分资源可以处理其余类型的业务。
- Job内task抢占：同一Job下通常可以有多个task，例如复杂的AI应用场景中，tf-job内部需要设置一个ps和多个worker，Preempt action就支持这种场景下多个worker之间的抢占。



### Reclaim

#### 简介

Reclaim action是调度过程中回收步骤。volcano中使用queue将资源按照比例分配，当集群中新增或者移除queue，Reclaim会负责回收和重新分配资源到剩余队列中去。

#### 场景

在混合批量计算业务场景中(kubeflow/flink/tensorflow等)，不同的业务所在的queue分配了集群资源，此时如果增加了新的业务，Reclaim为新增的queue分配集群资源配比。然而，新queue分到配额后，并不表明queue下的Pod可以正常调度了，因为queue在此时分到的配额只是使用集群资源的上限，并不是使用集群的担保。如果旧业务刚好将集群资源全部占用，那么新业务就会陷入“忙等”。这个时候就需要reclaim action在不同的queue之间重新资源均衡。

Reclaim action尝试驱逐那些资源使用量已经大于配额的queue下的Pod，并把这部分资源分配给资源使用量还没有得到满足的queue。Reclaim action保证了集群资源分配的灵活性，防止queue之间出现相互驱逐的震荡现象。



### Elect

#### 简介

Elect action完成资源预留的目标作业识别，属于调度流程中的可选部分。Elect action首先找到集群中处于pending状态的Job，然后根据reservation plugin中的资源预留机制的选取target job。Election action必须配置在enqueue action和allocate action之间。

#### 场景

- 作业条件：v1.1.0实现版本选择优先级最高且等待时间最长的作业作为目标作业。这样不仅可以保证紧急任务场景优先被调度，等待时间长度的考虑默认筛选出了资源需求较多的作业。

- 作业数量：目标作业可以是单个也可以成组。考虑到资源预留必然引起调度器性能在吞吐量和延时等方面的影响，v1.1.0采用了单个目标作业的方式。

- 识别方式：识别方式可以是自动识别或自定义配置。目前仅支持**自动识别**方式，即调度器在每个调度周期自动识别符合条件和数量的目标作业，并为其预留资源。后续版本将考虑在全局和Queue粒度支持自定义配置。




### Reserve

#### 简介

Reserve action完成资源预留。将选中的目标作业与节点进行绑定。Reserve action、elect  action 以及Reservation plugin组成了资源预留机制。Reserve action必须配置在allocate action之后。

#### 场景

在实际应用中，常见以下两种场景：

- 在集群资源不足的情况下，假设处于待调度状态的作业A和B，A资源申请量小于B或A优先级高于B。基于默认调度策略，A将优先于B进行调度。在最坏的情况下，若后续持续有高优先级或申请资源量较少的作业加入待调度队列，B将长时间处于饥饿状态并永远等待下去。
- 在集群资源不足的情况下，假设存在待调度作业A和B。A优先级低于B但资源申请量小于B。在基于集群吞吐量和资源利用率为核心的调度策略下，A将优先被调度。在最坏的情况下，B将持续饥饿下去。

因此我们需要一种公平调度机制:保证因为某种原因长期饥饿达到临界状态之后被调度。作业预留机制的就是这样一种公平调度机制。

资源预留机制需要考虑节点选取、节点数量以及如何锁定节点。volcano资源预留机制采用节点组锁定的方式为目标作业预留资源，即选定一组符合某些约束条件的节点纳入节点组，节点组内的节点从纳入时刻起不再接受新作业投递，节点规格总和满足目标作业要求。需要强调的是，目标作业将可以在整个集群中进行调度，非目标作业仅可使用节点组外的节点进行调度。



### Backfill

#### 简介

Backfill action是调度流程中的回填步骤，处理待调度Pod列表中没有指明资源申请量的Pod调度，在对单个Pod执行调度动作的时候，遍历所有的节点，只要节点满足了Pod的调度请求，就将Pod调度到这个节点上。

#### 场景

在一个集群中，主要资源被“胖业务”占用，例如AI模型的训练。Backfill action让集群可以快速调度诸如单次AI模型识别、小数据量通信的“小作业” 。Backfill能够提高集群吞吐量，提高资源利用率。

