+++
title = "Hierarchical Queue"
linktitle = "Hierarchical Queue"
type = "docs"
toc = true

[menu.docs]
  parent = "Key Features"
  weight = 1
+++

## Overview

Hierarchical Queue is a core scheduling feature in Volcano that allows users to organize workloads into multi-level queues. It enables fine-grained resource management and fair sharing across teams, applications, or business units.

By structuring queues hierarchically, cluster administrators can better control how resources are allocated and ensure that critical workloads receive appropriate priority.

---

## Why Hierarchical Queue Is Needed

In shared Kubernetes clusters, multiple teams and applications often compete for limited resources. Without proper queue management, some workloads may starve while others monopolize resources.

Hierarchical queues address this problem by:
- Providing isolation between different teams or workloads
- Enforcing resource quotas at different levels
- Improving overall cluster fairness and utilization

---

## Queue Models in Volcano

Volcano supports different queue models to meet various scheduling requirements.

### Capacity Queue

A capacity queue defines the **maximum amount of resources** that a queue can use. If a queue reaches its capacity limit, additional workloads must wait until resources are freed.

Capacity queues are useful when:
- Strong resource isolation is required
- Teams have fixed resource budgets
- Predictable resource usage is important

---

### Proportion Queue

A proportion queue allocates resources based on a **percentage of the total cluster capacity**. Resources are distributed proportionally among queues according to their configured shares.

Proportion queues are useful when:
- Workloads are dynamic
- Fair sharing is preferred over strict limits
- Clusters need to adapt to changing demand

---

## Typical Use Cases

Hierarchical queues are commonly used in scenarios such as:
- Multi-tenant clusters shared by multiple teams
- AI and big data platforms with diverse workloads
- Enterprises requiring both fairness and isolation in scheduling

---

## Next Steps

This page provides a high-level introduction to hierarchical queues. Detailed configuration examples and advanced scheduling policies will be covered in follow-up documentation.
