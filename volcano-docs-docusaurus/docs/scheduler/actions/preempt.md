---
title: Preempt
---

# Preempt

## Overview

The preempt action is used for resource preemption between jobs in a queue , or between tasks in a job.The preempt action is a preemption step in the scheduling process, which is used to deal with high-priority scheduling problems. It is used for preemption between jobs in the same queue, or between tasks under the same job.

## Scenario

### Preemption between jobs in the same queue

Multiple departments in a company share a cluster, and each department can be mapped into a Queue. Resources of different departments cannot be preempted from each other. This mechanism can well guarantee the isolation of resources of departments..In complex scheduling scenarios, basic resources (CPUs, disks, GPUs, memory, network bandwidth) are allocated based on services: In computing-intensive scenarios, such as AI and high-performance scientific computing, queues require more computing resources, such as CPUs, GPUs, and memory. Big data scenarios, such as the Spark framework, have high requirements on disks. Different queues share resources. If AI jobs preempts all CPU resources, jobs in queues of other scenarios will starve. Therefore, the queue-based resource allocation is used to ensure service running.

### Preemption between tasks in the same job

Usually, there can be multiple tasks in the same Job. For example, in complex AI application scenarios, a parameter server and multiple workers need to be set inside the TF-job, and preemption between multiple workers is supported by preemption within such scenarios.
