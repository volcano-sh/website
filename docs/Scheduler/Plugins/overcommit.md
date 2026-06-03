---
title: Overcommit
---

## Introduction

In typical cluster environments, the scheduler calculates available idle resources strictly based on physical node capacity minus allocated resources. However, when cluster resources are nearly fully utilized, many PodGroups are rejected from entering the scheduling pipeline and are left completely un-enqueued, which might not be desirable for scenarios where you want the scheduler to tolerate a larger backlog of `pending` pods.

The **Overcommit Plugin** allows the scheduler to artificially inflate the apparent "idle resources" of the cluster by applying an `overcommit-factor`. This permits more jobs to be enqueued and wait in the scheduling pipeline than the physical resources might typically allow.

## Mechanism

The Overcommit plugin evaluates whether a job can be enqueued based on the requested `MinResources` of the PodGroup and the expanded idle resources.

Expanded idle resource is calculated as:
`Idle Resource = (Total Resource * overcommit-factor) - Used Resource`

If the job's minimal requested resources can fit into this expanded idle resource pool, the job is permitted to be enqueued.

## Configuration

To use the Overcommit Plugin, add it to your `volcano-scheduler-configmap` under the `enqueue` tier, and provide an `overcommit-factor`.

```yaml
actions: "enqueue, allocate, backfill"
tiers:
  - plugins:
      - name: overcommit  # Enable the overcommit plugin
        arguments:
          overcommit-factor: 1.2  # The overcommit factor. Default is 1.2
      - name: priority
      - name: gang
      - name: conformance
  - plugins:
      - name: drf
      - name: predicates
      - name: proportion
      - name: nodeorder
      - name: binpack
```

### Arguments

- **`overcommit-factor`**: A float value greater than or equal to `1.0`. For example, `1.2` means the scheduler will pretend the cluster has 20% more total resources when deciding whether to enqueue jobs into the pipeline. If a value less than `1.0` is provided, the plugin will automatically fallback to the default value of `1.2`.
