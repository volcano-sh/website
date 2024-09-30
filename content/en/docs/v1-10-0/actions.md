+++
title =  "Actions"

date = 2024-09-29
lastmod = 2024-09-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Actions"
[menu.v1-10-0]
  parent = "scheduler"
  weight = 2
+++



### Enqueue

#### Overview

The Enqueue action filters qualified jobs into the queue to be scheduled. When the minimum number of resource requests under a Job cannot be met, even if the scheduling action is performed for a pod under a Job, pod will not be able to schedule because the "Gang" constraint is not reached. A state refresh from "Pending" to "Inqueue" can only happen if the minimum resource size of the job is met. In general, the Enqueue action is an essential action for the scheduler configuration.

####  Scenario

Enqueue action is the preparatory stage in the scheduling process. Only when the cluster resources meet the minimum resource request for the job scheduling, the job state can be changed from "pending" to "Enqueue". In this way, Enqueue Action can prevent a large number of unscheduled pods in the cluster and improve the performance of the scheduler in the high-load scenarios where the cluster resources may be insufficient, such as AI/MPI/HPC.



### Allocate 

#### Overview

This Action binds of <task , node> , including pre-selection and further selection.PredicateFn is used to filter out nodes that cannot be allocated,and NodeOrderFn is used to score the nodes to find the one that best fits.Allocate action is a essential step in a scheduling process，which is used to handle pod scheduling that has resource requests in the pod list to be scheduled.

The Allocate action follows the commit mechanism. When a pod's scheduling request is satisfied, a binding action is not necessarily performed for that pod. This step also depends on whether the gang constraint of the Job in which the pod resides is satisfied. Only if the gang constraint of the Job in which the pod resides is satisfied can the pod be scheduled; otherwise, the pod cannot be scheduled.

#### Scenario

In a clustered mixed business scenario, the Allocate pre-selected part enables specific businesses (AI, big data, HPC, scientific computing) to quickly filter, sort, and schedule according to their namespace quickly and centrally. In a complex computing scenario such as TensorFlow or MPI, where there are multiple tasks in a single job, the Allocate action traversal multiple task allocation options under the job to find the most appropriate node for each task.



### Preempt

#### Overview

The preempt action is used for resource preemption between jobs in a queue , or between tasks in a job.The preempt action is a preemption step in the scheduling process, which is used to deal with high-priority scheduling problems. It is used for preemption between jobs in the same queue, or between tasks under the same job.

#### Scenario

- Preemption between jobs in the same queue: Multiple departments in a company share a cluster, and each department can be mapped into a Queue. Resources of different departments cannot be preempted from each other. This mechanism can well guarantee the isolation of resources of departments..In complex scheduling scenarios, basic resources (CPUs, disks, GPUs, memory, network bandwidth) are allocated based on services: In computing-intensive scenarios, such as AI and high-performance scientific computing, queues require more computing resources, such as CPUs, GPUs, and memory. Big data scenarios, such as the Spark framework, have high requirements on disks. Different queues share resources. If AI jobs preempts all CPU resources, jobs in queues of other scenarios will starve. Therefore, the queue-based resource allocation is used to ensure service running.
- Preemption between tasks in the same job: Usually, there can be multiple tasks in the same Job. For example, in complex AI application scenarios, a parameter server and multiple workers need to be set inside the TF-job, and preemption between multiple workers is supported by preemption within such scenarios.

### Reserve

#### Overview

The action has been deprecated from v1.2 and replaced with SLA plugin.

The Reserve action completes the resource reservation. Bind the selected target job to the node. The Reserve action, the elect action, and the Reservation plugin make up the resource Reservation mechanism. The Reserve action must be configured after the allocate action.

#### Scenario

In practical applications, there are two common scenarios as follows:

- In the case of insufficient cluster resources, it is assumed that for Job A and Job B in the state to be scheduled, the application amount of resource A is less than B or the priority of resource A is higher than that of job B. Based on the default scheduling policy, A will schedule ahead of B. In the worst case, if subsequent jobs with high priority or less application resources are added to the queue to be scheduled, B will be hungry for a long time and wait forever.

- In the case of insufficient cluster resources, assume that there are jobs A and B to be scheduled. The priority of A is lower than that of B, but the resource application amount is smaller than that of B. Under the scheduling policy based on cluster throughput and resource utilization as the core, A will be scheduled first. In the worst case, B will remain hungry.


Therefore, we need a fair scheduling mechanism that ensures that chronic hunger for some reason reaches a critical state when it is dispatched. Job reservation is such a fair scheduling mechanism.

Resource reservation mechanisms need to consider node selection, number of nodes, and how to lock nodes. Volcano resource reservation mechanism reserves resources for target operations in the way of node group locking, that is, select a group of nodes that meet certain constraints and include them into the node group. Nodes within the node group will not accept new job delivery from the inclusion moment, and the total specification of nodes meets the requirements of target operations. It is important to note that target jobs can be scheduled throughout the cluster, while non-target jobs can only be scheduled with nodes outside the node group.

### Backfill

#### Overview

Backfill action is a backfill step in the scheduling process. It deals with the pod scheduling that does not specify the resource application amount in the list of pod to be scheduled. When executing the scheduling action on a single pod, it traverse all nodes and schedule the pod to this node as long as the node meets the scheduling request of pod.

#### Scenario

In a cluster, the main resources are occupied by "fat jobs", such as AI model training. Backfill actions allow the cluster to quickly schedule "small jobs" such as single AI model identification and small data volume communication. Backfill can improve cluster throughput and resource utilization.