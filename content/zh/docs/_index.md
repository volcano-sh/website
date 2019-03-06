+++
title = "Introduction"

date = 2019-01-28
lastmod = 2019-01-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
[menu.docs]
  parent = "welcome"
  weight = 1
+++

Volcano is a Kubernetes Native System for High Performance Workload. It is a deployment/installation framework in K8s which maps domain specific framework term's/concept into common k8s concept of Jobs and Queue. It enables the domain specific features for framework using multiple scheduling options like faire-share, gang-scheduling for Tensor Flow training.  

 
It provides common services to HPW like enhanced job management with multiple pod-template, job management and job life-cycle management. It also provides alternative container runtime like Singularity.   

It has special enhancements for heterogeneous computing and high performance workloads and is specifically designed to support the deployment of BigData/AI/ML Jobs
