+++
title =  "Concept"


date = 2019-01-28
lastmod = 2019-01-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "HPW"
[menu.docs]
  parent = "concepts"
  weight = 2
+++

## Volcano: A Kubernetes-based system for HPW


{{<figure library="1" src="volcano-hpw.png" title="">}}

### Domain Frameworks :
- Deployment/Installation of framework in k8s
- Map framework’s terms/concepts into common concept, e.g. Job, Queue
- Enable related features for frameworks, e.g. gangscheduling for TensorFlow training

### Common Service for high performance workload :
- Batch scheduling, e.g. fair-share, gang-scheduling
- Enhanced job management, e.g. multiple pod template, job dependency, job lifecycle management
- Alternative container runtime, e.g. Singularity
- Enhancement for heterogeneous computing
- Enhancement for high performance workload, e.g. performance, throughput