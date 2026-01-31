---
title: "Task-topology"
sidebar_position: 6
---


#### Overview

The task-topology algorithm is an algorithm that computes the priority of tasks and nodes based on the affinity and anti-affinity configuration between tasks within a Job. By configuring the affinity and anti-affinity policies between tasks within the Job and using the Task-Topology algorithm, tasks with affinity configurations can be scheduled to the same node first, and PODs with anti-affinity configurations to different nodes.

#### Scenario

node affinity：

- Task-topology is important for improving computational efficiency in deep learning computing scenarios. Using the TensorFlow calculation as an example, configure the affinity between "ps" and "worker". Task-topology algorithm enables "ps" and "worker" to be scheduled to the same node as far as possible, so as to improve the efficiency of network and data interaction between "ps" and "worker", thus improving the computing efficiency.
- Tasks in HPC and MPI scenarios are highly synchronized and need high-speed network IO.

Anti-affinity：

- Take the TensorFlow calculation as an example, the anti-affinity between "ps" and "ps"

- Master and slave backup of e-commerce service scene, data disaster tolerant, to ensure that there are spare jobs to continue to provide service after a job fails.
