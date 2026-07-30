---
title: Pod Disruption Budget (PDB)
---

## Introduction

When users deploy highly available jobs or applications on Volcano, they often need to limit the number of pod replicas that can be evicted or destroyed simultaneously to avoid downtime. This constraint is managed via Kubernetes **PodDisruptionBudget (PDB)** resources.

The **PDB Plugin** ensures that Volcano respects user-defined PDB constraints during the scheduling process, specifically during eviction actions like `reclaim`, `preempt`, and `shuffle`.

## Prerequisites

- Your Kubernetes version must be 1.21 or later.
- You must have created valid `PodDisruptionBudget` resources for your workloads.

## Mechanism

The PDB Plugin registers several functions (`ReclaimableFn`, `PreemptableFn`, and `VictimTasksFn`) under the `reclaim`, `preempt`, and `shuffle` actions. It maintains a cache of PDBs using `v1.PodDisruptionBudgetLister`. 

During eviction scenarios, the plugin filters out tasks whose eviction would violate the configured PDB constraints. It calculates the `DisruptedPods` (pods whose eviction was processed but not yet observed by the PDB controller) and ensures the remaining available replicas satisfy the budget.

## Configuration

To enable the PDB Plugin, update the `volcano-scheduler-configmap` to include the `pdb` plugin in your configuration tiers.

```yaml
actions: "reclaim, preempt, shuffle"
tiers:
- plugins:
  - name: pdb    # Enable the PDB plugin
  - name: priority
  - name: gang
  - name: conformance
- plugins:
  - name: overcommit
  - name: drf
  - name: predicates
  - name: proportion
  - name: nodeorder
  - name: binpack
```

*Note: The PDB plugin will be actively invoked when actions like `reclaim`, `preempt`, or `shuffle` are executed in the scheduler workflow.*
