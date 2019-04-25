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

Volcano is system for runnning high performance workloads on
Kubernetes.  It provides a suite of mechanisms currently missing from
Kubernetes that are commonly required by many classes of high
performance workload including:

1. machine learning/deep learning,
2. bioinformatics/genomics, and 
3. other "big data" applications.

These types of applications typically run on generalized domain
frameworks like Tensorflow, Spark, PyTorch, MPI, etc, which Volcano integrates with.

Some examples of the mechanisms and features that Volcano adds to Kubernetes are:

1. Scheduling extensions, e.g:
    1. Co-scheduling
    2. Fair-share scheduling
    3. Queue scheduling
    4. Preemption and reclaims
    5. Reservartions and backfills
    6. Topology-based scheduling
1. Job management extensions and improvements, e.g:
    1. Multi-pod jobs
    1. Improved error handling
    1. Indexed jobs
1. Others (in upstream)
    1. Optimizations for throughput, round-trip latency, etc.

Volcano builds upon a decade and a half of experience running a wide
variety of high performance workloads at scale using several systems
and platforms, combined with best-of-breed ideas and practices from
the open source community.


Volcano is a Kubernetes Native System for High Performance Workload. It is a deployment/installation framework in K8s which maps domain specific framework term's/concept into common k8s concept of Jobs and Queue. It enables the domain specific features for framework using multiple scheduling options like faire-share, gang-scheduling for Tensor Flow training.  

 
It provides common services to HPW like enhanced job management with multiple pod-template, job management and job life-cycle management. It also provides alternative container runtime like Singularity.   

It has special enhancements for heterogeneous computing and high performance workloads and is specifically designed to support the deployment of BigData/AI/ML Jobs
