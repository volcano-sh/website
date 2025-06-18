+++
title =  "Actions"

date = 2021-04-07
lastmod = 2021-07-26

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

#### Overview

The Enqueue action filters qualified jobs into the queue to be scheduled. When the minimum number of resource requests under a Job cannot be met, even if the scheduling action is performed for a pod under a Job, pod will not be able to schedule because the "Gang" constraint is not reached. A state refresh from "Pending" to "Inqueue" can only happen if the minimum resource size of the job is met. This state transition is a prerequisite for Pod creation - only after the PodGroup enters the Inqueue state will the vc-controller create Pods for that PodGroup. This mechanism ensures that Pods are only created when resources are available, making it an essential action for scheduler configuration.

#### Scenario

Enqueue action is the preparatory stage in the scheduling process. Only when the cluster resources meet the minimum resource request for the job scheduling, the job state can be changed from "pending" to "Enqueue". In this way, Enqueue Action can prevent a large number of unscheduled pods in the cluster and improve the performance of the scheduler in the high-load scenarios where the cluster resources may be insufficient, such as AI/MPI/HPC.

> Note: There is a conflict between enqueue action and preempt/reclaim action. If both enqueue action and preempt/reclaim action are configured, and enqueue action determines that the job cannot be queued, it may result in failure to generate Pending state Pods, thus failing to trigger preempt/reclaim action.


### Allocate 

#### Overview

This Action binds of <task , node> , including pre-selection and further selection.PredicateFn is used to filter out nodes that cannot be allocated,and NodeOrderFn is used to score the nodes to find the one that best fits.Allocate action is a essential step in a scheduling process，which is used to handle pod scheduling that has resource requests in the pod list to be scheduled.

The Allocate action follows the commit mechanism. When a pod's scheduling request is satisfied, a binding action is not necessarily performed for that pod. This step also depends on whether the gang constraint of the Job in which the pod resides is satisfied. Only if the gang constraint of the Job in which the pod resides is satisfied can the pod be scheduled; otherwise, the pod cannot be scheduled.

#### Scenario

In a clustered mixed business scenario, the Allocate pre-selected part enables specific businesses (AI, big data, HPC, scientific computing) to quickly filter, sort, and schedule according to their namespace quickly and centrally. In a complex computing scenario such as TensorFlow or MPI, where there are multiple tasks in a single job, the Allocate action traversal multiple task allocation options under the job to find the most appropriate node for each task.

### Backfill

#### Overview

Backfill action is a backfill step in the scheduling process. It deals with BestEffort Pods (pods that do not specify resource requests) scheduling. Similar to Allocate action, Backfill also traverses all nodes to find suitable scheduling positions, with the main difference being that it handles pods without explicit resource requests.

#### Scenario

In a cluster, besides workloads that require explicit resource requests, there are also workloads with unclear resource demands. These workloads typically run in BestEffort mode, and Backfill action is responsible for finding suitable scheduling positions for such Pods.

### Preempt

#### Overview

The preempt action is used for resource preemption between jobs in a queue , or between tasks in a job.The preempt action is a preemption step in the scheduling process, which is used to deal with high-priority scheduling problems. It is used for preemption between jobs in the same queue, or between tasks under the same job.

#### Scenario

- Preemption between jobs in the same queue: Multiple departments in a company share a cluster, and each department can be mapped into a Queue. Resources of different departments cannot be preempted from each other. This mechanism can well guarantee the isolation of resources of departments..In complex scheduling scenarios, basic resources (CPUs, disks, GPUs, memory, network bandwidth) are allocated based on services: In computing-intensive scenarios, such as AI and high-performance scientific computing, queues require more computing resources, such as CPUs, GPUs, and memory. Big data scenarios, such as the Spark framework, have high requirements on disks. Different queues share resources. If AI jobs preempts all CPU resources, jobs in queues of other scenarios will starve. Therefore, the queue-based resource allocation is used to ensure service running.
- Preemption between tasks in the same job: Usually, there can be multiple tasks in the same Job. For example, in complex AI application scenarios, a parameter server and multiple workers need to be set inside the TF-job, and preemption between multiple workers is supported by preemption within such scenarios.

### Reclaim

#### Overview

Reclaim action is a **cross-queue** resource reclamation step in the scheduling process. Unlike Preempt, Reclaim specifically handles resource reclamation between different Queues. When a job in a Queue needs resources and that Queue is not overused, resources can be reclaimed from other reclaimable queues.

#### Scenario

- Cross-queue resource reclamation: In scenarios where multiple departments share a cluster, when a high-priority department's (such as online business department) Queue lacks resources, it can reclaim resources from other department Queues (such as offline computing department). For example, online business Queues can reclaim resources from offline business Queues, but offline business Queues cannot reclaim resources from each other.

- Resource utilization optimization: Through the cross-queue resource reclamation mechanism, the cluster can improve overall resource utilization while ensuring SLA for high-priority businesses. When a high-priority Queue lacks resources, it can reclaim resources from low-priority Queues to ensure resource requirements for critical businesses.

> Note:
> 
> 1. Reclaim checks multiple conditions during execution: whether the target Queue is reclaimable, whether the task can be reclaimed (Preemptable), whether the job's running requirements can be met after resource reclamation, etc., to ensure the rationality of resource reclamation.
> 2. To make jobs in a Queue reclaimable by other Queues, the reclaimable field in the Queue's spec must be set to true.