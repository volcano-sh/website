---
title: "架构设计"
sidebar_position: 2
---

## 整体架构


[Volcano的应用场景](/img/doc/arch_1.png)


Volcano是针对Kubernetes上运行的高性能工作负载而设计的。它遵循Kubernetes的设计和机制。


![Volcano架构](/img/doc/arch_2.PNG)


Volcano由 **scheduler** / **controllermanager** / **admission** / **vcctl** 组成：

### 调度器 (Scheduler)
Volcano调度器基于动作（Actions）和插件（Plugins）将作业调度到最合适的节点。Volcano弥补了Kubernetes在支持多种作业调度算法方面的不足。

### 控制器管理器 (ControllerManager)
Volcano控制器管理器管理自定义资源定义（CRD）的生命周期。您可以使用 **Queue CM**、**PodGroup CM** 和 **VCJob CM**。

### 准入控制 (Admission)
Volcano Admission负责CRD API的校验。

### 命令行工具 (vcctl)
Volcano vcctl是Volcano的命令行客户端。 