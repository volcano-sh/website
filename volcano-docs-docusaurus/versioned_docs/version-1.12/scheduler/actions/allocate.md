---
title: Allocate
---

# Allocate

## Overview

This Action binds task to node, including pre-selection and further selection. PredicateFn is used to filter out nodes that cannot be allocated, and NodeOrderFn is used to score the nodes to find the one that best fits. Allocate action is an essential step in a scheduling process, which is used to handle pod scheduling that has resource requests in the pod list to be scheduled.


The Allocate action follows the commit mechanism. When a pod's scheduling request is satisfied, a binding action is not necessarily performed for that pod. This step also depends on whether the gang constraint of the Job in which the pod resides is satisfied. Only if the gang constraint of the Job in which the pod resides is satisfied can the pod be scheduled; otherwise, the pod cannot be scheduled.

## Scenario

In a clustered mixed business scenario, the Allocate pre-selected part enables specific businesses (AI, big data, HPC, scientific computing) to quickly filter, sort, and schedule according to their namespace quickly and centrally. In a complex computing scenario such as TensorFlow or MPI, where there are multiple tasks in a single job, the Allocate action traversal multiple task allocation options under the job to find the most appropriate node for each task.
