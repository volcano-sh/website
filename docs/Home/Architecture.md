---
title: "Architecture"
date: 2019-01-28
lastmod: 2020-08-28
draft: false
toc: true
type: "docs"

# Add menu entry to sidebar
sidebar_position: 2
sidebar_label: "Architecture"
---

## Overall Architecture

import arch1 from './images/arch_1.png';
import arch2 from './images/arch_2.png';



<div style={{textAlign: 'center'}}>
  <img src={arch1} alt="Application scenarios of Volcano" style={{maxWidth: '100%'}} />
  <figcaption>Application scenarios of Volcano</figcaption>
</div>

<br />
Volcano is designed for high-performance workloads running on Kubernetes. It follows the design and mechanisms of Kubernetes.
<div style={{textAlign: 'center'}}>
  <img src={arch2} alt="Volcano architecture" style={{maxWidth: '100%'}} />
  <figcaption>Volcano architecture</figcaption>
</div>

Volcano consists of **scheduler** / **controllermanager** / **admission** / **vcctl**:

### Scheduler
Volcano Scheduler schedules jobs to the most suitable node based on actions and plug-ins. Volcano supplements Kubernetes to support multiple scheduling algorithms for jobs.

### ControllerManager (CM)
Volcano CMs manage the lifecycle of Custom Resource Definitions (CRDs). You can use the **Queue CM**, **PodGroup CM**, and **VCJob CM**.

### Admission
Volcano Admission is responsible for the CRD API validation.

### vcctl
Volcano vcctl is the command line client for Volcano.