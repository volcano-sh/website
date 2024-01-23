+++
title =  "Queue"


date = 2024-01-16
lastmod = 2024-01-16

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Queue"
[menu.v1-8-2]
  parent = "concepts"
  weight = 1
+++

## Introduction
Queue is a collection of PodGroups, which adopts FIFO. It is also used as the basis for resource division.
## Example
```shell
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
## Key Fields
### weight
`weight` indicates the **relative** weight of a queue in cluster resource division. The resource allocated to the queue equals **(weight/total-weight) x total-resource**. `total-weight` is the total weight of all queues. `total-resource` is the total number of cluster resources. `weight` is a soft constraint.
### capability
`capability` indicates the upper limit of resources the queue can use. It is a hard constraint.
### reclaimable
`reclaimable` specifies whether to allow other queues to reclaim extra resources occupied by a queue when the queue uses more resources than allocated. The default value is `true`.
## Status
### Open
`Open` indicates that the queue is available and can accept new PodGroups.
### Closed
`Closed` indicates that the queue is unavailable and cannot accept any new PodGroups.
### Closing
`Closing` indicates that the queue is becoming unavailable. It is a transient state. A `Closing` queue cannot accept any new PodGroups.
### Unknown
`Unknown` indicates that the queue status is unknown because of unexpected situations such as network jitter.
## Usage
### Weight for Cluster Resource Division - 1
#### Preparations

* A total of 4 CPUs in a cluster are available.
* A queue with `name` set to `default` and `weight` set to `1` has been created by Volcano.
* No running tasks are in the cluster.

#### Operation

1. If no other queues are created, queue `default` can use all CPUs.
2. Create queue `test` whose weight is `3`. The CPU resource allocated to queue `default` changes to 1C and that allocated to queue `test` is 3C because weight(default):weight(test) equals 1:3.
3. Create PodGroups `p1` and `p2`, which belong to queues `default` and `test`, respectively.
4. Create job `j1` that has a CPU request of 1C in `p1`.
5. Create job `j2` that has a CPU request of 3C in `p2`.
6. Check the status of `j1` and `j2`. Both the jobs are running normally. 
   
### Weight for Cluster Resource Division - 2
#### Preparations

* A total of 4 CPUs in a cluster are available.
* A queue with name set to default and weight set to 1 has been created by Volcano.
* No running tasks are in the cluster.

#### Operation

1. If no other queues are created, queue `default` can use all CPUs.
2. Create PodGroup `p1` that belongs to queue `default`.
3. Create job `j1` with a CPU request of 1C and job `j2` with a CPU request of 3C in `p1`. Both the jobs are running normally.
4. Create queue `test` whose weight is `3`. The CPU resource allocated to queue `default` changes to 1C and that allocated to queue `test` is 3C because weight(default):weight(test) equals 1:3. As no tasks in queue `test`, jobs in queue `default` can still run normally.
5. Create PodGroup `p2` that belongs to queue `test`.
6. Create job `j2` with a CPU request of 3C in `p2`. `j2` will be evicted to return the resource to queue `test`.

### Capability for Overuse of Resources
#### Preparations

* A total of 4 CPUs in a cluster are available.
* A queue with name set to default and weight set to 1 has been created by Volcano.
* No running tasks are in the cluster.

#### Operation

1. Create queue `test` whose `capability` is 2C.
2. Create PodGroup `p1` that belongs to queue `test`.
3. Create job `j1` that has a CPU request of 1C in `p1`. `j1` runs normally.
4. Create job `j2` that has a CPU request of 3C in `p1`. `j2` becomes `pending` because of the limit of `capability`.

### Reclaimable for Resource Return
#### Preparations

* A total of 4 CPUs in a cluster are available.
* A queue with name set to default and weight set to 1 has been created by Volcano.
* No running tasks are in the cluster.

#### Operation

1. Create queue `test` whose `reclaimable` is `false` and `weight` is `1`. The CPU resources allocated to queues `default` and 
`test` are both 2C.
2. Create PodGroups `p1` and `p2`, which belong to queues `test` and `default`, respectively.
3. Create job `j1` that has a CPU request of 3C in `p1`. `j1` runs normally because there are no tasks in queue `default`.
4. Create job `j2` that has a CPU request of 2C in `p2`. The status of `j2` is `pending` because `reclaimable` is set to `false` for queue `test`. Queue `test` will NOT return resources to other queues until some tasks in it are completed.
  
## Note
#### default Queue
When Volcano starts, it automatically creates queue `default` whose `weight` is `1`. Subsequent jobs that are not assigned to a queue will be assigned to queue `default`.
#### Soft Constraint About weight
`weight` determines the resources allocated to a queue, but not the upper limit. As per the preceding examples, a queue can use more resources than allocated when there are idle resources in other queues. This a good characteristic of Volcano and delivers a better cluster resource usage.