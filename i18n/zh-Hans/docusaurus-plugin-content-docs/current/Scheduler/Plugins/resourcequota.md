---
title: ResourceQuota
---

## Introduction

In a multi-tenant cluster, administrators commonly use Kubernetes `ResourceQuota` to limit the total resource consumption per namespace. However, by default, the scheduler may continuously try to enqueue and schedule pod groups even if the namespace's `ResourceQuota` is insufficient, leading to pending jobs and scheduler overhead.

The **ResourceQuota Plugin** solves this problem by ensuring that a PodGroup is only allowed to enqueue if there is sufficient resource capacity in the namespace to satisfy the minimal resource quota required by the PodGroup.

## Mechanism

Volcano implements the ResourceQuota plugin using the `AddJobEnqueueableFn` function.

1. **Namespace Capacity Cache**: The plugin maintains an `RQStatus` map to cache all resource quotas for each namespace.
2. **Evaluation**: It calculates the `minQuotas`—which defines the minimal resource quota required to run the pod group.
3. **Enqueue Admission**: When evaluating pending PodGroups, the plugin allows them to enqueue *only* if the namespace's Kubernetes `ResourceQuota` has enough available capacity. It also considers PodGroups that have already been permitted in the current scheduling round to prevent race conditions that could exceed the namespace quota.

## Configuration

To enable the ResourceQuota Plugin, add it to your `volcano-scheduler-configmap`.

```yaml
actions: "enqueue, allocate, backfill"
tiers:
  - plugins:
      - name: priority
      - name: gang
      - name: conformance
      - name: resourcequota  # Enable the ResourceQuota plugin
  - plugins:
      - name: overcommit
      - name: drf
      - name: predicates
      - name: proportion
      - name: nodeorder
      - name: binpack
```

Once enabled, Volcano will respect the Kubernetes native `ResourceQuota` configuration and prevent jobs from enqueuing into the scheduling pipeline if they cannot possibly fit within their namespace quota.
