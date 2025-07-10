+++
title =  "Volcano v1.12.0 Available Now"
description = "New features: Network Topology-Aware Scheduling (Alpha), Dynamic MIG Partitioning for GPU Virtualization, DRA Support, Queue Capacity Management in Volcano Global, Security Enhancements, Performance Optimizations, Gang Scheduling for Generic Workloads, Job Flow Improvements, and Kubernetes v1.32 Support."
subtitle = ""

date = 2025-06-12
lastmod = 2025-06-12
datemonth = "June"
dateyear = "2025"
dateday = 12

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["volcano"]

tags = ["Practice"]
summary = "New features: Network Topology-Aware Scheduling (Alpha), Dynamic MIG Partitioning for GPU Virtualization, DRA Support, Queue Capacity Management in Volcano Global, Security Enhancements, Performance Optimizations, Gang Scheduling for Generic Workloads, Job Flow Improvements, and Kubernetes v1.32 Support."

# Add menu entry to sidebar.
linktitle = "Volcano v1.12.0 Available Now"
[menu.posts]
parent = "tutorials"
weight = 6
+++

## Volcano v1.12 released: Advancing Cloud-Native AI and Batch Computing

As AI large model technology rapidly evolves, enterprises are placing higher demands on computing resource efficiency and application performance. For complex application scenarios such as AI, big data, and high-performance computing (HPC), efficiently utilizing accelerators like GPUs, ensuring high system availability, and managing resources with fine granularity are the core areas of focus for the Volcano community's continuous innovation.

Each version of Volcano is an active response to these challenges. With contributions from **over 1,000 developers from more than 30 countries, resulting in nearly 40,000 contributions**, Volcano has been adopted in production environments by more than 60 enterprises worldwide. Its scheduling performance and resource management capabilities have been widely proven in practice.

Today, the **Volcano community officially releases v1.12.** This new version focuses on the core requirements of modern AI and big data scenarios, and introduces a series of key features and usability improvements:

### **Highlights of v1.12**

*   **Network Topology-Aware Scheduling (Alpha):** Optimizes the deployment of large-scale AI training and inference tasks by using network topology awareness to reduce cross-switch communication and improve runtime efficiency.
*   **Enhanced GPU Virtualization:** Adds support for NVIDIA GPU dynamic MIG partitioning besides the existing vCUDA solution. This provides users with both software and hardware virtualization options for more flexible and efficient GPU resource sharing.
*   **DRA Support:** Enhances the flexibility and capabilities of heterogeneous resource management.
*   **Queue Capacity Management in Volcano Global:** Supports unified limits and management of resource quotas (capabilities) for tenant queues in a multi-cluster environment.
*   **Comprehensive Security Enhancements:** Implements multi-dimensional security hardening, from API access control to container runtime permissions, to improve system robustness.
*   **Performance Optimization for Large-Scale Scenarios:** Improves concurrent task processing efficiency by reducing unnecessary webhook calls.
*   **Enhanced Gang Scheduling for Generic Workloads:** Adds support for custom minimum member counts (`minAvailable`) for Gang scheduling of generic workloads like Deployments and StatefulSets via annotations, providing more fine-grained Gang Scheduling strategies.
*   **Job Flow Enhancements:** Improves the robustness and observability of the built-in workflow orchestration engine.
*   And many other stability and usability improvements.

We believe these updates in v1.12 will further enhance intelligent task scheduling, resource utilization, and overall system performance, helping users to better meet the challenges of the AI and big data era.

## Core Feature Details

### Network Topology-Aware Scheduling (Alpha Release)

Previously a preview feature in v1.11, Volcano's Network Topology-Aware Scheduling is now an Alpha release in v1.12. This feature is designed to optimize the deployment of AI tasks in large-scale training and inference scenarios (e.g., model-parallel training, leader-worker inference). By scheduling tasks within the same network topology performance domain, it reduces cross-switch communication, thereby significantly improving task efficiency. Volcano uses the HyperNode CRD to abstract and represent heterogeneous hardware network topologies and supports a hierarchical structure for easier management.

