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



### Gang

{{<figure library="1" src="gang.png" title="gang plugin">}}

#### Overview

The Gang scheduling strategy is one of the core scheduling algorithms of the Volcano-Scheduler. It meets the scheduling requirements of "All or nothing" in the scheduling process and avoids the waste of cluster resources caused by arbitrary scheduling of Pod. The Gang scheduler algorithm is to observe whether the scheduled number of Pods under Job meets the minimum number of runs. When the minimum number of runs of Job is satisfied, the scheduling action is executed for all Pods under Job; otherwise, it is not executed.

#### Scenario

The Gang scheduling algorithm based on the container group concept is well suited for scenarios that require multi-process collaboration. AI scenes often contain complex processes. Data Ingestion, Data Analysts, Data Splitting, trainers, Serving, Logging, etc., which require a group of containers to work together, are suitable for container-based Gang scheduling strategies. Multi-thread parallel computing communication scenarios under MPI computing framework are also suitable for Gang scheduling because master and slave processes need to work together. Containers under the container group are highly correlated, and there may be resource contention. The overall scheduling allocation can effectively solve the deadlock.

In the case of insufficient cluster resources, the scheduling strategy of Gang can significantly improve the utilization of cluster resources.

### Binpack

{{<figure library="1" src="binpack.png" title="binpack plugin">}}

#### Overview

The goal of the BinPack scheduling algorithm is to fill as many existing nodes as possible (try not to allocate blank nodes). In the concrete implementation, BinPack scheduling algorithm scores the nodes that can be delivered, and the higher the score, the higher the resource utilization rate of nodes. Binpack algorithm can fill up the nodes as much as possible to close the application load to some nodes, which is very conducive to the automatic expansion capacity function of K8s cluster nodes.

The BinPack algorithm is injected into the Volcano-Scheduler process as a plug-in and will be applied during the Pod stage of node selection. When calculating the Binpack algorithm, the Volcano-Scheduler considers the various resources requested by Pod and averages them according to the weights configured for each resource. The weight of each resource in the node score calculation is different, depending on the weight value configured by the administrator for each resource. Different plug-ins also need to assign different weights when calculating node scores, and the Scheduler also sets the score weights for BinPack plugins.

#### Scenario

The BinPack algorithm is good for small jobs that can fill as many nodes as possible. For example, the single query job in the big data scene, the order generation in the e-commerce seckill scene, the single identification job in the AI scene, and the high concurrency service scene on the Internet, etc. This scheduling algorithm can reduce the fragmentation in the node as much as possible, and reserve enough resource space on the idle machine for Pod which has applied for more resource requests, so as to maximize the utilization of idle resources under the cluster.



### Priority

{{<figure library="1" src="fair-share.png" title="fair-share调度">}}

#### Overview

The Priority Plugin provides the implementation of job, Task sorting, and PreempTablefn, a function that calculates sacrifice jobs. Job sorting according to priorityClassName, the task of sorting by priorityClassName, createTime, id in turn.

#### Scenario

When the cluster runs multiple jobs but is low on resources, and each Job has a different number of Pods waiting to be scheduled, if you use the Kubernetes default scheduler, the Job with more Pods will eventually get more of the cluster's resources. In this case, the Volcano-Scheduler provides algorithms that enable different jobs to share cluster resources in a fair-share.

The Priority Plugin enables users to customize their job and task priorities, and to customize scheduling policies at different levels according to their own needs. Priority is arranged according to Job's PriorityClassName at the application level. For example, there are financial scenarios, Internet of Things monitoring scenarios and other applications requiring high real-time performance in the cluster, and the Priority Plugin can ensure that they are scheduled in Priority.



### DRF

{{<figure library="1" src="drf.png" title="Drf plugin">}}

#### Overview

The full name of DRF scheduling algorithm is Dominant Resource Fairness, which is a scheduling algorithm based on the container group Domaint Resource. Domaint Resource is the largest percentage of all required resources for a container group. The DRF algorithm selects the Domaint Resource that is the smallest in a series of container groups for priority scheduling. This can meet more job, not because a fat business, starve a large number of small business. DRF scheduling algorithm can ensure that many types of resources coexist in the environment, as far as possible to meet the fair principle of allocation.

#### Scenario

The DRF scheduling algorithm gives priority to the throughput of the business in the cluster and is suitable for batch small business scenarios such as a single AI training, a single big data calculation and a query.



### Proportion

{{<figure library="1" src="proportion.png" title="proportion plugin">}}

#### Overview

Proportion scheduling algorithm uses the concept of queue to control the Proportion of total resources allocated in the cluster. Each queue allocates a certain proportion of cluster resources. For example, there are three teams that share A pool of resources on A cluster: Team A uses up to 40% of the total cluster, Team B uses up to 30%, and Team C uses up to 30%. If the amount of work delivered exceeds the team's maximum available resources, there is a queue.

