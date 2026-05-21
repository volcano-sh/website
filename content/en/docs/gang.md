+++
title = "Gang"

date = 2021-05-13
lastmod = 2025-11-11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Gang"
[menu.docs]
  parent = "plugins"
  weight = 4
+++

{{<figure library="1" src="gang.png" title="Gang Plugin">}}

## Overview

The Gang scheduling strategy is one of the core scheduling algorithms of the Volcano Scheduler. It meets the scheduling requirements of "All or nothing" in the scheduling process and avoids the waste of cluster resources caused by arbitrary scheduling of Pods. The Gang scheduler algorithm observes whether the scheduled number of Pods under a Job meets the minimum number of runs. When the minimum number of runs of Job is satisfied, the scheduling action is executed for all Pods under the Job; otherwise, it is not executed.

## How It Works

The Gang plugin considers tasks not in the `Ready` state (including Binding, Bound, Running, Allocated, Succeed, and Pipelined) as having a higher priority. It checks whether the resources allocated to the queue can meet the resources required by the task to run `minAvailable` pods after trying to evict some pods and reclaim resources. If yes, the Gang plugin will proceed with scheduling.

Key functions implemented by the Gang plugin:

- **JobReadyFn**: Checks if a job has enough resources to meet its `minAvailable` requirement
- **JobPipelinedFn**: Checks if a job can be pipelined
- **JobValidFn**: Validates if a job's Gang constraint is satisfied

## Scenario

The Gang scheduling algorithm based on the container group concept is well suited for scenarios that require multi-process collaboration:

### AI and Deep Learning

AI scenes often contain complex processes including Data Ingestion, Data Analysts, Data Splitting, Trainers, Serving, and Logging. These require a group of containers to work together, making them suitable for the container-based Gang scheduling strategy.

### MPI and HPC

Multi-thread parallel computing communication scenarios under the MPI computing framework are also suitable for Gang scheduling because master and slave processes need to work together. Containers under the container group are highly correlated, and there may be resource contention. Overall scheduling allocation can effectively solve deadlock situations.

### Resource Efficiency

In the case of insufficient cluster resources, the Gang scheduling strategy can significantly improve the utilization of cluster resources by preventing partial job allocations that would waste resources waiting for other tasks.

## Configuration

The Gang plugin is typically enabled by default and configured in the scheduler ConfigMap:

```yaml
tiers:
- plugins:
  - name: priority
  - name: gang
  - name: conformance
```

## Example

Here's an example of a VolcanoJob that uses Gang scheduling:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-job
spec:
  minAvailable: 3  # Gang constraint: at least 3 pods must be schedulable
  schedulerName: volcano
  tasks:
  - replicas: 1
    name: ps
    template:
      spec:
        containers:
        - name: tensorflow
          image: tensorflow/tensorflow:latest
  - replicas: 2
    name: worker
    template:
      spec:
        containers:
        - name: tensorflow
          image: tensorflow/tensorflow:latest
```

In this example, the job will only be scheduled if all 3 pods (1 ps + 2 workers) can be allocated resources simultaneously.
