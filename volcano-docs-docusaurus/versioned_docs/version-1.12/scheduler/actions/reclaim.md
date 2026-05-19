---
title: Reclaim
---

# Reclaim

## Overview

Reclaim action is a **cross-queue** resource reclamation step in the scheduling process. Unlike Preempt, Reclaim specifically handles resource reclamation between different Queues. When a job in a Queue needs resources and that Queue is not overused, resources can be reclaimed from other reclaimable queues.

## Scenario

### Cross-queue resource reclamation

In scenarios where multiple departments share a cluster, when a high-priority department's (such as online business department) Queue lacks resources, it can reclaim resources from other department Queues (such as offline computing department). For example, online business Queues can reclaim resources from offline business Queues, but offline business Queues cannot reclaim resources from each other.

### Resource utilization optimization

Through the cross-queue resource reclamation mechanism, the cluster can improve overall resource utilization while ensuring SLA for high-priority businesses. When a high-priority Queue lacks resources, it can reclaim resources from low-priority Queues to ensure resource requirements for critical businesses.

:::note

1. Reclaim checks multiple conditions during execution: whether the target Queue is reclaimable, whether the task can be reclaimed (Preemptable), whether the job's running requirements can be met after resource reclamation, etc., to ensure the rationality of resource reclamation.
2. To make jobs in a Queue reclaimable by other Queues, the reclaimable field in the Queue's spec must be set to true.

:::
