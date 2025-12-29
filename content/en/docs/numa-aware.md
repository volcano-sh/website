+++
title = "Numa-aware Plugin"

date = 2021-05-13
lastmod = 2021-05-13

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Numa-aware"
[menu.docs]
  parent = "plugins"
  weight = 11
+++

## Overview

When the node runs many CPU-bound pods, the workload can move to different CPU cores depending on whether the pod is throttled and which CPU cores are available at scheduling time. Many workloads are not sensitive to this migration and thus work fine without any intervention. However, in workloads where CPU cache affinity and scheduling latency significantly affect workload performance, the kubelet allows alternative CPU management policies to determine some placement preferences on the node.

The CPU Manager and the Topology Manager are all Kubelet components, However There is the following limitation:

- The scheduler is not topology-aware. so it is possible to be scheduled on a node and then fail on the node due to the Topology Manager. this is unacceptable for TensorFlow job. If any worker or ps failed on node, the job will fail.
- The managers are node-level that results in an inability to match the best node for NUMA topology in the whole cluster.

The Numa-Aware Plugin aims to address these limitations.

- Support cpu resource topology scheduling.
- Support pod-level topology policies.

## Scenario

Common scenarios for NUMA-Aware are computation-intensive jobs that are sensitive to CPU parameters, scheduling delays. Such as scientific calculation, video decoding, animation rendering, big data offline processing and other specific scenes.
