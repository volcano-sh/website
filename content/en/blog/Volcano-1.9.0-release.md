+++
title =  "Volcano v1.9.0 Available Now"
description = "New features: Support elastic queue capacity scheduling, Supports affinity scheduling between queues and nodes, GPU sharing feature supports node scoring scheduling, Volcano Support for Kubernetes v1.29, Enhance scheduler metrics, Add license compliance check, Improve scheduling stability, etc."
subtitle = ""

date = 2024-05-21
lastmod = 2024-05-21
datemonth = "May"
dateyear = "2024"
dateday = 21

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["volcano"]

tags = ["Practice"]
summary = "New features: Support elastic queue capacity scheduling, Supports affinity scheduling between queues and nodes, GPU sharing feature supports node scoring scheduling, Volcano Support for Kubernetes v1.29, Enhance scheduler metrics, Add license compliance check, Improve scheduling stability, etc."

# Add menu entry to sidebar.
linktitle = "Volcano v1.9.0 Available Now"
[menu.posts]
parent = "tutorials"
weight = 6
+++

On May 21, 2024, UTC+8, Volcano version v1.9.0 was officially released. This version added the following new features:

- **Support elastic queue capacity scheduling**

- **Supports affinity scheduling between queues and nodes**

- **GPU sharing feature supports node scoring scheduling**

- **Volcano Support for Kubernetes v1.29**

- **Enhance scheduler metrics**

- **Add license compliance check**

- **Improve scheduling stability**

{{<figure library="1" src="volcano_logo.png" width="50%">}}
Volcano is the industry-first cloud native batch computing project. Open-sourced at KubeCon Shanghai in June 2019, it became an official CNCF project in April 2020. In April 2022, Volcano was promoted to a CNCF incubating project. By now, more than 600 global developers have committed code to the project. The community is seeing growing popularity among developers, partners, and users.

### Key Features

#### Support elastic queue capacity scheduling

Volcano now uses the proportion plugin for queue management. Users can set the guarantee, capacity and other fields of the queue to set the reserved resources and capacity limit of the queue. And by setting the weight value of the queue to realize the resource sharing within the cluster, the queue is proportionally divided into cluster resources according to the weight value, but this queue management method has the following problems:

- The capacity of the resources divided by the queue is reflected by the weight, which is not intuitive enough.
- All resources in the queue are divided using the same ratio, and the capacity cannot be set separately for each dimension of the queue.

Based on the above considerations, Volcano implements a new queue elasticity capacity management capability, it supports:

- Allows users to directly set the capacity of each dimension of resources for the queue instead of setting a weight value.
- Elastic capacity scheduling based deserved resources, and queue's resources can be shared and reclaimed back.

For example,  in AI large model training scenario, setting different resource capacities for different GPU models in the queue, such as A100 and V100, respectively. At the same time, when the cluster resources are idle, the queue can reuse the resources of other idle queues, and when needed, reclaim the resources set by the user for the queue, that is, the amount of resources deserved, so as to realize the elastic capacity scheduling.

To use this feature, you need to set the deserved field of the queue and set the amount of resources to be deserved for each dimension. At the same time, you need to turn on the capacity plugin and turn off the proportion plugin in the scheduling configuration.

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: demo-queue
spec:
  reclaimable: true
  deserved: # set the deserved field.
    cpu: 64
    memeory: 128Gi
    nvidia.com/a100: 40
    nvidia.com/v100: 80
```

For a complete usage example of queue elastic capacity scheduling, please refer to:
[How to use capacity plugin](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_capacity_plugin.md).

For the elastic queue capacity design document, please refer to:
[Capacity scheduling Design](https://github.com/volcano-sh/volcano/blob/master/docs/design/capacity-scheduling.md).

#### Supports affinity scheduling between queues and nodes

Queues are usually associated with departments within the company, and different departments usually need to use different heterogeneous resource types. For example, the large model training team needs to use NIVDIA’s Tesla GPU, and the recommendation team needs to use AMD’s GPU. When users submit jobs to the queue , the job needs to be automatically scheduled to the node of the corresponding resource type according to the attributes of the queue.

Volcano has implemented affinity scheduling capabilities for queues and nodes. Users only need to set the node label that require affinity in the affinity field of the queue. Volcano will automatically schedule jobs submitted to the current queue to the nodes associated with the queue. Users do not need to Set the affinity of the job separately, and only need to set the affinity of the queue uniformly. Jobs submitted to the queue will be scheduled to the corresponding node based on the affinity of the queue and the node.

This feature supports hard affinity, soft affinity, and anti-affinity scheduling at the same time. When using it, you need to set a label with the key `volcano.sh/nodegroup-name` for the node, and then set the affinity field of the queue to specify hard affinity, soft affinity label values.

For example, the following queue setting means that jobs submitted to the queue need to be scheduled to nodes with label values of groupname1 and groupname2, and will be scheduled to nodes with label values of groupname2 first. At the same time, jobs cannot be scheduled to nodes with label values of groupname3 and groupname4, when resources are insufficient, it can also be scheduled to the node with the label value groupname3.

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: default
  spec:
    reclaimable: true
    weight: 1
    affinity:            # added field
      nodeGroupAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
        - <groupname1>
        - <groupname2>	
        preferredDuringSchedulingIgnoredDuringExecution:
        - <groupname1>
      nodeGroupAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
        - <groupname3>
        - <gropuname4>
        preferredDuringSchedulingIgnoredDuringExecution:
        - <groupname3>
```

The scheduling plugin for this feature is called nodegroup, for a complete example of its use see: [How to use nodegroup plugin](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to _use_nodegroup_plugin.md).

