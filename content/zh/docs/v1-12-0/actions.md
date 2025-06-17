+++
title =  "Actions"

date = 2021-04-07
lastmod = 2025-01-21

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Actions"
[menu.v1-12-0]
  parent = "scheduler"
  weight = 2
+++



### Enqueue

#### 简介

Enqueue action筛选符合要求的作业进入待调度队列。当一个Job下的最小资源申请量不能得到满足时，即使为Job下的Pod执行调度动作，Pod也会因为gang约束没有达到而无法进行调度。只有当集群资源满足作业声明的最小资源需求时，Enqueue action才允许该作业入队，使得PodGroup的状态由Pending状态转换为Inqueue状态。这个状态转换是Pod创建的前提，只有PodGroup进入Inqueue状态后，vc-controller才会为该PodGroup创建Pod。这种机制确保了Pod只会在资源满足的情况下被创建，是调度器配置中必不可少的action。

####  场景

Enqueue action是调度流程中的准备阶段，只有当集群资源满足作业调度的最小资源请求，作业状态才可由"pending"变为"enqueue"。这样在AI/MPI/HPC这样的集群资源可能不足的高负荷的场景下，Enqueue action能够防止集群下有大量不能调度的pod，提高了调度器的性能。

> 注意：enqueue action和preempt/reclaim action是互相冲突的，如果同时配置了enqueue action和preempt/reclaim action，且enqueue action判断作业无法入队，有可能导致无法生成Pending状态的Pod，从而无法触发preempt/reclaim action。


### Allocate 

#### 简介

Allocate action是调度流程中的正常分配步骤，用于处理在待调度Pod列表中具有资源申请量的Pod调度，是调度过程必不可少的action。这个过程包括作业的predicate和prioritize。使用predicateFn预选，过滤掉不能分配作业的node；使用NodeOrderFn打分来找到最适合的分配节点。

Allocate action遵循commit机制，当一个Pod的调度请求得到满足后，最终并不一定会为该Pod执行绑定动作，这一步骤还取决于Pod所在Job的gang约束是否得到满足。只有Pod所在Job的gang约束得到满足，Pod才可以被调度，否则，Pod不能够被调度。

#### 场景

在集群混合业务场景中，Allocate的预选部分能够将特定的业务（AI、大数据、HPC、科学计算）按照所在namespace快速筛选、分类，对特定的业务进行快速、集中的调度。在Tensorflow、MPI等复杂计算场景中，单个作业中会有多个任务，Allocate action会遍历job下的多个task分配优选，为每个task找到最合适的node。

### Backfill

#### 简介

Backfill action是调度流程中处理BestEffort Pod（即没有指定资源申请量的Pod）的调度步骤。与Allocate action类似，Backfill也会遍历所有节点寻找合适的调度位置，主要区别在于它处理的是没有明确资源申请量的Pod。

#### 场景

在集群中，除了需要明确资源申请的工作负载外，还存在一些对资源需求不明确的工作负载。这些工作负载通常以BestEffort的方式运行，Backfill action负责为这类 Pod寻找合适的调度位置。


### Preempt

#### 简介

Preempt action是调度流程中的抢占步骤，用于处理高优先级调度问题。Preempt用于同一个Queue中job之间的抢占，或同一Job下Task之间的抢占。

#### 场景

- Queue内job抢占：一个公司中多个部门共用一个集群，每个部门可以映射成一个Queue，不同部门之间的资源不能互相抢占，这种机制能够很好的保证部门资源的隔离性。多业务类型混合场景中，基于Queue的机制满足了一类业务对于某一类资源的集中诉求，也能够兼顾集群的弹性。例如，AI业务组成的queue对集群GPU占比90%，其余图像类处理的业务组成的queue占集群GPU10%。前者占用了集群绝大部分GPU资源但是依然有一小部分资源可以处理其余类型的业务。
- Job内task抢占：同一Job下通常可以有多个task，例如复杂的AI应用场景中，tf-job内部需要设置一个ps和多个worker，Preempt action就支持这种场景下多个worker之间的抢占。

### Reclaim

#### 简介

Reclaim action是调度流程中的**跨队列**资源回收步骤。与Preempt不同，Reclaim专门处理不同Queue之间的资源回收。当某个Queue中的作业需要资源且该Queue未超用时，可以从其他可回收队列中回收资源。

#### 场景

- 跨队列资源回收：在多部门共用集群的场景下，当高优先级部门（如在线业务部门）的Queue资源不足时，可以从其他可回收的部门Queue（如离线计算部门）回收资源。例如，在线业务Queue可以从离线业务Queue回收资源，但离线业务Queue之间不能互相回收资源。

- 资源利用率优化：通过跨队列资源回收机制，集群可以在保证高优先级业务SLA的同时，提高整体资源利用率。当高优先级Queue资源不足时，可以从低优先级Queue回收资源，确保关键业务的资源需求。

> 注意：
> 
> 1. Reclaim在执行时会检查多个条件：目标Queue是否可回收（Reclaimable）、任务是否可被回收（Preemptable）、资源回收后是否满足作业运行需求等，从而确保资源回收的合理性。
> 2. 要使Queue中的作业可以被其他Queue回收资源，需要在Queue的spec中将reclaimable字段设置为true。


