+++
title =  "Tutorials"


date = 2019-01-28
lastmod = 2020-08-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Queue"
[menu.docs]
  parent = concepts
  weight = 1
+++

## Introduction
Queue is a collection of PodGroup, which works as FIFO. It's also the basic unit of the resource division.
## Example
```
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  creationTimestamp: "2020-08-10T11:54:36Z"
  generation: 1
  name: default
  resourceVersion: "559"
  selfLink: /apis/scheduling.volcano.sh/v1beta1/queues/default
  uid: 14082e4c-bef6-4248-a414-1e06d8352bf0
spec:
  reclaimable: true
  weight: 1
  capability:
    cpu: "4"
    memory: "4096Mi"
status:
  state: Open
```
## Key Field
### weight
weight means the **relative** weight of the queue in cluster resource division among queues. The resource share for the 
queue is **(weight/total-weight) * total-resource**. total-weight stands for the sum of all queues. total-resource is 
the total amount of cluster resource. It's a soft constraint.
### capability
capability means the upper limit of resource amount the queue can take use of. It's a rigid constraint.
### reclaimable
reclaimable means whether to allow other queues to reclaim resources occupied by the queue when the resource usage of 
the queue is more than its share. The default value is true.
## Status
### Open
Open means the queue is available. New PodGroups can enter the queue.
### Closed
Closed means the queue is not available. New PodGroups cannot enter the queue.
### Closing
Closing means the queue is becoming unavailable. It's a transient intermediate state. New PodGroups cannot enter the 
queue.
### Unknown
Unknown means the queue status is imperceptible because of some unexpected situation such as network jitter.
## Usage
### Weight For Cluster Resource Division - 1
#### Premise
* The total amount of CPU resource in Cluster is 4C.
* Default queue named "default" has already been created by volcano, whose default weight is 1.
* No running tasks in cluster.
#### Operation
1. Under current situation, queue "default" can make use of all CPUs.
2. Create custom queue named "test" whose weight is 3. So resource share for queue "default" changes to 1C and queue 
"test" is 3C because weight(default) : weight(test) = 1 : 3.
3. Create PodGroup "p1" and "p2". "p1" enters queue "default" while "p2" enters to queue "test".
4. Create job "j1" which belongs to "p1" and request 1C.
5. Create job "j2" which belongs to "p2" and request 3C.
6. Observe the status of "j1" and "j2". They are both running well.    
### Weight For Cluster Resource Division - 2
#### Premise
* The total amount of CPU resource in Cluster is 4C.
* Default queue named "default" has already been created by volcano, whose default weight is 1.
* No running tasks in cluster.
#### Operation
1. Under current situation, queue "default" can make use of all CPUs.
2. Create PodGroup "p1" who enters queue "default".
3. Create job "j1" requesting 1C and job "j2" requesting 3C, who both belongs to "p1". They are running wll.
4. Create custom queue named "test" whose weight is 3. So resource share for queue "default" changes to 1C and queue 
"test" is 3C because weight(default) : weight(test) = 1 : 3. Due to no tasks in queue "test", jobs in queue "default"
can still run well.
5. Create PodGroup "p2" who enters queue "test".
6. Create job "j2" who belongs to "p2" and requests 3C. "j2" will be evicted to return resource to queue "test".
### Capability For Overuse Of Resource
#### Premise
* The total amount of CPU resource in Cluster is 4C.
* Default queue named "default" has already been created by volcano, whose default weight is 1.
* No running tasks in cluster.
#### Operation
1. Create queue "test" whose capability is 2C.
2. Create PodGroup "p1" entering queue "test".
3. Create job "j1" who belongs to "p1" and requesting 1C. "j1" runs well.
4. Create job "j2" who belongs to "p1" and requesting 2C. "j2" becomes "pending" because the limit of capability.
### Reclaimable For Resource Return
#### Premise
* The total amount of CPU resource in Cluster is 4C.
* Default queue named "default" has already been created by volcano, whose default weight is 1.
* No running tasks in cluster.
#### Operation
1. Create queue named "test" whose "reclaimable" is false and weight is 1. So resource share for queue "default" and 
"test" are both 2C.
2. Create PodGroup "p1" and "p2". "p1" enters queue "test" while "p2" enters to queue "default".
3. Create job "j1" who belongs to "p1" and requests 3C. "j1" runs well because of no tasks in queue "default".
4. Create job "j2" who belongs to "p2" and requests 2C. The status of "j2" is "pending" because queue test's "reclaimable"
is false. It will NOT return resource to other queues immediately until some tasks in it finishes.  
## Note
#### default queue
When volcano starts, it will create a queue named "default". Its weight is 1. The following jobs without assigned to a 
queue will be assigned to queue "default".
#### soft constraint about weight
weight determines the resource share of a queue, but not the upper limit. As examples above, a queue can make use of 
resource more than its share when there is idle resource in other queues. It's a good character for volcano to have a 
better resource usage of cluster resource.