For detailed design documentation, see [The nodegroup design](https://github.com/volcano-sh/volcano/blob/master/docs/design/node-group.md).

#### GPU sharing feature supports node scoring scheduling

GPU Sharing is a GPU sharing and isolation solution introduced in Volcano v1.8, which provides GPU sharing and device memory control capabilities to enhance the GPU resource utilization in AI training and inference scenarios. v1.9 adds a new scoring strategy for GPU nodes on top of this feature, so that the optimal node can be selected during job assignment to further enhance resource utilization. Users can set different scoring strategies. Currently, the following two strategies are supported:

- Binpack: Provides a binpack algorithm for GPU card granularity, prioritizing to fill up a node with GPU cards that have already been allocated resources to avoid resource fragmentation and waste.

- Spread: Prioritizes the use of idle GPU cards over shared cards that have already been allocated resources.

For detailed usage documentation, please refer to: [How to use gpu sharing](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_gpu_sharing.md).

#### Volcano Support for Kubernetes v1.29

Volcano version follows the Kubernetes community version tempo and supports every base version of Kubernetes. The latest supported version is v1.29 and ran full UT, E2E use cases to ensure functionality and reliability. If you would like to participate in the development of Volcano adapting to new versions of Kubernetes, please refer to: https://github.com/volcano-sh/volcano/pull/3459 to make community contributions.

#### Enhance scheduler metrics

Volcano uses the client-go to talk with Kubernetes. Although the client can set the QPS to avoid requests from being flow-limited, it is difficult to observe how many QPS is actually used by the client, so in order to observe the frequency of requests from the client in real time, Volcano has added a new client-go metrics, which allows users to access the metrics to see the number of GET, POST and other requests per second, so as to get the actual QPS used per second, and thus decide whether or not the client needs to adjust the QPS. The client-go metrics also include client certificate rotation cycle statistics, response size per request statistics, etc.

Users can use curl http://$volcano_scheduler_pod_ip:8080/metrics to get all the detailed metrics of volcano scheduler.

Related PR: [#3274](https://github.com/volcano-sh/volcano/pull/3274).([@Monokaix](https://github.com/Monokaix))

#### Add license compliance check

In order to enhance the open source license compliance governance standards of the Volcano community, avoid the introduction of infectious open source protocols, and avoid potential risks, the Volcano community has introduced an open source license compliance checking tool. The so-called infectious protocol refers to software that uses this protocol as an open source license. Derivative works generated after modification, use, and copying must also be open sourced under this agreement. If the third-party library introduced by the PR submitted by the developer contains infectious open source protocols such as GPL, LGPL, etc., CI Access Control will intercept it. The developer needs to replace the third-party library with a loose free software license protocol such as MIT, Apache 2.0, BSD, etc. , to pass the open source license compliance check.

#### Improve scheduling stability

Volcano v1.9.0 has done more optimization in preemption, retry for scheduling failure, avoiding memory leaks, security enhancement, etc. The details include:

- Fix the problem of pods not being able to be scheduled due to frequent expansion and contraction of deployment in extreme cases, see PR for details: [#3376](https://github.com/volcano-sh/volcano/pull/3376).([@guoqinwill](https://github.com/guoqinwill))

- Fix Pod preemption: see PR for details: [#3458](https://github.com/volcano-sh/volcano/pull/3458).([LivingCcj](https://github.com/LivingCcj))

- Optimize Pod scheduling failure retry mechanism: see PR for details: [#3435](https://github.com/volcano-sh/volcano/pull/3435).([@bibibox](https://github.com/bibibox))

- Metrics optimization: [#3463](https://github.com/volcano-sh/volcano/pull/3463).([@Monokaix](https://github.com/Monokaix))

- Security enhancements: [#3449](https://github.com/volcano-sh/volcano/pull/3449).([@lekaf974](https://github.com/lekaf974))

### Contributors

Volcano 1.9.0 is brought into being from hundreds of code commits from many contributors. Thanks for your contributions.

**Contributors on GitHub:**<br>
<table>
  <tr>
    <td>@daniel-hutao</td>
    <td>@wuyueandrew</td>
    <td>@googs1025</td>
  </tr>
  <tr>
    <td>@7sunarni</td>
    <td>@flyingfang</td>
    <td>@LivingCcj</td>
  </tr>
  <tr>
    <td>@guoqinwill</td>
    <td>@panoswoo</td>
    <td>@william-wang</td>
  </tr>
  <tr>
    <td>@lekaf974</td>
    <td>@yangqz</td>
    <td>@lowang-bh</td>
  </tr>
  <tr>
    <td>@loheagn</td>
    <td>@hwdef</td>
    <td>@archlitchi</td>
  </tr>
  <tr>
    <td>@Lily922</td>
    <td>@bibibox</td>
    <td>@Monokaix</td>
  </tr>
  <tr>
    <td>@belo4ya</td>
  </tr>  
</table>     

**Reference**

Release note: v1.9.0

https://github.com/volcano-sh/volcano/releases/tag/v1.9.0

Branch：release-1.9

https://github.com/volcano-sh/volcano/tree/release-1.9

### About Volcano

Volcano is designed for high-performance computing applications such as AI, big data, gene sequencing, and rendering, and supports mainstream general computing frameworks. More than 58,000 global developers joined us, among whom the in-house ones come from companies such as Huawei, AWS, Baidu, Tencent, JD, and Xiaohongshu. There are 3.8k+ Stars and 800+ Forks for the project. Volcano has been proven feasible for mass data computing and analytics, such as AI, big data, and gene sequencing. Supported frameworks include Spark, Flink, TensorFlow, PyTorch, Argo, MindSpore, Paddlepaddle, Kubeflow, MPI, Horovod, MXNet, KubeGene, and Ray. The ecosystem is thriving with more developers and use cases coming up.