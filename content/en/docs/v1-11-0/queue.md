+++
title =  "Queue"


date = 2019-01-28
lastmod = 2024-12-30

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Queue"
[menu.v1-11-0]
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
  creationTimestamp: "2024-12-30T09:31:12Z"
  generation: 1
  name: test
  resourceVersion: "987630"
  uid: 88babd01-c83f-4010-9701-c2471c1dd040
spec:
  capability:
    cpu: "8"
    memory: 16Gi
  # deserved field is only used by capacity plugin
  deserved:
    cpu: "4"
    memory: 8Gi
  guarantee:
    resource:
      cpu: "2"
      memory: 4Gi
  priority: 100
  reclaimable: true
  # weight field is only used by proportion plugin
  weight: 1
status:
  allocated:
    cpu: "0"
    memory: "0"
  state: Open
```

## Key Fields
* guarantee, *optional*

guarantee indicates the resources reserved for all PodGroups in this queue. Other queues cannot use these reserved resources.

> **Note**: If guarantee value needs to be configured, it must be less than or equal to the deserved value

* deserved, *optional*

deserved indicates the expected resource amount for all PodGroups in this queue. If the allocated resources of this queue exceed the configured deserved value, the allocated resources can be reclaimed by other queues.

> **Note**:
> 
> 1. This field can only be configured when the capacity plugin is enabled, and must be less than or equal to the capability value. The proportion plugin uses weight to automatically calculate the queue's deserved value. For more information on using the capacity plugin, see: [capacity plugin user guide](https://github.com/volcano-sh/volcano/blob/5b817b1cdf3a5638ba38e934b44af051c9fb419e/docs/user-guide/how_to_use_capacity_plugin.md)
> 2. If the allocated resources of a queue exceed its configured deserved value, the queue cannot reclaim resources from other queues

* weight, *optional*

`weight` indicates the **relative** weight of a queue in cluster resource division. The deserved resource amount is calculated as **(weight/total-weight) * total-resource**. `total-weight` is the total weight of all queues. `total-resource` is the total number of cluster resources. `weight` is a soft constraint.

> **Note**: 
> 
> 1. This field can only be configured when the proportion plugin is enabled. If weight is not set, it defaults to 1. The capacity plugin does not need this field.
> 
> 2. This field is a soft constraint. The Deserved value is calculated based on weight. When other queues' resource usage is below their Deserved values, this queue can exceed its Deserved value by borrowing resources from other queues. However, when cluster resources become scarce and other queues need their borrowed resources for tasks, this queue must return the borrowed resources until its usage matches its Deserved value. This design ensures maximum utilization of cluster resources.

* capability, *optional*

`capability` indicates the upper limit of resources the queue can use. It is a hard constraint.If this field is not set, the queue's capability will be set to realCapability (total cluster resources minus the total guarantee values of other queues).

* reclaimable, *optional*

`reclaimable` specifies whether to allow other queues to reclaim extra resources occupied by a queue when the queue uses more resources than allocated. The default value is `true`.

* priority, *optional*

priority indicates the priority of this queue. During resource allocation and resource preemption/reclamation, higher priority queues will have precedence in allocation/preemption/reclamation.

* parent, *optional*

This field is used to configure [hierarchical queues](/en/docs/hierarchical_queue). parent specifies the parent queue. If parent is not specified, the queue will be set as a child queue of the root queue by default.

## Status
### Open
`Open` indicates that the queue is available and can accept new PodGroups.
### Closed
`Closed` indicates that the queue is unavailable and cannot accept any new PodGroups.
### Closing
`Closing` indicates that the queue is becoming unavailable. It is a transient state. A `Closing` queue cannot accept any new PodGroups.
### Unknown
`Unknown` indicates that the queue status is unknown because of unexpected situations such as network jitter.
  
## Note
#### default Queue
When Volcano starts, it automatically creates queue `default` whose `weight` is `1`. Subsequent jobs that are not assigned to a queue will be assigned to queue `default`.
#### root queue
When Volcano starts, it also creates a queue named root by default. This queue is used when the [hierarchical queue](/en/docs/hierarchical_queue) feature is enabled, serving as the root queue for all queues, with the default queue being a child queue of the root queue.

> For more information on queue usage scenarios, please refer to [Queue Resource Management](/en/docs/queue_resource_management)