Version 1.12 integrates the following key features:

*   **HyperNode Auto-Discovery:** Volcano can now automatically discover the cluster's network topology. Users can configure the discovery type, and the system will automatically create and maintain hierarchical HyperNodes that reflect the cluster's actual network topology. It currently supports obtaining topology information from InfiniBand (IB) networks via the UFM (Unified Fabric Manager) interface to automatically update HyperNodes. Support for more network protocols like RoCE is planned for the future.
*   **Prioritized HyperNode Selection:** This version introduces a scoring strategy based on a combination of node-level and HyperNode-level scores to determine the final priority of a HyperNode.
    *   **Node-level:** It is recommended to configure the BinPack plugin to pack nodes within a HyperNode first, reducing resource fragmentation.
    *   **HyperNode-level:** Lower-level HyperNodes are prioritized for better performance, as they involve fewer cross-switch traversals. For HyperNodes at the same level, those containing more tasks receive a higher score to reduce HyperNode-level resource fragmentation.
*   **Node Matching with Label Selectors:** HyperNode leaf nodes are associated with physical nodes in the cluster and support the following three matching strategies:
    *   **Exact Match:** Directly matches node names.
    *   **Regex Match:** Matches node names using regular expressions.
    *   **Label Match:** Matches nodes using standard Label Selectors.

Related documentation:

