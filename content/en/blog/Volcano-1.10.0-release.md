+++
title =  "Volcano v1.10.0 Available Now"
description = "New features: Support Queue Priority Scheduling Strategy, Enable Fine-Grained GPU Resource Sharing and Reclaim, Introduce Pod Scheduling Readiness Support, Add Sidecar Container Scheduling Capabilities, Enhance Vcctl Command Line Tool, Ensure Compatibility with Kubernetes v1.30, Strengthen Volcano Security Measures, Optimize Volcano for Large-Scale Performance, Improve GPU Monitoring Function, Optimize Helm Chart Installation And Upgrade Processes, etc." 
subtitle = ""

date = 2024-09-29
lastmod = 2024-09-29
datemonth = "Sep"
dateyear = "2024"
dateday = 29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["volcano"]

tags = ["Practice"]
summary = "New features: Support Queue Priority Scheduling Strategy, Enable Fine-Grained GPU Resource Sharing and Reclaim, Introduce Pod Scheduling Readiness Support, Add Sidecar Container Scheduling Capabilities, Enhance Vcctl Command Line Tool, Ensure Compatibility with Kubernetes v1.30, Strengthen Volcano Security Measures, Optimize Volcano for Large-Scale Performance, Improve GPU Monitoring Function, Optimize Helm Chart Installation And Upgrade Processes, etc."

# Add menu entry to sidebar.
linktitle = "Volcano v1.10.0 Available Now"
[menu.posts]
parent = "tutorials"
weight = 6
+++


On Sep 19, 2024, UTC+8, Volcano version v1.10.0 was officially released. This version introduced the following new features:

- **Support Queue Priority Scheduling Strategy**

- **Enable Fine-Grained GPU Resource Sharing and Reclaim**

- **Introduce Pod Scheduling Readiness Support**

- **Add Sidecar Container Scheduling Capabilities**

- **Enhance Vcctl Command Line Tool**

- **Ensure Compatibility with Kubernetes v1.30**

- **Strengthen Volcano Security Measures**

- **Optimize Volcano for Large-Scale Performance**

- **Improve GPU Monitoring Function**

- **Optimize Helm Chart Installation And Upgrade Processes**

{{<figure library="1" src="volcano_logo.png" width="50%">}}
Volcano is the industry-first cloud native batch computing project. Open-sourced at KubeCon Shanghai in June 2019, it became an official CNCF project in April 2020. In April 2022, Volcano was promoted to a CNCF incubating project. By now, more than 600 global developers have committed code to the project. The community is seeing growing popularity among developers, partners, and users.

## Key Features

### Support Queue Priority Scheduling Strategy

In traditional big data processing scenarios, users can directly set queue priorities to control the scheduling order of jobs. To ease the migration from Hadoop/Yarn to cloud-native platforms, Volcano supports setting priorities at the queue level, reducing migration costs for big data users while enhancing user experience and resource utilization efficiency.

Queues are a fundamental resource in Volcano, each with its own priority. By default, a queue's priority is determined by its `share` value, which is calculated by dividing the resources allocated to the queue by its total capacity. This is done automatically, with no manual configuration needed. The smaller the `share` value, the fewer resources the queue has, making it less saturated and more likely to receive resources first. Thus, queues with smaller `share` values have higher priority, ensuring fairness in resource allocation.

In production environments—especially in big data scenarios—users often prefer to manually set queue priorities to have a clearer understanding of the order in which queues are scheduled. Since the `share` value is dynamic and changes in real-time as resources are allocated, Volcano introduces a `priority` field to allow users to set queue priorities more intuitively. The higher the `priority`, the higher the queue's standing. High-priority queues receive resources first, while low-priority queues have their jobs reclaimed earlier when resources need to be recycled.

Queue Priority Definition:

```go
type QueueSpec struct {
...
  // Priority define the priority of queue. Higher values are prioritized for scheduling and considered     later during reclamation.
  // +optional
  Priority int32 `json:"priority,omitempty" protobuf:"bytes,10,opt,name=priority"`
}
```

