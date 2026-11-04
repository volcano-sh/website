---
title: "Kubeflow on Volcano"
sidebar_position: 2
---

## Kubeflow Training Operator v1

Kubeflow Training Operator v1 负责管理 TFJob、PyTorchJob 等分布式训练任务。接入 Volcano 后，Operator 会为训练任务创建 PodGroup，由 Volcano 通过 Gang 调度协调多个 Pod 的运行。

环境准备和 Operator 配置方式请参考 [Training Operator v1 官方的 Volcano 调度指南](https://trainer.kubeflow.org/en/latest/legacy-v1/user-guides/job-scheduling.html#volcano-scheduler)。
