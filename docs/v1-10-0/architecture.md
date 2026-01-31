---
title: "Architecture"
date: 2024-09-29
draft: false  # Is this a draft? true/false
toc: true  # Show table of contents? true/false
parent: "home"
sidebar_position: 2
---


## Overall Architecture


![Application scenarios of Volcano](/img/arch_1.png)


Volcano is designed for high-performance workloads running on Kubernetes. It follows the design and mechanisms of Kubernetes.


![Volcano architecture](/img/arch_2.PNG)


Volcano consists of **scheduler** / **controllermanager** / **admission** / **vcctl**:

##### Scheduler
Volcano Scheduler schedules jobs to the most suitable node based on actions and plug-ins. Volcano supplements Kubernetes to support multiple scheduling algorithms for jobs.

##### ControllerManager (CM)
Volcano CMs manage the lifecycle of Custom Resource Definitions (CRDs). You can use the **Queue CM**, **PodGroup CM**, and **VCJob CM**.

##### Admission
Volcano Admission is responsible for the CRD API validation.

##### vcctl
Volcano vcctl is the command line client for Volcano. 
