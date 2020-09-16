+++
title = "Introduction"


date = 2019-01-28
lastmod = 2020-09-01

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Overview"
[menu.docs]
  parent = "scheduler"
  weight = 1
+++

## Introduction
Volcano scheduler is the component responsible for Pod scheduling. It consists of a series of actions and plugins. Actions
define what action should be executed in every step. Plugins provide the action algorithm detail in different scenes.
Volcano scheduler is highly scalable. You can specify and implement actions and plugins according the needs.
## Workflow
{{<figure library="1" src="scheduler.PNG" title="Volcano scheduler workflow">}}


Volcano scheduler works as follows:

1. Jobs submitted by client are watched by scheduler and cached
2. Open sessions periodically and a scheduling cycle begins
3. Send jobs not scheduled in cache to to-be-scheduled-queue in session
4. Traverse all jobs to be scheduled. Execute enqueue / allocate / preempt / reclaim / backfill actions in order they are
defined and find the most suitable node for each job. Bind the job to the node. The specific algorithm logic executed in 
action depends on the implementation of each function in the registered plugins.
5. Close this session

## Actions
### enqueue
Enqueue action is responsible for filtering out the tasks to be scheduled that meet the requirements through a series of 
filtering algorithms and sending them to the queue. After the action, the status of the task changes from pending to inqueue. 
### allocate
Allocate action is responsible for selecting the most suitable node throughout a series of predication and optimization 
algorithm. 
### preempt
Preempt action is responsible for preemptive scheduling of high priority tasks in the same queue according to priority rules. 
### reclaim
Reclaim action is responsible for reclaiming the resources due to the cluster based on the queue weight when a new task 
enters the queue and the cluster resources cannot meet the needs of the current queue.
### backfill
Backfill action is responsible for backfilling the tasks in the pending state into the cluster node to maximize the 
resource utilization of the node.

## Plugins
### gang
The gang plugin considers tasks that are not in ready state(including Binding / Bound / Running / Allocated / Succeed / 
Pipelined) to have a higher priority. It will decide whether to schedule the task by checking if the resources due to the 
queue can meet the resources required by the task to run minavailable pods after trying to reclaim resources.
### conformance
The conformance plugin considers the tasks in namespace kube-system have higher priority. These tasks will not be preempted.
### DRF
The DRF plugin considers that tasks with fewer resources have higher priority. It tries to calculate the total amount of 
resources allocated by the preemptor and the preempted, and triggers the preemption when the preemptor has less resources.
### nodeorder
The Nodeorder plugin returns the scores of all nodes for a task after passing a series of dimension scoring algorithms. The 
node with the highest score is considered to be the most suitable node for the task.
### predicates
The predictions plugin determines whether a task is bound to a node through a series of dimensional evaluation algorithms.
### priority
The priority plugin is used to compare the priority of two jobs / tasks. For two jobs, it decides whose priority is higher by 
comparing job.spec.priorityClassName. For two tasks, it decides whose priority is higher by comparing task.priorityClassName
/ task.createTime / task.id in order.
## Configuration
Volcano scheduler is highly scalable because of its composition pattern design. Users can decide which actions and plugins 
to use according to their personal needs, and they can also implement customization based on the interface Action or plugin. 
The scheduler configuration is located in the configmap named **volcano-scheduler-configmap**, which is mounted in the path
/volcano.scheduler in the scheduler container as volume.
### How to get configuration of Volcano scheduler
* get the configmap named volcano-scheduler-configmap

```shell
# kubectl get configmap -nvolcano-system
NAME                          DATA   AGE
volcano-scheduler-configmap   1      6d2h
```

* view the data part detail of configmap

```shell
# kubectl get configmap volcano-scheduler-configmap -nvolcano-system -oyaml
apiVersion: v1
data:
  volcano-scheduler.conf: |
    actions: "enqueue, allocate, backfill"
    tiers:
    - plugins:
      - name: priority
      - name: gang
      - name: conformance
    - plugins:
      - name: drf
      - name: predicates
      - name: proportion
      - name: nodeorder
      - name: binpack
kind: ConfigMap
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"v1","data":{"volcano-scheduler.conf":"actions: \"enqueue, allocate, backfill\"\ntiers:\n- plugins:\n  - name: priority\n  - name: gang\n  - name: conformance\n- plugins:\n  - name: drf\n  - name: predicates\n  - name: proportion\n  - name: nodeorder\n  - name: binpack\n"},"kind":"ConfigMap","metadata":{"annotations":{},"name":"volcano-scheduler-configmap","namespace":"volcano-system"}}
  creationTimestamp: "2020-08-15T04:01:02Z"
  name: volcano-scheduler-configmap
  namespace: volcano-system
  resourceVersion: "266"
  selfLink: /api/v1/namespaces/volcano-system/configmaps/volcano-scheduler-configmap
  uid: 1effe4d6-126c-42d6-a3a4-b811075c30f5
```

It includes actions and tiers in volcano-scheduler.conf. In actions, the comma is used as a separator to configure the 
actions to be executed by the scheduler. It should be noted that the order of configuration is the order of the scheduler's 
execution, and Volcano itself will not check the rationality of the order. The list of plugins configured in tiers is the 
plugins registered with the scheduler. The specific algorithm implementation defined in plugins will be called in actions.