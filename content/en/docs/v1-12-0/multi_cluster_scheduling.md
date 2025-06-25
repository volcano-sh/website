+++
title = "Multi-Cluster AI Job Scheduling"

date = 2025-01-21
lastmod = 2025-01-21

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
toc_depth = 5
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
[menu.v1-12-0]
  parent = "features"
  weight = 2
+++

## Background

With the rapid growth of enterprise business, a single Kubernetes cluster often cannot meet the demands of large-scale AI training and inference tasks. Users typically need to manage multiple Kubernetes clusters to achieve unified workload distribution, deployment, and management. Currently, multi-cluster orchestration systems in the industry (such as [Karmada](https://karmada.io/)) primarily target microservices scenarios, providing high availability and disaster recovery deployment capabilities. However, in terms of AI job scheduling, Karmada's capabilities are still limited. It lacks support for **Volcano Job** and cannot meet requirements such as queue management, multi-tenant fair scheduling, and job priority scheduling.

To address the scheduling and management challenges of AI jobs in a multi-cluster environment, the **Volcano community** has incubated the **[Volcano Global](https://github.com/volcano-sh/volcano-global)** sub-project. Based on Karmada, this project extends Volcano's powerful scheduling capabilities in single clusters, providing a unified scheduling platform for multi-cluster AI jobs. It supports cross-cluster task distribution, resource management, and priority control.

## Features

Volcano Global enhances Karmada with the following features to meet the complex requirements of multi-cluster AI job scheduling:

1. **Cross-Cluster Scheduling for Volcano Job**
   Users can deploy and schedule Volcano Jobs in a multi-cluster environment, fully utilizing the resources of multiple clusters to improve task execution efficiency.
2. **Queue Priority Scheduling**
   Supports cross-cluster queue priority management, ensuring that tasks in high-priority queues can obtain resources first.
3. **Job Priority Scheduling and Queuing**
   In a multi-cluster environment, supports job-level priority scheduling and queuing mechanisms, ensuring that critical tasks are executed promptly.
4. **Multi-Tenant Fair Scheduling**
   Provides cross-cluster multi-tenant fair scheduling capabilities, ensuring fair and reasonable resource allocation among different tenants and avoiding resource contention.

## Architecture

<div style="text-align: center;"> {{<figure library="1" src="./multi-cluster/volcano_global_design.svg">}}
</div>

Volcano Global consists of two components:

- **Volcano Webhook:** Listens for the creation events of `ResourceBinding` resources and sets the `ResourceBinding` to a paused state.
- **Volcano Controller:** Listens for `ResourceBinding` resources in the paused state, performs priority and fair scheduling based on the priority of the Job's queue and the Job itself, and runs the resource admission mechanism to determine whether the Job can be scheduled. Once admission is successful, it resumes the `ResourceBinding`, allowing Karmada to distribute the resources.

## Usage Guide

Please refer to: [Volcano Global Deploy](https://github.com/volcano-sh/volcano-global/blob/main/docs/deploy/README.md).
