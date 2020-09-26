
+++
title = "PodGroup"


date = 2019-01-28
lastmod = 2020-08-31

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "PodGroup"
[menu.1-0]
  parent = "concepts"
  weight = 2
+++

## Introduction
PodGroup is a group of pods with strong association, which is mainly used in batch scheduling. For example, the ps task 
and worker tasks in Tensorflow. PodGroup is a CRD type.
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
  priorityClassName: high-prority
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
## Key Field
### minMember
minMember means the minimum number of Pods or Tasks to run under the PodGroup. If the cluster resource cannot meet the
demand of running minimum number of Pods or Tasks, any Pod or Task in PodGroup will not be scheduled. 
### queue
queue indicates which queue the PodGroup belongs to. The queue must be Open status.
### priorityClassName
priorityClassName represents the priority of the podgroup and is used by the scheduler to sort all the PodGroups in the 
queue when scheduling. Note that **system-node-critical** and **system-cluster-critical** are reserved values, which 
means the highest priority. If not specified, default priority are used automatically.
### minResources
minResources indicates the minimum resources for running the PodGroup. If available resource in cluster cannot satisfy 
the requirement, any Pod or Task in the PodGroup will not be scheduled. 
### phase
phase means the current status of the PodGroup.
### conditions
conditions represent the specific status log of the PodGroup, including the key events in the lifecycle of the PodGroup.  
### running
running is the number of running Pods or Tasks in PodGroup.
### succeed
succeed is the number of succeed Pods or Tasks in PodGroup.
### failed
failed is the number of failed Pods or Tasks in PodGroup.
## Status
### pending
pending means the PodGroup has been accepted by Volcano but its resource requirement cannot be satisfied at soon. Once
satisfied, the status will turn to be running.
### running
running means there are at least **minMember** number of Pods or Tasks are running for the PodGroup.
### unknown
unknown means the status of minMember number of Pods or Task are in two conditions: parts are running while parts are not
scheduled. The reason of not scheduled may be lack of resource and so on. Scheduler will keep waiting until controllermanager
start these Pods or Tasks again.
### inqueue
inqueue means PodGroup has passed the validation and it is waiting for to be bound to a node. It's a transient intermediate 
state between pending and running.
## Usage
### minMember
In some scenes, you don't need all tasks of a job to be completed. If a specified number of tasks completes, the expected
result of the job can be achieved. For example, machine learning training. You can do it with the field "minMember".
### priorityClassName
priorityClassName is used in preemption scheduled.
### minResources 
In some scenes such as Big Data analysis, only if available resource achieving a lower limit, can a job be run. 
"minResources" is just for it.
## Note
#### Creation Automatically
If no PodGroup specified when creating a Volcano job is created, Volcano will create a PodGroup with the same name for 
Volcano job.  
