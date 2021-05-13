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

#### Intro

The Enqueue action filters qualified jobs into the queue to be scheduled. When the minimum number of resource requests under a Job cannot be met, even if the scheduling action is performed for a pod under a Job, pod will not be able to schedule because the "Gang" constraint is not reached. A state refresh from "Pending" to "Inqueue" can only happen if the minimum resource size of the job is met. In general, the Enqueue action is an essential action for the scheduler configuration.

####  Scence

Enqueue action is the preparatory stage in the scheduling process. Only when the cluster resources meet the minimum resource request for the job scheduling, the job state can be changed from "pending" to "Enqueue". In this way, Enqueue Action can prevent a large number of unscheduled pods in the cluster and improve the performance of the scheduler in the high-load scenarios where the cluster resources may be insufficient, such as AI/MPI/HPC.



### Allocate 

#### Intro

Allocate action is a essential step in a scheduling process，which is used to handle pod scheduling that has resource requests in the pod list to be scheduled.This process includes the predicates and priorities of jobs. Use the PredicateFn preselect to filter out nodes that cannot assign jobs. Use NodeOrderFn to score to find the most suitable allocation node.

The Allocate action follows the commit mechanism. When a pod's scheduling request is satisfied, a binding action is not necessarily performed for that pod. This step also depends on whether the gang constraint of the Job in which the pod resides is satisfied. Only if the gang constraint of the Job in which the pod resides is satisfied can the pod be scheduled; otherwise, the pod cannot be scheduled.

#### Scene

In a clustered mixed business scenario, the Allocate pre-selected part enables specific businesses (AI, big data, HPC, scientific computing) to quickly filter, sort, and schedule according to their namespace quickly and centrally. In a complex computing scenario such as TensorFlow or MPI, where there are multiple tasks in a single job, the Allocate action traversal multiple task allocation options under the job to find the most appropriate node for each task.



### Preempt

#### Intro

Preempt action is a preemption step in the scheduling process, which is used to deal with high-priority scheduling problems. It is used for preemption between jobs in the same queue, or between tasks under the same job.

#### Scene

- Preemption between jobs in the same queue: Multiple departments in a company share a cluster, and each department can be mapped into a Queue. Resources of different departments cannot be preempted from each other. This mechanism can well guarantee the isolation of resources of departments. In the mixed scenarios of multiple service types, the mechanism based on queue satisfies the centralized demand of one type of service for one type of resource, and also takes into account the elasticity of the cluster. For example, the queue composed of AI business accounts for 90% of the cluster GPU, while the queue composed of other image class processing business accounts for 10% of the cluster GPUs. The former occupies most of the GPU resources of the cluster but still has a small amount of resources to handle the other types of business.
- Preemption between tasks in the same job: Usually, there can be multiple tasks in the same Job. For example, in complex AI application scenarios, a parameter server and multiple workers need to be set inside the TF-job, and preemption between multiple workers is supported by preemption within such scenarios.



### Reclaim

#### Intro

Reclaim action is a scheduling process for a recovery step. A queue is used in the volcano to allocate resources proportionally. When a queue is added or removed from the cluster, Reclaim will take charge of recycling and redistributing resources to the remaining queues.

#### Scene

In the mixed batch computing business scenario (kubeflow/flink/tensorflow, etc.), different business in queue allocation the cluster resources, at this time, if a new business, Reclaim for new queue allocation ratio of cluster resources. However, once a new queue is allocated quotas, it does not indicate that pods under the queue can be properly scheduled, because the quota allocated to the queue at this point is only the upper limit for the use of cluster resources, and does not guarantee the use of the cluster. If the old business happens to be using up all the cluster resources, the new business will be "busy waiting." At this point, you needed reclaim action to rebalance resources between different queues. Reclaim action tried to evict pods from queues whose resource usage had exceeded the quota, and to allocate resources to queues whose resource usage had not been met.

Reclaim action tried to evict Pods from queues whose resource usage had exceeded the quota, and to allocate resources to queues whose resource usage had not been met. Reclaim action ensured the flexibility of cluster resource allocation and prevented the shock phenomenon of mutual expulsion among queues.



### Elect

#### Intro

The Elect Action is an optional part of the scheduling process to identify the target job for the resource reservation. The Elect action first finds the pending Job in the cluster and then selects the Target Job according to the reservation mechanism in the Reservation Plugin. The Election action must be configured between the enqueue action and the allocate action.

#### Scene

- Job condition: v1.1.0 selects the job with the highest priority and the longest waiting time as the target job. In this way, not only can urgent task scenarios be prioritized, but jobs with more resource requirements are selected by default due to the consideration of waiting time length.

- Number of jobs: The target job can be a single job or a group job. Considering the inevitable impact of resource reservation on scheduler performance in terms of throughput and latency, V1.1.0 uses a single target job approach.

- Identification mode: Identification mode can be automatic identification or custom configuration. Currently, only automatic identification mode is supported, in which the scheduler automatically identifies the target jobs that meet the conditions and number and reserves resources for them during each scheduling cycle. Subsequent releases will consider supporting custom configuration at both global and queue granularity.

  

### Reserve

#### Intro

The Reserve action completes the resource reservation. Bind the selected target job to the node. The Reserve action, the elect action, and the Reservation plugin make up the resource Reservation mechanism. The Reserve action must be configured after the allocate action.

#### Scene

In practical applications, there are two common scenarios as follows:

- In the case of insufficient cluster resources, it is assumed that for Job A and Job B in the state to be scheduled, the application amount of resource A is less than B or the priority of resource A is higher than that of job B. Based on the default scheduling policy, A will schedule ahead of B. In the worst case, if subsequent jobs with high priority or less application resources are added to the queue to be scheduled, B will be hungry for a long time and wait forever.

- In the case of insufficient cluster resources, assume that there are jobs A and B to be scheduled. The priority of A is lower than that of B, but the resource application amount is smaller than that of B. Under the scheduling policy based on cluster throughput and resource utilization as the core, A will be scheduled first. In the worst case, B will remain hungry.


Therefore, we need a fair scheduling mechanism that ensures that chronic hunger for some reason reaches a critical state when it is dispatched. Job reservation is such a fair scheduling mechanism.

Resource reservation mechanisms need to consider node selection, number of nodes, and how to lock nodes. Volcano resource reservation mechanism reserves resources for target operations in the way of node group locking, that is, select a group of nodes that meet certain constraints and include them into the node group. Nodes within the node group will not accept new job delivery from the inclusion moment, and the total specification of nodes meets the requirements of target operations. It is important to note that target jobs can be scheduled throughout the cluster, while non-target jobs can only be scheduled with nodes outside the node group.

### Backfill

#### Intro

Backfill action is a backfill step in the scheduling process. It deals with the pod scheduling that does not specify the resource application amount in the list of pod to be scheduled. When executing the scheduling action on a single pod, it traverse all nodes and schedule the pod to this node as long as the node meets the scheduling request of pod.

#### Scene

In a cluster, the main resources are occupied by "fat jobs", such as AI model training. Backfill actions allow the cluster to quickly schedule "small jobs" such as single AI model identification and small data volume communication. Backfill can improve cluster throughput and resource utilization.