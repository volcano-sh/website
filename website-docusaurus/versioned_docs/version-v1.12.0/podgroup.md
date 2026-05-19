
+++
title = "PodGroup"


date = 2019-01-28
lastmod = 2021-06-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "PodGroup"
[menu.v1-12-0]
  parent = "concepts"
  weight = 2
+++

## Introduction
PodGroup is a group of pods with strong association and is mainly used in batch scheduling, for example, ps and worker tasks in TensorFlow. PodGroup is of a Custom Resource Definition (CRD) type.
## Example
```shell
apiVersion: scheduling.volcano.sh/v1beta1
kind: PodGroup
metadata:
  creationTimestamp: "2020-08-11T12:28:55Z"
  generation: 5
  name: test
  namespace: default
  ownerReferences:
  - apiVersion: batch.volcano.sh/v1alpha1
    blockOwnerDeletion: true
    controller: true
    kind: Job
    name: test
    uid: 028ecfe8-0ff9-477d-836c-ac5676491a38
  resourceVersion: "109074"
  selfLink: /apis/scheduling.volcano.sh/v1beta1/namespaces/default/podgroups/job-1
  uid: eb2508f5-3349-439c-b94d-4ac23afd71ff
spec:
  minMember: 1
  minResources:
    cpu: "3"
    memory: "2048Mi"
  priorityClassName: high-priority
  queue: default
status:
  conditions:
  - lastTransitionTime: "2020-08-11T12:28:57Z"
    message: '1/0 tasks in gang unschedulable: pod group is not ready, 1 minAvailable.'
    reason: NotEnoughResources
    status: "True"
    transitionID: 77d5be3f-6169-4f86-8e65-0bdc621ce983
    type: Unschedulable
  - lastTransitionTime: "2020-08-11T12:29:02Z"
    reason: tasks in gang are ready to be scheduled
    status: "True"
    transitionID: 54514401-5c90-4b11-840d-90c1cda93096
    type: Scheduled
  phase: Running
  running: 1

```
## Key Fields
### minMember
`minMember` indicates the minimum number of pods or tasks running under the PodGroup. If the cluster resource cannot meet the demand of running the minimum number of pods or tasks, no pod or task in the PodGroup will be scheduled. 
### queue
`queue` indicates the queue to which the PodGroup belongs. The queue must be in the Open state.
### priorityClassName
`priorityClassName` represents the priority of the PodGroup and is used by the scheduler to sort all the PodGroups in the queue during scheduling. Note that **system-node-critical** and **system-cluster-critical** are reserved values, which mean the highest priority. If `priorityClassName` is not specified, the default priority is used.
### minResources
`minResources` indicates the minimum resources for running the PodGroup. If available resources in the cluster cannot satisfy the requirement, no pod or task in the PodGroup will be scheduled. 
### phase
`phase` indicates the current status of the PodGroup.
### conditions
`conditions` represents the status log of the PodGroup, including the key events that occurred in the lifecycle of the PodGroup.  
### running
`running` indicates the number of running pods or tasks in the PodGroup.
### succeed
`succeed` indicates the number of successful pods or tasks in the PodGroup.
### failed
`failed` indicates the number of failed pods or tasks in the PodGroup.
## Status
{{<figure library="1" src="status-DAG.png" title="status-DAG">}}

### pending

`pending` indicates that the PodGroup has been accepted by Volcano but its resource requirement has not been satisfied yet. Once satisfied, the status will turn to running.
### running
`running` indicates that there are at least **minMember** pods or tasks running under the PodGroup.
### unknown
`unknown` indicates that among **minMember** pods or tasks, some are running while others are not scheduled. The reason could be due to the lack of resources. The scheduler will wait until ControllerManager starts these pods or tasks again.
### inqueue
`inqueue` indicates that the PodGroup has passed validation and is waiting to be bound to a node. It is a transient state between pending and running.
## Usage
### minMember
In some scenarios such as machine learning training, you do not need all tasks of a job to be completed. Instead, when a specified number of tasks are completed, the job can be achieved. In this case, the `minMember` field is suitable.
### priorityClassName
`priorityClassName` is used in preemptive priority scheduling.
### minResources 
In some scenarios such as big data analytics, a job can run only when available resources meet the minimum requirement. `minResources` is suitable for such scenarios.
## Note
#### Automatic Creation
If no PodGroup is specified when a VolcanoJob is created, Volcano will create a PodGroup with the same name as the VolcanoJob.  
