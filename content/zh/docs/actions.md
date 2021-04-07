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

```
Queues
QueueMap
jobsMap

//扫描一遍job，初始化上面三个数据结构
For job in ssn.Jobs 
  //过滤1
  found := ssn.Queues[job.Queue]
  existed := queueMap[queue.UID]
  //过滤2
  if job.PodGroup.Status.Phase == scheduling.PodGroupPending
     found := jobsMap[job.Queue];
     
/*更新node资源使用情况*/
For node in ssn
   Update Total_nodes
   Update Used_nodes

/*反复enqueue操作*/
While(!queues.Empty()){
  /*资源不足 结束enqueue操作*/
   if idle.IsEmpty() break
   //deal with target job , if exists , judege whether it can be
   minReq <--- job
   idle   <--- node资源
   if node资源足够 
          inqueue := true;
   if inqueue
       enqueue
   Queues.push(queue)
} 

```

#### 逻辑

筛选符合要求的任务进入待调度队列。过滤条件主要是对应任务再QueueMap是否存在，node是否满足任务的最小资源需求量minReq。

####  场景

任务调度的准备过程，符合要求可以被调度的任务enqueue。任务状态由pending变为enqueue





### Allocate 

```
step1. pick a namespace named N (using ssn.NamespaceOrderFn)
step2. pick a queue named Q from N (using ssn.QueueOrderFn)
step3. pick a job named J from Q (using ssn.JobOrderFn)
step4. pick a task T from J (using ssn.TaskOrderFn)
step5. use predicateFn to filter out node that T can not be allocated on.
step6. use ssn.NodeOrderFn to judge the best node and assign it to T
```

#### 逻辑

<task,node>的绑定工作，包含预选和优选过程。使用predicateFn来过滤不能分配的node，使用NodeOrderFn打分来找到最好的node。

#### 场景

allocate从namespce层次开始遍历，不同的namespace可以代表不同业务的任务集合，这将有助于处理多类型的复杂业务场景的资源分配功能。不同的业务场景可以注册合适的调度算法(plugins中实现了多种具体的调度策略)



### Preempt

```
//Queue内Jobs之间的抢占
For queue in queues //枚举queue
若干抢占条件的过滤  
//job内task的抢占
For job in range underRequest
若干抢占条件过滤

```

#### 逻辑

这里抢占分为两个粒度，能够看到必须是同一个Queue下的job抢占，或者同一job下的task抢占。

#### 场景

- Queue的粒度：相似的场景下发的任务进入到一个Queue中，多个Queue之间不存在资源的抢占。多个Queue之间对集群资源进行比例分配。在很多复杂的调度场景，按照业务对基本资源(cpu、磁盘、GPU、内存、网络带宽)的需求进行分类分组： 计算密集的场景如AI、高性能科学计算所对应的Queue的资源划分cpu、GPU、内存等计算资源需求高；spark框架等大数据场景磁盘需求高，等等。不同的Queue对资源的分配虽然是共享的，但如果AI场景抢占了所有的cpu资源，会导致别的场景对应的Queue中的任务饿死。因此分配基于Queue的粒度，就是为了保证资源的业务吞吐量。

- job的粒度：同一job的task进行抢占，能够保证某些特定业务下特定功能的高实时性要求。例如spark大数据场景，针对一些批处理的功能，实时性要求不高;针对实时数据流的CRUD业务，需要快速反馈结果。此时就需要job内部进行抢占。



### Reclaim

```
输出正在调度的Jobs和Quenes的数量(reclaim针对的对象)
For job in ssn
    1.等待调度的job拒绝reclaim
    2.拒绝被reclaim的情况（有效job），具体的原因和信息抽象掉了
    3.Job的对应Queue found异常，不需要recliam
       ADD一个Queue
       更新queueMap
       更新queues
    4. //既然没有交互信息姑且理解为这个循环的主要过程 筛选[符合要求的Job]

更新preemptorsMap(下面的迭代会用)
更新preemptorTasks

While(!Queues.Empty())
  Queue  = Queues.pop()//出队一个元素
  If  Overused --> continue 
  Found high priority job
  Found high priority task to reclaim others

   If found:= preemptorTasks[job.UID] 判断task是否在抢占映射job-Task中。没有发现 ==> high priority task ==> 不进行操作continue;

For n in ssn.Nodes://开始操作资源层的节点
   If predicates fialed  -> continue
  //predicates基于task - n的预判函数predicateFn
  //开始考察在n上所有的Task（是否reclaim）

For task on n
   Not running task -> continue;
   [Job , Task] not found -> continue;
   //clone task to avoid modify Task ‘s status on node n
   Update reclainmees
   确定牺牲品victims（reclaim的对象）

Start to Reclaim...
```

#### 逻辑

当新的任务进入等待调度队列，集群资源无法满足，进行资源回收。相对于preempt主动强占，这是一种被迫触发的抢占。

#### 场景

当任务负载超过系统资源量时，例如双十一秒杀、红包雨等访问量骤升的场景，需要关注reclaim的配置，具体而言和preempt是很相似的过程。



### Elect

```
//select the target job which is of  the highest priority and waits for the longest time

For job in ssn.Jobs
If job.PodGroup.status.phase == scheduling.podGroupPending
pendingJobs <---- this job
Print these jobs which have been elected
```

#### 逻辑

完成Job选取工作，给出ssn.jobs，当job满足某个状态条件的时候，直接就可以把这个job加入到pendingJobs这个数据结构中。执行volcano的资源预留机制的目标作业选取动作。

#### 场景

这个模块提供了选择高优先、长等待的job，属于进行调度之前的预选工作，适宜在各种调度场景(分配、抢占、预留等)之前的模块。



### Reserve

```
//select a node which is not locked and has the most idle resoure
targetJob(if there is not a targetJob return)

if target job has not been scheduled, select a locked node for it
else reset target job and locked nodes
```

#### 逻辑

`job`,`node`进行绑定。抽象了`ReserveNodes`。与`elect`和`plugins`中的`reservation`一起组成了资源预留机制。在资源预留机制中执行资源预留动作。

#### 场景

和preempt抢占模块类似，最终是需要处理`job`和`node`绑定关系。用于资源预留，进行调度前的准备工作。



### Backfill

```
For job in jobs
  If job.podGroup.status.phase == scheduling.podGroupPending
     Continue

Some reasons ----> skip backfill
For task in job
    For node in ssn.nodes
      predicateFn
      Allocate
```

#### 逻辑

本质上也是task和node绑定的过程，通常发生在最后一步。用于充分利用节点内部的资源碎片，能够很好的调度小需求任务。

#### 场景

有效的利用节点资源的内碎片，提高集群的吞吐量。