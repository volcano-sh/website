---
title: "Gang-Aware Preemption and Reclamation"
sidebar_position: 9
---

## Overview

Volcano v1.15 introduces Gang-aware preemption and resource reclamation for distributed workloads. The feature changes eviction decisions from Pod granularity to Job/Gang granularity. It is intended for workloads whose progress depends on a minimum number of members running together, such as distributed training and HPC jobs.

The legacy `preempt` and `reclaim` actions select victims as individual tasks. Under resource pressure, that approach can evict a Pod from several running jobs without releasing a feasible placement for the pending job. The result may disrupt multiple workloads while the preemptor still cannot reach `minAvailable`.

Gang-aware eviction evaluates both sides of the decision:

- Victims are grouped by Job/Gang so the scheduler can account for the disruption caused to each running workload.
- The preemptor is evaluated as a complete gang. Eviction is committed only after placement simulation confirms that the pending gang can be scheduled.

This feature is Alpha in v1.15.

## Scheduling Flow

![Gang-aware preemption and reclamation flow](/img/doc/gang-aware-eviction-flow.svg)

<!-- Replace the SVG above with the project presentation diagram when the final artwork is available. -->

### Victim evaluation

For each candidate Job, Volcano separates tasks into two groups relative to the Job's effective availability target:

| Group | Meaning | Selection order |
|-------|---------|-----------------|
| Surplus tasks | Replicas above the availability target. Evicting them does not immediately break the victim gang. | Considered first. |
| Critical tasks | Replicas required to keep the victim gang available. | Considered only when surplus tasks are insufficient. |

The scheduler applies the configured plugin filters to the candidate set before selecting victims. Whole-gang candidates are retained only when the complete bundle remains eligible; a partially accepted whole bundle is not treated as a valid victim.

### Preemptor placement

Victim bundles are added incrementally. When the currently available resources plus the selected victim resources can cover the preemptor's total request, Volcano simulates placement against the projected resource view.

If every required preemptor task can be placed, victim eviction and target-node nomination are committed as one scheduling decision. If simulation fails, the scheduler adds another victim bundle and retries. No eviction is committed when the complete gang cannot be placed.

When network topology-aware scheduling is enabled, victim search and placement simulation run within the selected HyperNode scope. This avoids releasing resources in a topology domain that cannot host the pending gang.

## Actions

Gang-aware eviction is implemented by two dedicated scheduler actions. The legacy actions remain unchanged.

| Action | Scope | Ordering rule |
|--------|-------|---------------|
| `gangPreempt` | Priority-based preemption. | Lower-priority victims are selected first; disruption efficiency is a secondary ordering factor. |
| `gangReclaim` | Cross-queue resource reclamation. | Queue fairness, overuse, and reclaimability are evaluated before Job-level ordering. |

Enable the actions in `volcano-scheduler-configmap`:

```yaml
actions: "enqueue, allocate, backfill, gangPreempt, gangReclaim"
tiers:
  - plugins:
      - name: priority
      - name: gang
      - name: drf
      - name: predicates
      - name: nodeorder
      - name: binpack
```

:::warning

Do not configure `gangPreempt` or `gangReclaim` together with the legacy `preempt` or `reclaim` actions in the same action list. The two paths use different victim-selection control flows and are not intended to run in the same scheduling cycle.

:::

## Workload Requirements

The pending workload must expose gang semantics through a Volcano Job or PodGroup. Volcano Job uses `minAvailable`, while PodGroup uses `minMember`, to define the minimum number of members required for the workload to run:

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: PodGroup
metadata:
  name: distributed-training
spec:
  minMember: 8
```

The scheduler also evaluates the total resource request and placement constraints of the pending gang. Satisfying only the member count is not sufficient if the selected nodes cannot satisfy resource, affinity, device, or topology constraints.

For `gangReclaim`, victim queues must also be reclaimable under the configured queue plugin. Queue guarantees and deserved resources continue to constrain which resources can be reclaimed.

## Operational Notes

- Treat the feature as Alpha when planning production rollout. Test the action chain and victim behavior with representative queue, priority, PodGroup, and topology configurations.
- Monitor Pod eviction events and pending PodGroup status after enabling the actions. A successful victim search does not bypass normal predicate or topology checks.
- The feature reduces avoidable disruption; it does not guarantee zero disruption. Critical replicas may still be selected when surplus replicas cannot provide a feasible placement and the configured policies permit the eviction.
- Existing workloads continue to use task-level eviction until the new actions are explicitly configured.

## References

- [Volcano v1.15.0 release notes](https://github.com/volcano-sh/volcano/releases/tag/v1.15.0)
- [Gang-aware eviction design](https://github.com/volcano-sh/volcano/blob/v1.15.0/docs/design/gang-aware-eviction-design.md)
- [EvictableFn evolution for Gang-aware eviction](https://github.com/volcano-sh/volcano/blob/v1.15.0/docs/design/evictablefn-evolution-for-gang-eviction.md)
- [Scheduler actions](../Scheduler/Actions.md)
