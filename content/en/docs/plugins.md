+++
title =  "Plugins"

date = 2021-04-07
lastmod = 2021-04-07

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

{{<figure library="1" src="binpack.png" title="binpack">}}

#### Logic

Simulate the assignment of 'task' and 'node', score based on the current resource allocation of 'node' and other parameters. The higher the score, the higher the proportion of resources. Fill 'node' as much as possible. Tasks that require a whole chunk of resources but cannot reclaim 'node' resources may starve to death.

#### Scene

Small resource tasks are advantageous, similar to big data query tasks: e-book query, double eleven second kill scene and other high concurrent query, order generation and other high concurrent Internet service scenes, the task is small, but the throughput is large. Resources are very limited and fragmentation is minimized. Large resource tasks are not prioritized for scheduling. You may starve to death, but it's also easy to leave a chunk of node resources.



### Priority

```
Priority scheduling, objects Job, Task
AddTaskOrderFn
preemptableFn
```
#### Logic

Preemption by priority 'priority'. The priority of 'job' is based on 'priorityClassName'

'Task' determines the priority according to 'priorityClassName', 'creatTime', 'id'.

#### Scene

It is suitable for scenarios with high preemption frequency. Real-time tasks/normal tasks, such as financial scenarios\Internet of Things real-time application scenarios\video stream data detection\voice interaction\site search applications.



### Gang

```
object：job = [task1 , task2,...,]，Container group
Vtn = job.VaildTaskNum ?  job.MinAvailable（this job's baseline）
   job.VaildTaskNum > job.MinAvailable---> accept
   job.VaildTaskNum < job.MinAvailable---> refused
preemptableFn 
```

{{<figure library="1" src="gang.png" title="gang">}}

#### Logic

Task must have a 'minAvilable' guarantee. If it does not have a 'minAvilable' guarantee, it must be rejected.

#### Scene

AI training scenes need data collection and cleaning, model training iterative tuning, and a series of 'tasks' need to coordinate with each other with certain synchronicity. They need to work together. Several 'tasks' that need to collaborate are grouped into container groups and then scheduled as a whole. Container groups under the 'task' highly correlated may also exist resource scramble, overall scheduling allocation, can also solve the deadlock.



### Drf

```
object：job
Struct hierarchicalNode //Tree node 
drfAttr
......

Struct drfAttr 
   Share
   dominantResource //Advantage resources
   allocated

Func resourceSaturated 
    //Determine whether the resource is saturated
Func buildHierarchy
Func updateHierarchicalShare 
Func PreemptFn
Func updateJobShare 
    updateShare

Func updateShare //input data drfAttr
    calculateShare

Func calculateShare 
   For rn in resource_list，share = located/all
      Res = max(Res , share)
      Update dominantResource

Func preemptable 
...
   Ls = calculateShare(lalloc ,  totalResource )
   Rs = calculateShare(ralloc,  totalResource)
   //rs is the preempted unit
   If ls < rs   addVictim(preemptee)
...


```
{{<figure library="1" src="drf.png" title="drf">}}
#### Logic

Calculateshare is small and has high priority. The former means the proportion score of 'Job's' Dominant Resource '. That is to say, the proportion of main application resources is small, give priority to, try to complete as many jobs as possible.

#### Scene

Priority is given to the throughput of the clustered business, which is suitable for batch tasks such as single IO/AI training/big data calculation/query.



### Proportion

```
Struct: queue  ---> queueAttr
Build queueAttr for queue

For attr := range pp.queueOpts
Klog.V(4).infof(“considering queue<%s>:weight<%d>,total weight <%d>”)

//Attr is the data structure that manages the weights of a queue, total_weight represents the sum of all queues, and weight represents the proportion of the current queue. Echoing the name of the plugin, it is the weight between Queue levels.

//At the same time, it also records queue, allocated, request, share(resource), and provides updated methods.

updateQueueDeserved\updateQueueAllocted
updateQueueRequest\updateQueueWeight

Manage the state of PodGrou in Queue
updateQueuePodGroupInqueueCount
updateQueuePodGroupPendingCount
updateQueuePodGroupRunningCount
updateQueuePodGroupUnknownCount

AddJobEnqueueableFn 
  //If there is no capacity, keep queuing and wait
AddOverusedFn
  //Determine whether the queue input exceeds the overuse (exceeds the proportion).
AddReclaimableFn
```
{{<figure library="1" src="proportion.png" title="proportion">}}
#### Logic

Queue is taken as the management unit, and shared resources are allocated according to weight among different Queues.

#### Scene

Scheduling flexibility, flexibility of the improvement. Different queues are different types of task scenarios. Everyone shares the resource pool of the cluster. Spark's big data scenarios are memory intensive, but CPU is also required. AI tasks are GPU, CPU intensive, and storage is also required. MPI task communication intensive, CPU, storage resources are relatively few. According to the common resource pool, the queue(task type) is divided according to the different proportion weight of the resource.



### Affinity

#### Logic

Here is a brief introduction`pod affinity`&`pod-node affinity`.The processing object is `pod`.

`Pod affinity`  ---> Position topology --->tag.For example, the tag is hostname，so`pod affinity` represents distribution in the same `node`.

#### Scene

based on the distribution in the same `node`.

`Affinity`：

- Communication/network intensive，The same node communicates extremely fast.Parallel computing OpenMPI.
- Tasks are highly dependent and synchronized.For example, distributed AI training scenarios.

