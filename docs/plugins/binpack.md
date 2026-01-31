---
title: "Binpack"
sidebar_position: 2
---


#### Overview

The goal of the BinPack scheduling algorithm is to fill as many existing nodes as possible (try not to allocate blank nodes). In the concrete implementation, BinPack scheduling algorithm scores the nodes that can be delivered, and the higher the score, the higher the resource utilization rate of nodes. Binpack algorithm can fill up the nodes as much as possible to close the application load to some nodes, which is very conducive to the automatic expansion capacity function of K8s cluster nodes.

The BinPack algorithm is injected into the Volcano-Scheduler process as a plug-in and will be applied during the Pod stage of node selection. When calculating the Binpack algorithm, the Volcano-Scheduler considers the various resources requested by Pod and averages them according to the weights configured for each resource. The weight of each resource in the node score calculation is different, depending on the weight value configured by the administrator for each resource. Different plug-ins also need to assign different weights when calculating node scores, and the Scheduler also sets the score weights for BinPack plugins.

#### Scenario

The BinPack algorithm is good for small jobs that can fill as many nodes as possible. For example, the single query job in the big data scene, the order generation in the e-commerce seckill scene, the single identification job in the AI scene, and the high concurrency service scene on the Internet, etc. This scheduling algorithm can reduce the fragmentation in the node as much as possible, and reserve enough resource space on the idle machine for Pod which has applied for more resource requests, so as to maximize the utilization of idle resources under the cluster.
