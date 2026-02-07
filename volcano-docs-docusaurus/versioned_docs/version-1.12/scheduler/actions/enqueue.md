---
title: Enqueue
---

# Enqueue

## Overview

The Enqueue action filters qualified jobs into the queue to be scheduled. When the minimum number of resource requests under a Job cannot be met, even if the scheduling action is performed for a pod under a Job, pod will not be able to schedule because the "Gang" constraint is not reached. A state refresh from "Pending" to "Inqueue" can only happen if the minimum resource size of the job is met. This state transition is a prerequisite for Pod creation - only after the PodGroup enters the Inqueue state will the vc-controller create Pods for that PodGroup. This mechanism ensures that Pods are only created when resources are available, making it an essential action for scheduler configuration.

## Scenario

Enqueue action is the preparatory stage in the scheduling process. Only when the cluster resources meet the minimum resource request for the job scheduling, the job state can be changed from "pending" to "Enqueue". In this way, Enqueue Action can prevent a large number of unscheduled pods in the cluster and improve the performance of the scheduler in the high-load scenarios where the cluster resources may be insufficient, such as AI/MPI/HPC.

:::note

There is a conflict between enqueue action and preempt/reclaim action. If both enqueue action and preempt/reclaim action are configured, and enqueue action determines that the job cannot be queued, it may result in failure to generate Pending state Pods, thus failing to trigger preempt/reclaim action.

:::
