---
title: "Kubeflow on Volcano"
sidebar_position: 2
---

## Kubeflow Trainer

Kubeflow Trainer runs distributed training workloads on Kubernetes. Volcano integration is available from Trainer v2.1 and creates PodGroups for training jobs, allowing Volcano to coordinate Pod scheduling and resource allocation. Trainer manages the training workload, while Volcano provides gang scheduling, queue-based resource management, and network topology-aware scheduling.

Follow the [Kubeflow Trainer Volcano integration guide](https://trainer.kubeflow.org/en/latest/operator-guides/job-scheduling/volcano.html) for prerequisites and configuration. The guide covers enabling Volcano in training runtimes, setting network topology constraints, and assigning training jobs to queues.

For existing Training Operator v1 deployments, see the [official Volcano scheduling guide](https://trainer.kubeflow.org/en/latest/legacy-v1/user-guides/job-scheduling.html#volcano-scheduler).