*   [Network Topology-Aware Scheduling Introduction and Usage](https://volcano.sh/en/docs/network_topology_aware_scheduling/)
*   [Network Topology-Aware Scheduling Design Document](https://github.com/volcano-sh/volcano/blob/master/docs/design/Network%20Topology%20Aware%20Scheduling.md)
*   [HyperNode Auto-Discovery Design Document](https://github.com/volcano-sh/volcano/blob/master/docs/design/hyperNode-auto-discovery.md)
*   [HyperNode Auto-Discovery Usage Guide](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_hypernode_auto_discovery.md)

Related PRs:

*   [https://github.com/volcano-sh/volcano/pull/3874](https://github.com/volcano-sh/volcano/pull/3874)
*   [https://github.com/volcano-sh/volcano/pull/3894](https://github.com/volcano-sh/volcano/pull/3894)
*   [https://github.com/volcano-sh/volcano/pull/3969](https://github.com/volcano-sh/volcano/pull/3969)
*   [https://github.com/volcano-sh/volcano/pull/3971](https://github.com/volcano-sh/volcano/pull/3971)
*   [https://github.com/volcano-sh/volcano/pull/4068](https://github.com/volcano-sh/volcano/pull/4068)
*   [https://github.com/volcano-sh/volcano/pull/4213](https://github.com/volcano-sh/volcano/pull/4213)
*   [https://github.com/volcano-sh/volcano/pull/3897](https://github.com/volcano-sh/volcano/pull/3897)
*   [https://github.com/volcano-sh/volcano/pull/3887](https://github.com/volcano-sh/volcano/pull/3887)

Thanks to the following community developers for their contributions to this feature: **@ecosysbin, @weapons97, @Xu-Wentao, @penggu, @JesseStutler, @Monokaix**.

### Dynamic MIG Partitioning for GPU Virtualization

Volcano's GPU virtualization feature allows users to request partial GPU resources based on memory and compute power. It works with a Device Plugin to achieve hardware isolation and improve GPU utilization. While traditional GPU virtualization limits GPU usage by intercepting CUDA APIs, the MIG (Multi-Instance GPU) technology in the NVIDIA Ampere architecture allows a single physical GPU to be partitioned into multiple independent instances. However, typical MIG solutions often use pre-configured, fixed-size instances, which can lead to resource waste and inflexibility.

**Volcano v1.12 introduces dynamic MIG partitioning and scheduling capabilities.** It can select the appropriate MIG instance size in real-time based on the user's requested GPU amount and uses a Best-Fit algorithm to reduce resource waste. It also supports GPU scoring strategies like BinPack and Spread to minimize resource fragmentation and improve GPU utilization. Users can request resources using the unified APIs `volcano.sh/vgpu-number`, `volcano.sh/vgpu-cores`, and `volcano.sh/vgpu-memory`, without needing to be aware of the underlying implementation details.

*   Design Document: [Dynamic MIG Design Document](https://github.com/volcano-sh/volcano/blob/master/docs/design/dynamic-mig.md)
*   Usage Guide: [Dynamic MIG Usage Guide](https://volcano.sh/en/docs/gpu_virtualization/)

Related PRs:

*   [https://github.com/volcano-sh/volcano/pull/4290](https://github.com/volcano-sh/volcano/pull/4290)
*   [https://github.com/volcano-sh/volcano/pull/3953](https://github.com/volcano-sh/volcano/pull/3953)

Thanks to the following community developers for their contributions to this feature: **@sailorvii, @archlitchi**.

### Support for Dynamic Resource Allocation (DRA)

Kubernetes DRA (Dynamic Resource Allocation) is a native feature that provides a more flexible and powerful way to manage heterogeneous hardware resources in a cluster, such as GPUs, FPGAs, and high-performance network cards. It addresses the limitations of the traditional Device Plugin model in some advanced scenarios. Volcano v1.12 adds support for DRA, allowing the cluster to dynamically allocate and manage external resources, which enhances Volcano's integration with the Kubernetes ecosystem and improves the flexibility of resource management.

*   Usage Guide: [Enabling DRA in Volcano](https://volcano.sh/en/docs/user-guide/dra/)

Related PR:

*   [https://github.com/volcano-sh/volcano/pull/3799](https://github.com/volcano-sh/volcano/pull/3799)

Thanks to community developer **@JesseStutler** for their contribution to this feature.

### Queue Capacity Management in Volcano Global

Queues are a core concept in Volcano. To support quota management in multi-cluster and multi-tenant environments, Volcano v1.12 extends its global queue capacity management capabilities. Users can now uniformly limit tenant resource usage in a multi-cluster environment. The configuration is consistent with the single-cluster scenario: the `capability` field in the queue configuration is used to limit tenant quotas.

Related PR:

*   [https://github.com/volcano-sh/volcano-global/pull/16](https://github.com/volcano-sh/volcano-global/pull/16)

Thanks to community developer **@tanberBro** for their contribution to this feature.

### Security Enhancements

The Volcano community is committed to security. In v1.12, in addition to fine-grained control over sensitive permissions like ClusterRoles, the following security risks have been addressed and hardened:

*   **Set Timeouts for HTTP Servers:** The Metric and Healthz endpoints of all Volcano components now have server-side `ReadHeader`, `Read`, and `Write` timeouts to prevent prolonged resource occupation. (PR: [https://github.com/volcano-sh/volcano/pull/4208](https://github.com/volcano-sh/volcano/pull/4208))
*   **Add Warning for Skipping SSL Certificate Verification:** When a client request sets `insecureSkipVerify` to `true`, a warning is logged to recommend enabling SSL certificate verification in production environments. (PR: [https://github.com/volcano-sh/volcano/pull/4211](https://github.com/volcano-sh/volcano/pull/4211))
*   **Disable Volcano Scheduler's pprof Endpoint by Default:** To prevent the leakage of sensitive program information, the profiling data port used for troubleshooting is now disabled by default. (PR: [https://github.com/volcano-sh/volcano/pull/4173](https://github.com/volcano-sh/volcano/pull/4173))
*   **Remove Unnecessary File Permissions:** Unnecessary execute permissions have been removed from Go source files to follow the principle of least privilege. (PR: [https://github.com/volcano-sh/volcano/pull/4171](https://github.com/volcano-sh/volcano/pull/4171))
*   **Set Security Context for Containers and Run as Non-Root:** All Volcano components now run with non-root privileges. Security contexts have been added with `seccompProfile` and `SELinuxOptions`, and `allowPrivilegeEscalation` is set to `false` to prevent container privilege escalation. Only necessary Linux capabilities are retained, comprehensively restricting container permissions. (PR: [https://github.com/volcano-sh/volcano/pull/4207](https://github.com/volcano-sh/volcano/pull/4207))
*   **Limit HTTP Response Body Size:** For HTTP requests sent by the Extender Plugin and ElasticSearch Service, the response body size is limited to prevent issues like OOM caused by excessive resource consumption. (Advisory: [https://github.com/volcano-sh/volcano/security/advisories/GHSA-hg79-fw4p-25p8](https://github.com/volcano-sh/volcano/security/advisories/GHSA-hg79-fw4p-25p8))

### Performance Improvements for Large-Scale Scenarios

Volcano's performance is continuously being optimized. The new version removes and disables some non-essential webhooks by default without affecting functionality, improving performance in large-scale batch creation scenarios:

*   **PodGroup Mutating Webhook Disabled by Default:** Previously, when a PodGroup was created without a specified queue, the queue could be populated from the Namespace. Since this scenario is uncommon, this webhook is now disabled by default. Users can enable it if needed.
*   **Queue Status Check Moved from Pod to PodGroup:** Task submission is not allowed when a queue is in a closed state. The original validation logic was performed at the Pod creation stage. Since Volcano's basic scheduling unit is the PodGroup, moving the validation to the PodGroup creation stage is more efficient. As the number of PodGroups is less than the number of Pods, this change reduces webhook calls and improves performance.

Related PRs:

*   [https://github.com/volcano-sh/volcano/pull/4128](https://github.com/volcano-sh/volcano/pull/4128)
*   [https://github.com/volcano-sh/volcano/pull/4132](https://github.com/volcano-sh/volcano/pull/4132)

Thanks to community developer **@Monokaix** for their contribution to this feature.

### Gang Scheduling for Various Workload Types

Gang scheduling is a core capability of Volcano. For Volcano Job and PodGroup objects, users can directly set `minMember` to define the required minimum number of replicas. In the new version, users can specify this minimum by setting the annotation `scheduling.volcano.sh/group-min-member` on other types of workloads such as Deployments, StatefulSets, and Jobs. This means that when using Volcano for scheduling, either the specified number of replicas are all scheduled successfully, or none are scheduled at all, enabling Gang scheduling for a wider variety of workload types.

For example, to set `minMember=10` for a Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: volcano-group-deployment
  annotations:
    # Set min member=10
    scheduling.volcano.sh/group-min-member: "10"
```

Related PR:

*   [https://github.com/volcano-sh/volcano/pull/4000](https://github.com/volcano-sh/volcano/pull/4000)

Thanks to community developer **@sceneryback** for their contribution to this feature.

### Job Flow Enhancements

Job Flow is a lightweight workflow orchestration framework for Volcano Jobs. In v1.12, Job Flow has been enhanced with the following improvements:

*   New Monitoring Metrics: Added metrics for the number of successful and failed Job Flows.
*   DAG Validity Check: Introduced a function to validate the structure of a Job Flow's Directed Acyclic Graph (DAG).
*   State Synchronization Fix: Resolved an issue that caused inaccurate Job Flow state synchronization.

Related PRs:

*   [https://github.com/volcano-sh/volcano/pull/4169](https://github.com/volcano-sh/volcano/pull/4169)
*   [https://github.com/volcano-sh/volcano/pull/4090](https://github.com/volcano-sh/volcano/pull/4090)
*   [https://github.com/volcano-sh/volcano/pull/4135](https://github.com/volcano-sh/volcano/pull/4135)
*   [https://github.com/volcano-sh/volcano/pull/4169](https://github.com/volcano-sh/volcano/pull/4169)

Thanks to community developer **@dongjiang1989** for their contribution to this feature.

### Finer-Grained Permission Control in Multi-Tenant Scenarios

Volcano natively supports multi-tenant environments and emphasizes permission control in such scenarios. In the new version, Volcano has enhanced permission control for Volcano Jobs by adding read-only and read-write ClusterRoles. Users can assign different permissions to tenants as needed to achieve better isolation.

Related PR:

*   [https://github.com/volcano-sh/volcano/pull/4174](https://github.com/volcano-sh/volcano/pull/4174)

Thanks to community developer **@Hcryw** for their contribution to this feature.

### Kubernetes 1.32 Support

Volcano stays current with Kubernetes releases. Version 1.12 supports the latest Kubernetes v1.32 and ensures functionality and reliability through comprehensive unit and end-to-end (E2E) tests.

To participate in Volcano's adaptation work for new Kubernetes versions, please refer to: [adapt-k8s-todo](https://github.com/volcano-sh/volcano/pull/4318).

Related PR:

*   [https://github.com/volcano-sh/volcano/pull/4099](https://github.com/volcano-sh/volcano/pull/4099)

Thanks to community developers **@guoqinwill** and **@danish9039** for their contributions to this feature.

### Enhanced Queue Monitoring Metrics

Volcano queues now include several new key resource metrics. The system now supports monitoring and visualization of `request`, `allocated`, `deserved`, `capacity`, and `real_capacity` for CPU, memory, and extended resources, providing a detailed view of the status of key queue resources.

Related PR:

*   [https://github.com/volcano-sh/volcano/pull/3937](https://github.com/volcano-sh/volcano/pull/3937)

Thanks to community developer **@zedongh** for their contribution to this feature.

### Fuzz Testing Support

Fuzz testing is an automated software testing technique. In this release, Volcano introduces a fuzz testing framework to test key function units. It uses Google's open-source OSS-Fuzz framework for continuous testing, which helps to discover potential vulnerabilities and defects early, enhancing the security and robustness of Volcano.

Related PR:

*   [https://github.com/volcano-sh/volcano/pull/4205](https://github.com/volcano-sh/volcano/pull/4205)

Thanks to community developer **@AdamKorcz** for their contribution to this feature.

### Stability Enhancements

This release includes several stability fixes, addressing issues such as panics caused by improper queue capacity settings, hierarchical queue validation failures, unnecessary PodGroup refreshes, and StatefulSets with zero replicas consuming queue resources. These improvements further enhance the stability of the system in complex scenarios.

Related PRs:

*   [https://github.com/volcano-sh/volcano/pull/4273](https://github.com/volcano-sh/volcano/pull/4273)
*   [https://github.com/volcano-sh/volcano/pull/4272](https://github.com/volcano-sh/volcano/pull/4272)
*   [https://github.com/volcano-sh/volcano/pull/4179](https://github.com/volcano-sh/volcano/pull/4179)
*   [https://github.com/volcano-sh/volcano/pull/4141](https://github.com/volcano-sh/volcano/pull/4141)
*   [https://github.com/volcano-sh/volcano/pull/4033](https://github.com/volcano-sh/volcano/pull/4033)
*   [https://github.com/volcano-sh/volcano/pull/4012](https://github.com/volcano-sh/volcano/pull/4012)
*   [https://github.com/volcano-sh/volcano/pull/3603](https://github.com/volcano-sh/volcano/pull/3603)

Thanks to the following community developers for their contributions: **@halcyon-r, @guoqinwill, @JackyTYang, @JesseStutler, @zhutong196, @Wang-Kai, @HalfBuddhist**.

#### Pre-Upgrade Notes

Before upgrading to Volcano v1.12, please note the following changes:

*   **PodGroup Mutating Webhook Disabled by Default:** In v1.12, the PodGroup's Mutating Webhook is disabled by default. If you have workflows that rely on the webhook to automatically populate a PodGroup's queue from its Namespace, you must manually enable this webhook after upgrading.
*   **Queue Status Check Migration and Behavioral Change:** The queue status validation logic for task submission has been moved from the Pod creation stage to the PodGroup creation stage. Now, when a queue is closed, the system will prevent task submission at the PodGroup creation time. However, individual Pods (not submitted via a PodGroup) can still be submitted to a closed queue, but they will not be scheduled by the Volcano Scheduler.
*   **Volcano Scheduler pprof Endpoint Disabled by Default:** For security reasons, the Volcano Scheduler's pprof endpoint is disabled by default in this version. If needed, it can be explicitly enabled via the Helm parameter `custom.scheduler_pprof_enable=true` or the command-line argument `--enable-pprof=true`.

## Summary and Future Work

The release of Volcano v1.12 is the result of the joint efforts of community contributors and users. This version brings enhancements to AI task scheduling, GPU resource utilization, heterogeneous resource management, security, and performance and stability in large-scale scenarios.

Version 1.12 aims to improve the performance and efficiency of running AI, big data, and other batch computing tasks in cloud-native environments. We recommend that users upgrade to the new version and welcome feedback and suggestions for improvement through our community channels.

In the future, the Volcano community will continue to focus on the core needs of CNAI, big data, and other fields, iterating continuously.

## **Roadmap and Call for Contributions**

The Volcano community is committed to building a more powerful, flexible, and user-friendly batch computing platform while actively responding to evolving technology trends and user needs. In upcoming releases, we plan to focus on the following areas:

1.  **Deepen Network Topology-Aware Scheduling Capabilities:** Building on the v1.12 Alpha version, we will continue to enhance our network topology-aware capabilities. Key areas include providing automatic discovery support for RoCE networks, intelligent identification and use of node labels, and moving towards more fine-grained, task-level topology-aware scheduling. We will also explore and implement more advanced scheduling features to meet the performance requirements of complex AI training scenarios. Related issues:
    *   [HyperNode based binpack scheduling policy needed](https://github.com/volcano-sh/volcano/issues/4331)
    *   [Support task level network topology constrain](https://github.com/volcano-sh/volcano/issues/4188)
    *   [Support identifying network topology from node labels and converted into hyperNode resources](https://github.com/volcano-sh/volcano/issues/4145)
    *   [Network-topology-aware scheduling optimization: node reordering for tasks](https://github.com/volcano-sh/volcano/issues/4233)
2.  **Introduce Advanced Resource Management Mechanisms:** We will focus on developing and improving job rescheduling and resource reservation functions. This will help to more flexibly respond to dynamic changes in cluster load, ensure resource guarantees for critical tasks, and further improve overall cluster resource utilization. Related issue:
    *   [GPU fragmentation across nodes and Job/Pod rescheduling strategy request](https://github.com/volcano-sh/volcano/issues/3948)
3.  **Enhance Queue Scheduling Flexibility:** We will provide fine-grained configuration for queue-level scheduling policies. This will allow users to customize scheduling behavior and resource allocation strategies based on the characteristics, priorities, and SLA requirements of different business queues. Related issue:
    *   [volcano supports queue-level scheduling policies](https://github.com/volcano-sh/volcano/issues/3992)
4.  **Deepen Ecosystem Collaboration and Integration:** We will actively promote collaboration with the upstream Kubernetes community and other cloud-native projects, such as integrating LWS (Leader Worker Set) with Volcano to better provide Gang Scheduling capabilities for distributed applications. Related issue:
    *   [Support custom scheulder to enable gang scheduling](https://github.com/kubernetes-sigs/lws/issues/407)
    We warmly welcome other open-source projects to join with Volcano to build and enrich the cloud-native batch computing ecosystem.
5.  **Expand Heterogeneous Hardware Support and Cooperation:** We will strengthen cooperation with hardware ecosystem partners, such as adapting and optimizing Ascend's Device Plugin and DRA Driver, and collaborating with major GPU vendors on DRA Drivers. This will ensure that Volcano can efficiently and stably schedule and manage various cutting-edge heterogeneous accelerator resources.
6.  **Improve JobFlow Workflow Capabilities:** We will continue to optimize Volcano's built-in lightweight workflow engine, JobFlow. Plans include enhancing its capabilities in complex job dependency management, status monitoring, error handling, and user-defined extensions to provide users with a more powerful and user-friendly workflow orchestration solution. Related issues:
    *   [Support JobFlowTemplate CRD](https://github.com/volcano-sh/volcano/issues/4098)
    *   [Enhance JobFlow Functionality](https://github.com/volcano-sh/volcano/issues/4275)

7.  **Introduce Volcano Scheduler Simulator to Enhance Scheduling Transparency and Testability:** To improve the transparency of the scheduling process and simplify testing, Volcano plans to introduce a scheduling simulator. This tool will allow users to accurately reproduce Volcano's core scheduling process in a lightweight environment by flexibly configuring a simulated cluster state (nodes, Pods, queue configurations, etc.). By outputting detailed scheduling logs and optional performance analysis, the simulator will make it easier for developers to test new features, help users understand and validate Volcano's scheduling behavior in different scenarios, and efficiently evaluate the impact of various scheduling policies. Related issue:
    *   [Implement Volcano Scheduler Simulator](https://github.com/volcano-sh/volcano/issues/4276)

## **Community Engagement**

The above roadmap is a preliminary plan. We welcome developers and users to participate in discussions and contribute ideas and suggestions for the future of Volcano.

*   **GitHub Issues:** Create a `kind/feature` issue in the Volcano GitHub repository, detailing your use case and feature expectations.
*   **Community Communication:** Participate in community meetings, or start a discussion in the WeChat group, Slack channel, or mailing list to communicate with developers and community members.
*   **Roadmap Contribution:** Feel free to make suggestions regarding our proposed roadmap or other features you consider important.

## **Acknowledgments**

Volcano v1.12 includes hundreds of code commits from 43 community contributors. We would like to express our sincere thanks to all of them for their contributions. Their GitHub IDs are listed below:

<table>
<tr><td>@AdamKorcz</td><td>@HalfBuddhist</td><td>@Hcryw</td></tr>
<tr><td>@JackyTYang</td><td>@JesseStutler</td><td>@MondayCha</td></tr>
<tr><td>@Monokaix</td><td>@Poor12</td><td>@SataQiu</td></tr>
<tr><td>@Wang-Kai</td><td>@archlitchi</td><td>@baddoub</td></tr>
<tr><td>@cnmcavoy</td><td>@co63oc</td><td>@de6p</td></tr>
<tr><td>@dongjiang1989</td><td>@ecosysbin</td><td>@fengruotj</td></tr>
<tr><td>@feyounger</td><td>@fjq123123</td><td>@googs1025</td></tr>
<tr><td>@guoqinwill</td><td>@halcyon-r</td><td>@hansongChina</td></tr>
<tr><td>@hiwangzhihui</td><td>@hwdef</td><td>@kingeasternsun</td></tr>
<tr><td>@linuxfhy</td><td>@mahdikhashan</td><td>@mahmut-Abi</td></tr>
<tr><td>@murali1539</td><td>@ouyangshengjia</td><td>@qGentry</td></tr>
<tr><td>@sailorvii</td><td>@sceneryback</td><td>@sfc-gh-raravena</td></tr>
<tr><td>@wangyang0616</td><td>@weapons97</td><td>@xieyanke</td></tr>
<tr><td>@ytcisme</td><td>@yuyue9284</td><td>@zedongh</td></tr>
<tr><td>@zhutong196</td><td></td><td></td></tr>
</table> 