---
title: "Kubeflow on Volcano"
sidebar_position: 2
---

## Kubeflow Training Operator v1

Kubeflow Training Operator v1 manages distributed training workloads such as TFJob and PyTorchJob. Its Volcano integration creates PodGroups so Volcano can coordinate the scheduling of training Pods with gang scheduling.

Follow the [Training Operator v1 Volcano scheduling guide](https://trainer.kubeflow.org/en/latest/legacy-v1/user-guides/job-scheduling.html#volcano-scheduler) for installation prerequisites and operator configuration.