To ensure compatibility with the `share` mechanism, Volcano also considers the share value when calculating queue priorities. By default, if a user has not set a specific queue priority or if priorities are equal, Volcano will fall back to comparing share values. In this case, the queue with the smaller share has higher priority. Users have the flexibility to choose between different priority strategies based on their specific needs—either by using the priority or the share method.

For queue priority design doc, please refer to: [Queue priority](https://github.com/volcano-sh/volcano/blob/master/docs/design/queue-priority.md)

### Enable Fine-Grained GPU Resource Sharing and Reclaim

Volcano introduced the elastic queue capacity scheduling feature in version v1.9, allowing users to directly set the capacity for each resource dimension within a queue. This feature also supports elastic scheduling based on the `deserved` value, enabling more fine-grained resource sharing and recycling across queues.

For detailed design information on elastic queue capacity scheduling, refer to the [Capacity Scheduling Design Document](https://github.com/volcano-sh/volcano/blob/master/docs/design/capacity-scheduling.md).

For a step-by-step guide on using the capacity plugin, see the [Capacity Plugin User Guide](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_capacity_plugin.md).

Configure each dimension deserved resource samples for the queue:

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

In version v1.10, Volcano extends its support to include reporting different types of GPU resources within elastic queue capacities. NVIDIA's default `Device Plugin` does not distinguish between GPU models, instead reporting all resources uniformly as `nvidia.com/gpu`. This limits AI training and inference tasks from selecting specific GPU models, such as A100 or T4, based on their particular needs. To address this, Volcano now supports reporting distinct GPU models at the `Device Plugin` level, working with the `capacity` plugin to enable more precise GPU resource sharing and recycling.

For instructions on using the `Device Plugin` to report various GPU models, please refer to the [GPU Resource Naming Guide](https://github.com/volcano-sh/devices/tree/release-1.1/docs/resource-naming).

**Note:**

In version v1.10.0, the `capacity` plugin is the default for queue management. Note that the `capacity` and `proportion` plugins are incompatible, so after upgrading to v1.10.0, you must set the `deserved` field for queues to ensure proper functionality.

For detailed instructions, please refer to the [Capacity Plugin User Guide](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_capacity_plugin.md).

The `capacity` plugin allocates cluster resources based on the `deserved` value set by the user, while the `proportion` plugin dynamically allocates resources according to queue weight. Users can select either the `capacity` or `proportion` plugin for queue management based on their specific needs.

For more details on the proportion plugin, please visit: [Proportion Plugin](https://volcano.sh/en/docs/plugins/#proportion).

### Introduce Pod Scheduling Readiness Support

Once a Pod is created, it is considered ready for scheduling. In Kube-scheduler, it will try its best to find a suitable node to place all pending Pods. However, in reality, some Pods may be in a "lack of necessary resources" state for a long time. These Pods actually interfere with the decision-making and operation of the scheduler (and downstream components such as Cluster AutoScaler) in an unnecessary way, causing problems such as resource waste. Pod Scheduling Readiness is a new feature of Kube-sheduler. In Kubernetes v.1.30 GA, it has become a stable feature. It controls the scheduling timing of Pods by setting the schedulingGates field of the Pod.

<div style="text-align: center;"> {{<figure library="1" src="./v1.10.0/podSchedulingGates.svg">}}
Pod SchedulingGates
</div>

In previous versions, Volcano has integrated all algorithms of the K8s default scheduler, fully covering the native scheduling functions of Kube-scheduler. Therefore, Volcano can completely replace Kube-scheduler as a unified scheduler under the cloud native platform, supporting unified scheduling of microservices and AI/big data workloads. In the latest version v1.10, Volcano has introduced Pod Scheduling Readiness scheduling capability to further meet users' scheduling needs in diverse scenarios.

For the documentation of Pod Scheduling Readiness features, please refer to: [Pod Scheduling Readiness | Kubernetes](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-scheduling-readiness/)

For the Pod Scheduling Readiness design doc of volcano, please refer to: [Proposal for Support of Pod Scheduling Readiness by ykcai-daniel · Pull Request #3581 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3581)

### Add Sidecar Container Scheduling Capabilities

A Sidecar container is an auxiliary container designed to support the main business container by handling tasks such as logging, monitoring, and network initialization.

Prior to Kubernetes v1.28, the concept of Sidecar containers existed only informally, with no dedicated API to distinguish them from business containers. Both types of containers were treated equally, which meant that Sidecar containers could be started after the business container and might end before it. Ideally, Sidecar containers should start before and finish after the business container to ensure complete collection of logs and monitoring data.

Kubernetes v1.28 introduces formal support for Sidecar containers at the API level, implementing unified lifecycle management for init containers, Sidecar containers, and business containers. This update also adjusts how resource requests and limits are calculated for Pods, and the feature will enter Beta status in v1.29.

The development of this feature involved extensive discussions, mainly focusing on maintaining compatibility with existing APIs and minimizing disruptive changes. Rather than introducing a new container type, Kubernetes reuses the init container type and designates Sidecar containers by setting the init container’s restartPolicy to Always. This approach addresses both API compatibility and lifecycle management issues effectively.

With this update, the scheduling of Pods now considers the Sidecar container’s resource requests as part of the business container’s total requests. Consequently, the Volcano scheduler has been updated to support this new calculation method, allowing users to schedule Sidecar containers with Volcano.

For more information on Sidecar containers, visit [Sidecar Containers | Kubernetes](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/).

### Enhance Vcctl Command Line Tool

vcctl is a command line tool for operating Volcano's built-in CRD resources. It can be conveniently used to view/delete/pause/resume vcjob resources, and supports viewing/deleting/opening/closing/updating queue resources. Volcano has enhanced vcctl in the new version, adding the following features:

- Support creating/deleting/viewing/describing `jobflow` and `jobtemplate` resources

- Support querying vcjob in a specified queue

- Support querying Pods by queue and vcjob filtering

For detailed guidance documents on vcctl, please refer to: [vcctl Command Line Enhancement](https://github.com/volcano-sh/volcano/blob/master/docs/design/command-line-enhancement.md#new-format-of-volcano-command-line).

### Ensure Compatibility with Kubernetes v1.30

Volcano closely follows the pace of Kubernetes community versions and supports every major version of Kubernetes. The latest supported version is v1.30, and runs complete UT and E2E use cases to ensure functionality and reliability.

If you want to participate in the development of Volcano adapting to the new version of Kubernetes, please refer to: [adapt-k8s-todo](https://github.com/volcano-sh/volcano/blob/master/docs/design/adapt-k8s-todo.md) for community contributions.

### Strengthen Volcano Security Measures

Volcano has always attached great importance to the security of the open source software supply chain. It follows the specifications defined by OpenSSF in terms of license compliance, security vulnerability disclosure and repair, warehouse branch protection, CI inspection, etc. Volcano recently added a new workflow to Github Action, which will run OpenSSF security checks when the code is merged, and update the software security score in real time to continuously improve software security.

At the same time, Volcano has reduced the RBAC permissions of each component, retaining only the necessary permissions, avoiding potential risks of unauthorized access and improving the security of the system.

Related PRs:

[Added the scorecard github action and its badge by harshitasao · Pull Request #3655 · volcano-sh/volcano](https://github.com/volcano-sh/volcano/pull/3655)

[Shrink permissions of vc scheduler & controller by Monokaix · Pull Request #3545 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3545)

[Add pre-install&pre-upgrade hook for admission-init job by Monokaix · Pull Request #3504 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3504)

### Optimize Volcano for Large-Scale Performance

In large-scale scenarios, Volcano has done a lot of performance optimization work, mainly including:

- Optimize vcjob update strategy, reduce vcjob update and synchronization frequency, reduce API Server pressure, and improve QPS of submitted tasks
- Add controller gate switch to vc controller, users can choose to close unnecessary controllers, reduce memory usage and CPU load
- All controllers use shared informer to reduce memory usage

### Improve GPU Monitoring Function

The new version of Volcano optimizes and enhances GPU monitoring indicators, fixes the problem of inaccurate GPU monitoring, and adds node information to the GPU computing power and video memory monitoring indicators, allowing users to more intuitively view the computing power of each GPU on each node, the total amount and allocated amount of video memory.

Related PR: [Update volcano-vgpu monitoring system by archlitchi · Pull Request #3620 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3620/)

### Optimize Helm Chart Installation And Upgrade Processes

Volcano has optimized the installation and upgrade process of helm chart, and supports installing helm chart packages to set more custom parameters, mainly including:

- By using the helm hook mechanism, after successfully installing Volcano, the volcano-admission-init job is automatically deleted to avoid the subsequent upgrade failure using helm upgrade, related PR: [Add pre-install&pre-upgrade hook for admission-init job by Monokaix · Pull Request #3504 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3504)

- Update the secret file required by Volcano admission after each successful installation to avoid the problem of repeated installation and uninstallation of Volcano without specifying the helm package name, which will cause the Volcano admission process to fail, related PR: [Update volcano-admission secret when it already exists by Monokaix · Pull Request #3653 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3653)

- Support setting common labels for resource objects in helm packages, related PR: [Add common labels for chart objects by Aakcht · Pull Request #3511 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3511)

- Support setting log level for Volcano components through helm, related PR: [Expose volcano components (controller, scheduler, etc.) log level control to the helm chat values by chenshiwei-io · Pull Request #3656 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3656)

- Support specifying the image registry of Volcano components through helm, related PR: [add image registry for helm by calvin0327 · Pull Request #3436 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3436)

- Support setting container-level securityContext through helm, related PR: [feat: Add securityContext support at container level in helm chart templates by lekaf974 · Pull Request #3704 · volcano-sh/volcano (github.com)](https://github.com/volcano-sh/volcano/pull/3704)

### Contributors

Volcano 1.10.0 version includes hundreds of contributions from 36 community contributors. Thanks for your contributions.

**Contributors on GitHub:**

| **@googs1025**      | **@WulixuanS**    | **@SataQiu**       |
| ------------------- | ----------------- | ------------------ |
| **@guoqinwill**     | **@lowang-bh**    | **@shruti2522**    |
| **@lukasboettcher** | **@wangyysde**    | **@bibibox**       |
| **@Wang-Kai**       | **@y-ykcir**      | **@lekaf974**      |
| **@yeahdongcn**     | **@Monokaix**     | **@Aakcht**        |
| **@yxxhero**        | **@babugeet**     | **@liuyuanchun11** |
| **@MichaelXcc**     | **@william-wang** | **@lengrongfu**    |
| **@xieyanker**      | **@lx1036**       | **@archlitchi**    |
| **@hwdef**          | **@wangyang0616** | **@microyahoo**    |
| **@snappyyouth**    | **@harshitasao**  | **@chenshiwei-io** |
| **@TaiPark**        | **@Aakcht**       | **@ykcai-daniel**  |
| **@lekaf974**       | **@JesseStutler** | **@belo4ya**       |

## Reference

Release note: v1.10.0

https://github.com/volcano-sh/volcano/releases/tag/v1.10.0

Branch：release-1.10

https://github.com/volcano-sh/volcano/tree/release-1.10

## About Volcano

Volcano is designed for high-performance computing applications such as AI, big data, gene sequencing, and rendering, and supports mainstream general computing frameworks. More than 58,000 global developers joined us, among whom the in-house ones come from companies such as Huawei, AWS, Baidu, Tencent, JD, and Xiaohongshu. There are 4.1k+ Stars and 900+ Forks for the project. Volcano has been proven feasible for mass data computing and analytics, such as AI, big data, and gene sequencing. Supported frameworks include Spark, Flink, TensorFlow, PyTorch, Argo, MindSpore, Paddlepaddle, Kubeflow, MPI, Horovod, MXNet, KubeGene, and Ray. The ecosystem is thriving with more developers and use cases coming up.