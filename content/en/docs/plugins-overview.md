+++
title = "Plugins"

date = 2021-05-13
lastmod = 2025-11-11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Plugins"
[menu.docs]
  name = "Plugins"
  parent = "scheduler"
  weight = 3
  identifier = "plugins"
+++

## Overview

Plugins are the core components of Volcano scheduler that provide specific scheduling algorithms and strategies. They work together with [Actions](/en/docs/actions/) to implement the scheduling logic. While actions define what should be done in each scheduling step, plugins provide the detailed algorithms for how it should be done.

## How Plugins Work

Plugins are registered with the scheduler and are called during the execution of actions. Each plugin can implement one or more of the following functions:

- **JobOrderFn**: Determines the order of jobs in the scheduling queue
- **TaskOrderFn**: Determines the order of tasks within a job
- **PredicateFn**: Filters out nodes that cannot accommodate a task
- **NodeOrderFn**: Scores nodes to find the best fit for a task
- **PreemptableFn**: Identifies tasks that can be preempted
- **ReclaimableFn**: Identifies tasks that can be reclaimed
- **JobReadyFn**: Checks if a job is ready to be scheduled
- **JobPipelinedFn**: Checks if a job can be pipelined

## Available Plugins

Volcano provides the following plugins:

| Plugin | Description |
|--------|-------------|
| [Gang](/en/docs/gang/) | Ensures all tasks of a job are scheduled together (All or nothing) |
| [Binpack](/en/docs/binpack/) | Packs tasks onto nodes to maximize resource utilization |
| [Priority](/en/docs/priority/) | Sorts jobs and tasks based on priority |
| [DRF](/en/docs/drf/) | Dominant Resource Fairness for fair resource allocation |
| [Proportion](/en/docs/proportion/) | Queue-based resource allocation with proportional sharing |
| [Task-topology](/en/docs/task-topology/) | Considers task affinity and anti-affinity within a job |
| [Predicates](/en/docs/predicates/) | Filters nodes based on predicates including GPU requirements |
| [Nodeorder](/en/docs/nodeorder/) | Scores nodes using various dimensions |
| [SLA](/en/docs/sla/) | Service Level Agreement constraints for jobs |
| [TDM](/en/docs/tdm/) | Time Division Multiplexing for shared node resources |
| [Numa-aware](/en/docs/numa-aware/) | NUMA topology-aware scheduling for CPU-bound workloads |

## Plugin Configuration

Plugins are configured in the Volcano scheduler ConfigMap.
