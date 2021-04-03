+++
title =  "Plugins"

date = 2021-04-02
lastmod = 2021-04-02

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Plugins"
[menu.docs]
  parent = "scheduler"
  weight = 3
+++


### Binpack

```
Struct PriorityWeight: Bingpacking cpu/mem/weight

Func calculateWeight
Func nodeOrderFn
    BinPackingScore(task , node , bp.weight)
Func BinPackingScore
    ResourceBinPackingScore
Func ResourceBinPackingScore
    Return usedFinally / capacity
```

#### 逻辑

模拟`task`与`node`的分配，基于`node`当前的资源分配情况等参数，进行打分。分数越高表示资源占比越高。尽可能填满`node`，需要整块资源的但又无法回收`node`资源的任务可能会被饿死。

#### 场景

小资源任务有利，类似大数据查询任务：电子图书查询、双十一秒杀场景等高并发查询、订单生成等互联网高并发服务场景，任务很小，但是吞吐量很大。资源非常有限，尽量减少碎片。对大资源任务不会优先调度.虽然可能会饿死但是也容易留有整块`node`资源。



### Priority

优先级调度，对象job、task

```
AddTaskOrderFn
preemptableFn
```

#### 逻辑

按照优先级`priority`进行抢占。`job`的`priority`根据`priorityClassName`

`Task`根据`priorityClassName` , `creatTime` , `id`依次确定优先级。

#### 场景

抢占频率很高的场景。实时性任务/普通任务，例如金融场景。

物联网实时应用场景（视频流数据检测），语音交互，站内搜索应用。



### Gang

```
对象：job = [task1 , task2,...,]，容器组
Vtn = job.VaildTaskNum ?  job.MinAvailable（该job的baseline）
task数量较大---> accept
task较小   ---> refused
preemptableFn //以job的priority进行preemptable判断
```

#### 逻辑

即job能够运行的`task`必须有一个`minAvilable`保证，如果没有，则全部拒绝。

#### 场景

AI训练场景需要数据的采集、清洗，模型训练迭代调优，需要一系列的`task`互相协调，具有一定同步性。需要相互协作。则将需要协作的若干`task`组成容器组，然后以组为整体进行调度。容器组下的`task`高度相关也可能存在资源争抢，整体调度分配，也可以解决死锁。



### Drf

```
对象：job
Struct hierarchicalNode //Tree node 
drfAttr
......

Struct drfAttr 
   Share
   dominantResource //优势资源
   allocated

Func resourceSaturated //判断资源是否饱和
Func buildHierarchy
Func updateHierarchicalShare //更新Tree，这个数据结构没有仔细看
Func PreemptFn
Func updateJobShare 
    updateShare

Func updateShare //输入数据是 drfAttr
    calculateShare

Func calculateShare 
   For rn in 资源表，share = 分配/总
      Res = max(Res , share)
      Update dominantResource

Func preemptable 
...
   Ls = calculateShare(lalloc ,  totalResource )
   Rs = calculateShare(ralloc,  totalResource)
   //上下文中 rs是被抢占单元
   If ls < rs   addVictim(preemptee)
...


```

#### 逻辑

`calculateShare`小的，优先级别高。前者的含义是`job`的`dominantResource`的占比评分。也就是说主要的申请资源占比小，优先考虑，尽可能多的完成多的`job`。

#### 场景

优先考虑集群的业务的吞吐量，适用单次IO/AI训练/大数据计算/查询等批处理任务。



### Proportion

```
名称：均衡，配比。
Struct: queue  ---> queueAttr
Build queueAttr for queue

For attr := range pp.queueOpts
Klog.V(4).infof(“considering queue<%s>:weight<%d>,total weight <%d>”)

//attr是管理queue权重之间的数据结构，total_weight表示所有queue的总和，weight表示当前queue的占比。呼应这个plugin的名字，它是queue层次之间的权重。

//同时还记录了queue deserved、allocated、request、share(resource)，并提供更新的方法。

updateQueueDeserved\updateQueueAllocted
updateQueueRequest\updateQueueWeight

对queue中的podgrou状态管理
updateQueuePodGroupInqueueCount
updateQueuePodGroupPendingCount
updateQueuePodGroupRunningCount
updateQueuePodGroupUnknownCount

AddJobEnqueueableFn //如果没有容量，一直进行入队操作，等待
AddOverusedFn//判断输入的queue是否超出过度使用（超过占比）
AddReclaimableFn// 基于attr的回收函数。
```

