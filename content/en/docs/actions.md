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

//Scan the Job and initialize the above three data structures
For job in ssn.Jobs 
//Filter 1
found := ssn.Queues[job.Queue]
existed := queueMap[queue.UID]
//Filter 2
if job.PodGroup.Status.Phase == scheduling.PodGroupPending
found := jobsMap[job.Queue];


/*Update Node resource usage*/
For node in ssn
  Update Total_nodes
  Update Used_nodes

/*Repeat the enqueue operation*/
While(!queues.Empty()){

  /*Enqueue operation terminates out of resources*/
  if idle.IsEmpty() break
  //deal with target job , if exists , judege whether it can be

  minReq <--- job
  idle   <--- node resources
  if node Adequate resources
  inqueue := true;
  if inqueue
     enqueue
  Queues.push(queue)
} 

```

#### Logic

Filter the tasks that meet the requirements and enter the queue to be scheduled.The filtering condition is whether node meets the task's minimum resource requirement minReq.

####  Scence

The preparation process for task scheduling,Tasks that meet the requirements and can be scheduledinqueue.The task status changes from pending to inqueue.



### Allocate 

```
step1. pick a namespace named N (using ssn.NamespaceOrderFn)
step2. pick a queue named Q from N (using ssn.QueueOrderFn)
step3. pick a job named J from Q (using ssn.JobOrderFn)
step4. pick a task T from J (using ssn.TaskOrderFn)
step5. use predicateFn to filter out node that T can not be allocated on.
step6. use ssn.NodeOrderFn to judge the best node and assign it to T
```

#### Logic

Task and Node are bundled, including Primary and Optimization.PredicateFn is used to filter nodes that cannot be allocated.Use NodeOrderFn to score to find the best node.

#### Scene

Allocate starts at the namespce level，Different namespaces can represent sets of tasks for different businesses，This will facilitate resource allocation capabilities for dealing with multiple types of complex business scenarios.Different business scenarios can register appropriate scheduling algorithms (Plugins implement multiple specific scheduling policies)



### Preempt

```
//Preemption between Jobs in a Queue
For queue in queues 
Several preemption conditions are filtered

//Task preemption in job
For job in range underRequest
Several preemption conditions are filtered

```

#### Logic

There are two granularity of preemption.Preempting jobs from the same Queue,Preempting between Tasks under the same Job.

#### Scene

- Queue granularity: Tasks issued in similar scenarios enter a Queue. There is no preemption of resources between queues. Cluster resources are allocated proportionally across queues. In many complex scheduling scenarios, basic resources (CPU, disk, GPU, memory, IO) are classified and grouped according to business requirements. In computing-intensive scenarios, such as AI, high-performance scientific computing, the resource division of Queue corresponding to CPU, GPU, memory and other computational resources are in high demand. Big data scenarios such as the Spark framework have high disk requirements, and so on. The allocation of resources is shared among queues, but if the AI scene grabs all the CPU resources, the tasks in the Queue in the other scene will starve to death. Therefore, Queue based granularity is assigned to ensure the business throughput of the resource.
- Job granularity: the task of the same Job is preempted, which can ensure the high real-time requirements of certain functions under certain services. For example, in Spark big data scenario, the real-time requirement is not high for some batch processing functions. CRUD services with real-time data flow require fast feedback results. At this point, you need to preempt from within Job.



### Reclaim

```
Output the number of Jobs and Quenes being dispatched 
For job in ssn
  1.Job, who was waiting for dispatch, refused to reclaim it
  2.To deny the situation of being reorganized
  3.Queue Found for Job; Recliam is not required
    ADD one Queue
    update queueMap
    update queues
 

update preemptorsMap
update preemptorTasks

While(!Queues.Empty())
  Queue  = Queues.pop()//Pop up an element
  If  Overused --> continue 
  Found high priority job
  Found high priority task to reclaim others

  If found:= preemptorTasks[job.UID] 
  //Determine if the task is in a preemptive mapping job-task
  not found ==> high priority task ==> continue;

For n in ssn.Nodes:
//Start operating on nodes in the resource layer
   If predicates fialed  -> continue
//predicates based on task
//Start looking at all tasks on n

For task on n
Non running task -> continue;
[Job , Task] not found -> continue;
//clone task to avoid modify Task ‘s status on node n
Update reclainmees
Identify the victims

Start to Reclaim...
```

#### Logic

When a new task enters the waiting scheduling queue, the cluster resource cannot be satisfied, and resource recovery is carried out.Compared to preemption, it is a kind of forced preemption.

#### Scene

When the task load exceeds the system resources，For example, "Double Eleven", "Red Envelop Rain" and other scenes saw a sudden increase in traffic,You need to look at the configuration of reclaim, which is specifically similar to preempt.



### Elect

```
//select the target job which is of  the highest priority and waits for the longest time

For job in ssn.Jobs
If job.PodGroup.status.phase == scheduling.podGroupPending
pendingJobs <---- this job
Print these jobs which have been elected
```

#### Logic

Complete the Job selection.When a job meets a state condition, it is directly possible to add the job to the pendingJobs.

#### Scene

This module selects high-priority, long-waiting jobs.It belongs to the pre-selection work before scheduling and is suitable for various scheduling scenarios (allocation, preemption, reservation, etc.) before the module.



### Reserve

```
//select a node which is not locked and has the most idle resoure
targetJob(if there is not a targetJob return)
if target job has not been scheduled, select a locked node for it
else reset target job and locked nodes
```

#### Logic

Bind Job to Node.Together with Elect and Reservation, it forms a resource reservation mechanism.

#### Scene

It is similar to the preemption module and ultimately handles the binding relationship between job and node.It is used for resource reservation and preparation before dispatching.

