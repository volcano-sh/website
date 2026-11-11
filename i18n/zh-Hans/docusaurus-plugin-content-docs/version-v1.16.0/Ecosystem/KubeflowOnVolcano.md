---
title: "Kubeflow on Volcano"
sidebar_position: 2
---

## Kubeflow Trainer

Kubeflow Trainer 用于在 Kubernetes 上运行分布式训练任务。Trainer 从 v2.1 开始支持 Volcano 集成，为训练任务创建 PodGroup，由 Volcano 协调 Pod 调度和资源分配。Trainer 负责管理训练任务，Volcano 则提供 Gang 调度、队列资源管理和网络拓扑感知调度。

具体接入方式请参考 [Kubeflow Trainer 官方的 Volcano 集成指南](https://trainer.kubeflow.org/en/latest/operator-guides/job-scheduling/volcano.html)。指南介绍了所需的环境准备，以及如何在训练 Runtime 中启用 Volcano、配置网络拓扑约束、为训练任务指定队列。

如果仍在使用 Training Operator v1，请参考[对应的 Volcano 调度指南](https://trainer.kubeflow.org/en/latest/legacy-v1/user-guides/job-scheduling.html#volcano-scheduler)。
