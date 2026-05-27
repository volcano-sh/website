+++
title = "Key Features"
linktitle = "Key Features"
type = "docs"
toc = true

[menu.docs]
  parent = "scheduler"
  weight = 2
+++

## Overview

Volcano is a cloud-native batch system built on Kubernetes, designed to run high-performance workloads such as AI, Big Data, and HPC jobs efficiently. This section introduces the key features that make Volcano powerful and flexible for diverse scheduling scenarios.

## Core Capabilities

### Unified Scheduling on Kubernetes
Volcano is fully compatible with Kubernetes and provides unified scheduling capabilities for batch workloads, online services, and mixed workloads within a single cluster.

### Gang Scheduling
Volcano supports gang scheduling, ensuring that a group of related pods are scheduled together or not at all. This is critical for distributed workloads such as MPI and deep learning training.

### Hierarchical Queues
Hierarchical queues allow users to organize workloads into multi-level queues with fine-grained resource control, improving fairness and utilization across teams and applications.

### Colocation of Online and Offline Workloads
Volcano enables colocation of latency-sensitive online services and resource-intensive offline jobs, improving overall cluster utilization.

### Extensible Scheduling Plugins
Volcano provides a rich plugin system that allows users to customize scheduling behavior for different scenarios, such as GPU scheduling, topology-aware scheduling, and resource fairness.