`Anti-Affinity`：

- Master-slave backups of business servers to ensure that one server can continue to run stably.
- Tasks need mutually exclusive access to shared resources.



### Predicates   

```
Whether the prediction can be made is related to whether the GPU can share.

Struct predicateEnable{gpuSharingEnable bool}          
Func enablePredicate
Predicate := predicateEnable{
gpuSharingEnable : false

Func Deallocate//Resolve allocation according to GPushare case
Func OnSessionOpen
Pl = util.newPodLister
Pods = pl.List
nodeMap , nodeSlice
Predicate := enablePredicate
/*register event handlers*/ 
update task info in PodLister & nodeMap
Id:= predicateGPU
```

#### Logic

Preselect tasks based on whether the GPU can be shared or not.

#### Scene

GPU is mainly the model training of AI. Tasks requiring GPU in AI scenes can be quickly screened out and then centralized scheduled.
    
### Nodeorder                                                                                                                                                                                                                                                                           
```
 Strict priorityWeight{
    leastReqWeight
    mostReqWeight
    nodeAffinityWeight
    podAffinityWeight 
    balancedResourceWeight
    }
    
    Func calculateWeights
    init
    Check whether the parameters are provided, and if so, modify them in the weight structure
    Check1
    Check2
    Check3
    ...
    Return weight
        
    
    Func OnSessionOpen
    Weight := calculateWeight()
    pl := until.newPodLister//util
    Pods:= pl.list()
    nodeMap , nodeSlice
    /*register event handlers*/
    
```

#### Logic

Scheduling optimization. The key to this scheduling is the understanding of `priorityWeight`. Rate `node` with parameters configured by the user. The parameter contains `Affinity` ; The parameter includes `reqResource` , the core of which in DRF, and also includes  `LeastReqResource`, `MostReqResource`, `balanceReqResouce`, the higher level of comprehensive matching. Through the weight of each dimension, the node is scored to find the most appropriate `node` for the task.

#### Scene

Comprehensive complex task scheduling, open to users manual configuration weight more macro autonomous scheduling tuning.



### Reservation

```
func getHighestPriorityJobs
Func OnSessionOpen
/*select the job which has the highest priority and waits for the longest duration*/
```

{{<figure library="1" src="reserve.png" title="reservtion  framework">}}

#### Logic

To solve the problem of starvation. Consider the following two scenarios.

- A.req < B.req && A.priority > B.priority,In some default scheduling cases, precedence takes precedence, and if persistent A jobs come into the schedule, B dies of starvation.
- A.req < B.req && A.priority < B.priority.Under a scheduling strategy with cluster throughput and resource utilization, similar to DRF mentioned above, B starved to death.

Therefore, we need a fair scheduling mechanism that ensures that chronic hunger for some reason reaches a critical state when it is dispatched. Job reservation is such a fair scheduling mechanism.

**Target job identification**: job selection takes the job with the highest priority and the longest waiting time as the target job. In this way, not only can urgent tasks be scheduled in priority, but the consideration of waiting time will select the jobs with more resource requirements by default. Considering the impact of scheduler performance in terms of throughput and latency, a single target job is adopted.

**Resource reservation algorithm**, including the following core aspects:

- Node selection

  Node selection mainly has two selection algorithms: specification first, idle first. Specification priority means that all nodes in the cluster are sorted in descending order according to the main specification (resource specification for target job application). The first N nodes are selected to be included into the node group, and the total resource of the N nodes meets the application quantity. Idle priority means that all nodes in the cluster are sorted in descending order according to the amount of idle resources of the main resource type (resource type of target job application). The first N nodes are selected to be included into the node group, and the total amount of resources of these N nodes meets the application amount. The specification used in the V1.1.0 implementation takes precedence.

- Number of nodes

  In order to minimize the impact of locking operation on the comprehensive performance of the scheduler, under the premise of satisfying the application amount of reserved resources, no matter which node selection algorithm is adopted, the minimum number of nodes selected should be guaranteed.

- Locking

  There are three ways of locking: single node, multi-node and cluster locking. The V1.1.0 implementation is single-node locking. There are two ways to lock the existing load on a node: preemptive reservation and non-preemptive reservation. Preemptive reservation, as the name suggests, will force out the existing load on the locked node. This approach ensures that the required resource requests can be vacated as quickly as possible, but it will have a significant impact on the existing business, so it is only suitable for urgent tasks. Non-preemptive reservation does nothing after a node is locked and waits for the load running on it to terminate itself. V1.1.0 uses non-preemptive reservation.

#### Scene

The selection method of specification first has the advantages of simple implementation, minimum number of locked nodes and friendly scheduling for target jobs (the total amount of locked resources in this way is usually larger than the total amount of application, and each POD in the job is easy to gather and schedule on the locked nodes, which is conducive to communication among PODs, etc.). The disadvantage is that the large probability of locked resources is not the optimal solution, the comprehensive scheduling performance loss (throughput, scheduling time), easy to produce large resource fragmentation.



### Conformance

```
For evictee range evictees
	If  classname == scheduling.SystemClusterCritical->skip
  If  classname == scheduling.SystemNodeCritical--->skip
	If  evictee.namespace == v1.namespaceSystem--->skip
```

#### Logic

In filtering 'evictee', some 'jobs' meet certain conditions and cannot be ejected.

#### Scene

Users can enforce protection against sacrificial/preemptive tasks of a certain class through configuration.


