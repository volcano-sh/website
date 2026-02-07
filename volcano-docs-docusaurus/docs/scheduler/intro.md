---
title: Scheduler Overview
---

# Volcano Scheduler Overview

The Volcano Scheduler is a high-performance batch scheduling system designed for Kubernetes. It provides advanced scheduling capabilities beyond the default Kubernetes scheduler, making it ideal for batch workloads, AI/ML training, and high-performance computing (HPC) scenarios.

## Architecture

The Volcano Scheduler consists of two main components:

### Plugins

Plugins are scheduling algorithms that determine **how** jobs and tasks should be prioritized, scored, and allocated to nodes. They implement the core scheduling logic and optimization strategies. Volcano provides a rich set of plugins including:

- **Gang**: Ensures "all or nothing" scheduling for pod groups
- **Binpack**: Optimizes resource utilization by filling nodes efficiently
- **Priority**: Enables fair-share scheduling with customizable priorities
- **DRF**: Implements Dominant Resource Fairness for multi-resource allocation
- And many more...

### Actions

Actions define the **workflow stages** of the scheduling process. They represent the sequential steps the scheduler takes to process jobs. Key actions include:

- **Enqueue**: Filters and queues eligible jobs for scheduling
- **Allocate**: Binds tasks to appropriate nodes
- **Backfill**: Schedules best-effort pods without explicit resource requests
- **Preempt**: Handles intra-queue resource preemption
- **Reclaim**: Manages cross-queue resource reclamation

## How It Works

The Volcano Scheduler operates in sessions, where each session processes jobs through a pipeline of actions. During each action, various plugins are invoked to make scheduling decisions based on cluster state, job requirements, and configured policies.

This flexible architecture allows administrators to customize the scheduling behavior by:
- Enabling or disabling specific plugins
- Configuring plugin parameters
- Defining the sequence of actions
- Setting priority classes and queue configurations

## Learn More

Explore the individual plugin and action documentation to understand their specific behaviors, use cases, and configuration options.
