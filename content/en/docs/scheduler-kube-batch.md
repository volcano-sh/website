+++
title =  "Kube-Batch"


date = 2019-06-18
lastmod = 2019-06-18

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Kube-Batch"
[menu.docs]
  parent = "scheduler"
  weight = 1
+++

The Scheduler used in volcano is built based on [Kube-Batch](https://github.com/kubernetes-sigs/kube-batch) with some enhancements for Volcano.

`kube-batch` is a batch scheduler for Kubernetes, providing mechanisms for applications which would like to run batch jobs leveraging Kubernetes. 

`kube-batch` builds upon a decade and a half of experience on running batch workloads at scale using several systems, combined with best-of-breed ideas and practices from the open source community.

## Overall Architecture

{{<figure library="1" src="kube-batch.png" title="">}}


## Who uses kube-batch?

As the kube-batch Community grows, we'd like to keep track of our users. Please send a PR with your organization name.

Currently **officially** using kube-batch:

1. [Kubeflow](https://www.kubeflow.org)
1. [Volcano](https://github.com/volcano-sh/volcano)
1. [Baidu Inc](http://www.baidu.com)
1. [Tusimple](https://www.tusimple.com)
1. [MOGU Inc](https://www.mogujie.com)
1. [Vivo](https://www.vivo.com)