#### Scenario

Proportion scheduling algorithm improves the flexibility and elasticity of cluster scheduling. The most typical scenario is that when multiple development teams in a company share a cluster, this scheduling algorithm can handle the requirements of shared resource matching and isolation between different departments very well. In multi-service mixed scenarios, such as computation-intensive AI business, network IO-intensive MPI and HPC business, and storage-intensive big data business, Proportion scheduling algorithm can allocate shared resources according to demand through matching.



### Task-topology

#### Overview

The task-topology algorithm is an algorithm that computes the priority of tasks and nodes based on the affinity and anti-affinity configuration between tasks within a Job. By configuring the affinity and anti-affinity policies between tasks within the Job and using the Task-Topology algorithm, tasks with affinity configurations can be scheduled to the same node first, and PODs with anti-affinity configurations to different nodes.

#### Scenario

node affinity：

- Task-topology is important for improving computational efficiency in deep learning computing scenarios. Using the TensorFlow calculation as an example, configure the affinity between "ps" and "worker". Task-topology algorithm enables "ps" and "worker" to be scheduled to the same node as far as possible, so as to improve the efficiency of network and data interaction between "ps" and "worker", thus improving the computing efficiency.
- Tasks in HPC and MPI scenarios are highly synchronized and need high-speed network IO.

Anti-affinity：

- Take the TensorFlow calculation as an example, the anti-affinity between "ps" and "ps"

- Master and slave backup of e-commerce service scene, data disaster tolerant, to ensure that there are spare jobs to continue to provide service after a job fails.

  

### Predicates   

#### Overview

The Predicate Plugin calls the PredicateGPU with pod and nodeInfo as parameters to evaluate and pre-select jobs based on the results.

#### Scenario

In AI scenarios where GPU resources are required, the Predicate Plugin can quickly filter out those that require the GPU for centralized scheduling.
    

### Nodeorder                                                                                                                                                                                                                                                                           

#### Overview

The NodeOrder Plugin is a scheduling optimization strategy that scores nodes from various dimensions through simulated assignments to find the node that is best suited for the current job. The scoring parameters are configured by the user. The parameter contains the Affinity、reqResource、LeastReqResource、MostResource、balanceReqResouce.

#### Scenario

NodeOrder Plugin provides scoring criteria of multiple dimensions for scheduling, and the combination of different dimensions enables users to flexibly configure appropriate scheduling policies according to their own needs.



### Conformance

#### Overview

The Conformance Plugin filters the sacrifice pages, and jobs in the mission name space of Kube-System cannot be expelled. It ensures that critical resources of the system are not forced to be recycled.

#### Scenario

The Conformance Plugin protects operations under the kube-system namespace that guarantee the proper operation of the entire cluster. Users can also use the template they provide to protect businesses in certain namespaces from preemption.



### Reservation

{{<figure library="1" src="reserve.png" title="Resource Reservation Framework">}}

#### Overview

Resource reservation algorithm, including the following core aspects:

- Node selection: specification first/idle first

  1.Specification priority means that all nodes in the cluster are sorted in descending order according to the main specification (resource specification for target job application), and the first N nodes are selected to be included into the node group, and the total resource of the N nodes meets the application quantity. In the implementation of Volcano, specifications are used first.

  2.Idle priority means that all nodes in the cluster are sorted in descending order according to the amount of idle resources of the main resource type (resource type of target job application). The first N nodes are selected to be included into the node group, and the total amount of resources of the N nodes meets the application amount.

- Node number: In order to minimize the impact of locking operation on the overall performance of the scheduler, under the premise of satisfying the application amount of reserved resources, the number of nodes selected should be minimum no matter which node selection algorithm is adopted.

- Locking

  There are three ways of locking: single node, multi-node and cluster locking. Volcano is implemented by single node locking. There are two ways to lock the existing load on a node: preemptive reservation and non-preemptive reservation. Preemptive reservation, as the name suggests, will force out the existing load on the locked node. This approach ensures that the required resource requests can be vacated as quickly as possible, but it will have a significant impact on the existing business, so it is only suitable for urgent tasks. Non-preemptive reservation does nothing after a node is locked and waits for the load running on it to terminate itself. V1.1.0 uses non-preemptive reservation.

#### Scenario

The advantages of specification first selection are simple implementation, minimum number of locked nodes, and friendly scheduling for target jobs. In this way, the total amount of locked resources is often larger than the total amount of application, and each Pod in the job is easy to gather and schedule in the locked node, which is conducive to communication among Pods. The disadvantage is that the large probability of locked resources is not the optimal solution, the comprehensive scheduling performance loss (throughput, scheduling time), easy to produce large resource fragmentation.