+++
title =  "Actions"

date = 2021-04-07
lastmod = 2021-07-26

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




### Reserve

#### 简介

Reserve action从v1.2开始已经被弃用，并且被SLA plugin替代。

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

