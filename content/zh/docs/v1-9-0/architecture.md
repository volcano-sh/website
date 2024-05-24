+++
title =  "架构"

date = 2024-05-21
lastmod = 2024-05-21

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "架构"
[menu.v1-9-0]
  parent = "home"
  weight = 2
+++

## 架构概览


{{<figure library="1" src="arch_1.png" title="Volcano的应用场景">}}

Volcano与Kubernetes天然兼容，并为高性能计算而生。它遵循Kubernetes的设计理念和风格。

{{<figure library="1" src="arch_2.PNG" title="Volcano的系统架构">}}

Volcano由scheduler、controllermanager、admission和vcctl组成:

- Scheduler
Volcano scheduler通过一系列的action和plugin调度Job，并为它找到一个最适合的节点。与Kubernetes default-scheduler相比，Volcano与众不同的
地方是它支持针对Job的多种调度算法。

- Controllermanager
Volcano controllermanager管理CRD资源的生命周期。它主要由**Queue ControllerManager**、 **PodGroupControllerManager**、 **VCJob
ControllerManager**构成。

- Admission
Volcano admission负责对CRD API资源进行校验。

- Vcctl
Volcano vcctl是Volcano的命令行客户端工具。