#### 逻辑

以`queue`为管理单元，然后不同`queue`之间按照权重分配共享资源。

#### 场景

调度弹性、灵活度方面的提升。不同的`queue`是不同类型的任务场景。大家共享集群的资源池，spark大数据场景存储密集，但是cpu也需要；ai任务GPU、cpu密集，存储也需要。MPI任务通信密集，cpu、存储资源相对较少。针对公共的资源池，根据不同的queue(任务类型)对资源的占比权重不同来进行划分。



### Affinity

#### 逻辑

这里简单介绍`pod affinity`（还有`pod-node affinity`），处理对象是`pod`，按照亲和性对pod的划分。`pod affinity`  ---> 位置拓扑 --->标签。例如标签是hostname，具有`pod affinity`表示分配在同一`node`

#### 场景

基于同一`node`的位置来分析场景：

`Affinity`：

- 通信/网络密集，同一`node`通信速度极其快。并行计算openMPI。
- 任务之间具有高度依赖性，任务之间需要高度同步如AI的模型训练场景。

`Anti-Affinity`：

- 业务服务器的主从备份，保证一个服务器磐机，另一个可以继续稳定运行。
- 任务之间需要互斥访问共享资源。



### Predicates   

```
能否进行预测，和GPU是否可以share有关系。
Struct predicateEnable{gpuSharingEnable bool}          

Func enablePredicate
Predicate := predicateEnable{//初始化一下
gpuSharingEnable : false

Func Deallocate//根据gpushare情况解分配
Func OnSessionOpen
Pl = util.newPodLister
Pods = pl.List
nodeMap , nodeSlice
Predicate := enablePredicate
/*register event handlers*/ 
update task info in PodLister & nodeMap
Id:= predicateGPU
```

#### 概括

按照GPU是否可以共享，对任务进行预选。

#### 场景

GPU主要是ai的模型训练，针对ai场景中需求GPU的任务，可以快速的筛选出来，然后进行集中调度。
    
### Nodeorder                                                                                                                                                                                                                                                                           
```
 Strict priorityWeight{
    //优选参数,暂时只听哦那个了如下的参数，后续可能会扩展
    leastReqWeight
   mostReqWeight
    nodeAffinityWeight
    podAffinityWeight 
    balancedResourceWeight
    }
    
    Func calculateWeights
    初始化一下
    核验参数是否被提供，如果提供了，在weight结构体里修改
    Check1
    Check2
    Check3
    ...
    Return weight
        
    
    Func OnSessionOpen
    Weight := calculateWeight()
    pl := until.newPodLister//调用了util
    Pods:= pl.list()
    nodeMap , nodeSlice
    /*register event handlers*/
    
```

#### 概括

调度优选，这个调度的关键是对`priorityWeight`的理解。对`node`打分，参数由用户来配置。参数包含了`Affinity`;参数中包含`reqResource`，其在DRF中的核心，还包括`LeastReqResource`、`MostReqResource`、`balanceReqResouce`，更高层次的综合的配比。通过各个维度的权，给节点打分，为任务找到最合适的`node`。

#### 场景

综合复杂任务调度，为用户开放手动配置权重更宏观的自主调度调优。



### Reservation

```
func getHighestPriorityJobs
Func OnSessionOpen
/*select the job which has the highest priority and waits for the longest duration*/
```

#### 场景

解决饿死现象。考虑以下两种情景。

- A.req < B.req && A.priority > B.priority,在一些默认调度情形下，优先级优先，如果持续的A类的job进入调度，B被饿死。
- A.req < B.req && A.priority < B.priority，在以集群吞吐和资源利用率的调度策略下，类似上面提到的Drf，B饿死。

一种公平调度机制:保证因为某种原因长期饥饿达到临界状态之后被调度。

被饿死的场景有很多:

- 资源申请量不够的问题

- 优先级持续低下

- 调度系统抢占过多

- 亲和性无法满足等

  

### Conformance

```
For evictee range evictees
	If  classname == scheduling.SystemClusterCritical->skip
  If  classname == scheduling.SystemNodeCritical--->skip
	If  evictee.namespace == v1.namespaceSystem--->skip
```

#### 逻辑

筛选`evictee`中，一些`job`满足某些情况，不能被驱逐。

#### 场景

用户通过配置，可以强制保护某一类任务不会被牺牲/抢占。    


