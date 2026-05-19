+++
title = "Gang"
date = 2024-01-01
lastmod = 2024-01-01
draft = false
toc = true
type = "docs"

# Add menu entry to sidebar.
linktitle = "Gang"
[menu.v1-12-0]
  parent = "plugins"
  weight = 2
+++



{{<figure library="1" src="gang.png" title="Gang Plugin">}}


The **Gang Plugin** in Volcano enforces gang scheduling constraints, ensuring that a group of related tasks (a "gang") is scheduled together. This plugin is responsible for validating jobs, managing preemption, pipelining, and detecting job starvation.

## Plugin Details

- **Plugin Name:** `gang`
- **Location in source:** `pkg/scheduler/plugins/gang/gang.go`
- **Purpose:** Ensures gang scheduling constraints and job readiness for tasks and sub-jobs.

## Features

1. **Job Validation**
   - Validates tasks and sub-jobs for gang scheduling.
   - Checks minimum required tasks (`MinAvailable`) before scheduling.

2. **Preemption**
   - Determines which tasks can be preempted without violating gang scheduling constraints.
   - Tracks ready task counts per job to maintain scheduling guarantees.

3. **Job Ordering**
   - Orders jobs and sub-jobs based on readiness.
   - Ready jobs have higher priority over non-ready jobs.

4. **Pipelining**
   - Allows pipelined scheduling when tasks and sub-jobs meet pipelined conditions.

5. **Starvation Detection**
   - Detects jobs that cannot be scheduled due to insufficient resources.

## Source Overview

```go
// Example snippet from gang.go
func New(arguments framework.Arguments) framework.Plugin {
    return &gangPlugin{pluginArguments: arguments}
}
```
The full implementation includes functions for `OnSessionOpen`, `OnSessionClose`, job validation, preemption, pipelining, and readiness checks.

## Example Configuration

To enable the Gang plugin, add it to the scheduler configuration:

```yaml
# scheduler configuration
    arguments:
      timeout: 600
```

### Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `gang.schedule.timeout` | Timeout in seconds for gang scheduling | 600 |
| `gang.schedule.retry` | Number of retry attempts for gang scheduling | 5 |

## Usage Scenarios

Gang scheduling is typically used for:

- **Distributed training jobs** where all workers must start together
- **MPI jobs** that require all processes to be running simultaneously
- **Batch processing workloads** with task dependencies
- **Big data analytics** where partial execution is not meaningful

