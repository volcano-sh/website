+++
title = "Priority"
date = 2024-01-01
lastmod = 2024-01-01
draft = false
toc = true
type = "docs"

# Add menu entry to sidebar.
linktitle = "Priority"
[menu.v1-12-0]
  parent = "plugins"
  weight = 3
+++

{{<figure library="1" src="fair-share.png" title="Priority Plugin">}}

The **Priority Plugin** in Volcano enforces job, task, and sub-job priority scheduling.  
It allows fair resource allocation based on `PriorityClassName`, and supports preemption and starvation detection.

## Plugin Details

- **Plugin Name:** `priority`
- **Location in source:** `pkg/scheduler/plugins/priority/priority.go`
- **Purpose:** Orders tasks, jobs, and sub-jobs by priority; manages preemption and starvation.

## Features

1. **Task, Job, Sub-job Ordering**
   - Sorts tasks, jobs, and sub-jobs according to their priority.

2. **Preemption**
   - Preempts lower-priority tasks or jobs if resources are insufficient.

3. **Job Starvation Detection**
   - Detects jobs that cannot progress due to resource limitations.

## Source Overview

```go
// Example snippet from priority.go
func New(arguments framework.Arguments) framework.Plugin {
    return &priorityPlugin{pluginArguments: arguments}
}
```
## Example Configuration
To enable the Priority plugin, add it to the scheduler configuration:

```yaml
# scheduler configuration
actions: "enqueue, allocate, preempt"
tiers:
- plugins:
  - name: priority
    arguments:
      priority.default: 10
      priority.preemption: true
```
### Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `priority.default` | Default priority value for jobs without explicit priority | 10 |
| `priority.preemption` | Enable or disable preemption for priority scheduling | true |

## Usage Scenarios

Priority scheduling is suitable for workloads where certain jobs require faster scheduling or higher resource guarantees, such as:

- **Financial applications** where latency-sensitive transactions need priority
- **IoT monitoring** where critical alerts require immediate processing
- **Real-time AI processing** where inference requests have higher priority
- **Multi-tenant clusters** where different teams have different service levels

## Metrics

The plugin provides the following metrics:

- `priority_preemption_count`: Number of preemption events triggered by priority
- `priority_scheduling_latency`: Scheduling delay for high-priority jobs
- `priority_allocation_ratio`: Resource allocation ratio across priority levels
- `priority_job_starved`: Number of jobs starving due to priority constraints
