+++
title =  "Architecture"


date = 2019-01-28
lastmod = 2019-01-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Architecture"
[menu.docs]
  parent = "concepts"
  weight = 3
+++

## Overall Architecture


{{<figure library="1" src="arch.png" title="">}}

### Common Service for high performance workload :
- Batch Scheduler, e.g. fair-share, gang-scheduling
- Batch Job Management, e.g. multiple pod template, job dependency
- Command Line, e.g. suspend/resume, view
- Runtime, e.g. Singularity
- Accelerator, e.g. GPU, FPGA
- Kuberentes enhancements, e.g. throughput

{{<figure library="1" src="arch-2.png" title="">}}

1. Kubectl creates a JobEx object in apiserver if all admission passed
2. JobExController create Pods based on its replicas and templates
3. vk-scheduler get the “notification” of Pod from apiserver
4. vk-scheduler chooses one host for the Pod of JobEx based on its policy
5. kubelet gets the notification of Pod from apiserver; and then start the container