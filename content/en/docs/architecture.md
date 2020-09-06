+++
title =  "Architecture"


date = 2019-01-28
lastmod = 2020-08-28

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Architecture"
[menu.docs]
  parent = "home"
  weight = 2
+++

## Overall Architecture


{{<figure library="1" src="arch_1.png" title="application scenarios of Volcano">}}


Volcano is designed for high performance workload and works with Kubernetes naturally. It follows the design philosophy 
and style of Kubernetes.


{{<figure library="1" src="arch_2.PNG" title="Volcano architecture">}}


Volcano consists of **scheduler** / **controllermanager** / **admission** / **vcctl**.

##### scheduler
Volcano scheduler aims to schedule jobs to the most suitable node throughout a series of actions and plugins. What makes 
it different from default scheduler is its various scheduling algorithms for job.

##### controllermanager
Volcano controllermanager manages the lifecycle of CRD resource. It mainly includes **Queue ControllerManager** / **PodGroup 
ControllerManager** / **VCJob ControllerManager**.

##### admission
Volcano admission is responsible for the CRD API validation.

##### vcctl
vcctl is the commandline client for Volcano . 
