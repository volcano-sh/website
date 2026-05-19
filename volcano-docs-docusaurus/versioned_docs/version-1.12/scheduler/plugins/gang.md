---
title: Gang
---

import Figure from '@site/src/components/shortcodes/Figure';

# Gang

<Figure src="/img/gang.png" title="Gang plugin architecture" />


## Overview

The Gang scheduling strategy is one of the core scheduling algorithms of the Volcano-Scheduler. It meets the scheduling requirements of "All or nothing" in the scheduling process and avoids the waste of cluster resources caused by arbitrary scheduling of Pod. The Gang scheduler algorithm is to observe whether the scheduled number of Pods under Job meets the minimum number of runs. When the minimum number of runs of Job is satisfied, the scheduling action is executed for all Pods under Job; otherwise, it is not executed.

## Scenario

The Gang scheduling algorithm based on the container group concept is well suited for scenarios that require multi-process collaboration. AI scenes often contain complex processes. Data Ingestion, Data Analysts, Data Splitting, trainers, Serving, Logging, etc., which require a group of containers to work together, are suitable for container-based Gang scheduling strategies. Multi-thread parallel computing communication scenarios under MPI computing framework are also suitable for Gang scheduling because master and slave processes need to work together. Containers under the container group are highly correlated, and there may be resource contention. The overall scheduling allocation can effectively solve the deadlock.

In the case of insufficient cluster resources, the scheduling strategy of Gang can significantly improve the utilization of cluster resources.
