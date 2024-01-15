+++
title =  "Architecture"


date = 2024-01-16
lastmod = 2024-01-16

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Architecture"
[menu.v1-7-0]
  parent = "home"
  weight = 2
+++

## Overall Architecture


{{<figure library="1" src="arch_1.png" title="Application scenarios of Volcano">}}


Volcano is designed for high-performance workloads running on Kubernetes. It follows the design and mechanisms of Kubernetes.


{{<figure library="1" src="arch_2.PNG" title="Volcano architecture">}}


Volcano consists of **scheduler** / **controllermanager** / **admission** / **vcctl**:

##### Scheduler
Volcano Scheduler schedules jobs to the most suitable node based on actions and plug-ins. Volcano supplements Kubernetes to support multiple scheduling algorithms for jobs.

##### ControllerManager (CM)
Volcano CMs manage the lifecycle of Custom Resource Definitions (CRDs). You can use the **Queue CM**, **PodGroup CM**, and **VCJob CM**.

##### Admission
Volcano Admission is responsible for the CRD API validation.

##### vcctl
Volcano vcctl is the command line client for Volcano. 
