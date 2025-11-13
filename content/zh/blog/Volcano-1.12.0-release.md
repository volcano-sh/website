+++
title =  "Volcano v1.12.0正式发布"
description = "新增特性：网络拓扑感知调度达到Alpha阶段、GPU虚拟化动态MIG切分、DRA动态资源分配、Volcano Global队列容量管理、安全性增强、性能优化、通用工作负载Gang调度支持、Job Flow增强、Kubernetes v1.32支持等"
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
summary = "新增特性：网络拓扑感知调度达到Alpha阶段、GPU虚拟化动态MIG切分、DRA动态资源分配、Volcano Global队列容量管理、安全性增强、性能优化、通用工作负载Gang调度支持、Job Flow增强、Kubernetes v1.32支持等"

# Add menu entry to sidebar.
linktitle = "Volcano v1.12.0正式发布"
[menu.posts]
parent = "tutorials"
weight = 6
+++

## Volcano v1.12 正式发布！驱动云原生AI与批量计算向智能高效新阶段演进

随着AI大模型技术的快速发展，企业对计算资源利用效率和应用性能的要求日益提高。在AI、大数据及高性能计算（HPC）等复杂应用场景下，如何高效利用GPU等异构加速器、保障系统高可用性并精细化管理资源，是Volcano社区持续探索和创新的核心方向。

Volcano的每一次版本迭代，都是对这些挑战的积极回应。在来自全球30余个国家、**超过1000名开发者、近40000次贡献**的共同建设下，Volcano已在国内外60多家企业的生产环境中得到应用，其调度性能与资源管理能力在实践中获得了广泛认可。

今天，**Volcano社区正式发布 v1.12 版本。** 新版本聚焦于AI与大数据等前沿场景的核心需求，带来了一系列关键特性与体验优化：

### **新版本亮点一览**

* **网络拓扑感知调度 (Alpha):** 优化大规模AI训练与推理任务部署，通过感知网络拓扑减少跨交换机通信，提升运行效率。  
* **GPU虚拟化方案增强:** 在原有vCUDA方案基础上，新增对NVIDIA GPU动态MIG切分的支持，为用户提供软件与硬件两种虚拟化选择，实现更灵活、高效的GPU资源共享。  
* **DRA支持:** 增强异构资源管理的灵活性与能力。  
* **Volcano Global支持队列容量管理:** 在多集群环境下，支持对租户队列的资源配额（capability）进行统一限制和管理。  
* **安全性全面增强:** 从API访问控制到容器运行时权限，实施多维度安全加固，提升系统稳健性。  
* **大规模场景性能优化:** 通过减少不必要的Webhook调用等手段，有效提升高并发任务处理效率。  
* **增强通用工作负载的Gang调度控制:** 现已支持通过Annotation为Deployment、StatefulSet等通用工作负载自定义Gang调度所需的最小成员数（minMember），提供了更精细的Gang Scheduling调度策略。  
* **Job Flow功能增强:** 提升了内置工作流编排引擎的健壮性与可观测性。  
* 以及更多稳定性与易用性改进。

我们相信，v1.12版本的这些更新将进一步提升任务调度的智能化水平、资源利用效率和系统的整体性能，帮助用户更好地应对AI和大数据时代的挑战。

## 核心功能详解

### 网络拓扑感知调度 (Alpha Release)

Volcano 的网络拓扑感知调度功能，在 v1.11 中作为预览版发布后，现已在 v1.12 中达到 Alpha 发布状态。此功能旨在优化大规模训练和推理场景（如模型并行训练、Leader-Worker 推理）中 AI 任务的部署。它通过将任务调度到同一网络拓扑性能域内，减少跨交换机通信，从而显著提升任务效率。Volcano 使用 HyperNode CRD 来抽象和表示异构硬件网络拓扑，并支持层级结构以方便管理。

v1.12 版本集成了以下关键特性：

* **HyperNode 自动发现 (HyperNode Auto-Discovery)**： Volcano 提供了集群网络拓扑的自动发现能力。用户可配置发现类型，系统将自动创建和维护反映集群真实网络拓扑的层级 HyperNode。目前支持 InfiniBand (IB) 网络下通过 UFM (Unified Fabric Manager) 接口获取网络拓扑信息，并自动更新 HyperNode。未来计划支持 RoCE 等更多网络协议。  
* **HyperNode 优选策略 (Prioritized HyperNode Selection)**： 引入了基于节点级别和 HyperNode 级别的打分策略，累加后作为 HyperNode 的最终得分。  
  * **节点级别 (Node-level)**： 建议配置 BinPack 插件以优先填满 HyperNode，减少资源碎片。  
  * **HyperNode 级别 (HyperNode-level)**： 优先选择层级更低的 HyperNode 以获得更优性能，因其涉及的跨交换机次数较少；对于相同层级的 HyperNode，包含更多任务的 HyperNode 得分更高，旨在减少 HyperNode 级别的资源碎片。  
* **支持通过 Label Selector 匹配节点 (Support for Label Selector Node Matching)**： HyperNode 叶子节点与集群中的物理节点关联，支持以下三种匹配策略：  
  * **精确匹配 (Exact Match)**： 直接匹配节点名称。  
  * **正则匹配 (Regex Match)**： 通过正则表达式匹配节点名称。  
  * **标签匹配 (Label Match)**： 通过标准 Label Selector 匹配节点。

相关参考文档：

* [网络拓扑感知调度介绍与使用](https://volcano.sh/zh/docs/network_topology_aware_scheduling/)  
* [网络拓扑感知调度设计文档](https://github.com/volcano-sh/volcano/blob/master/docs/design/Network%20Topology%20Aware%20Scheduling.md)   
* [网络拓扑自动发现设计文档](https://github.com/volcano-sh/volcano/blob/master/docs/design/hyperNode-auto-discovery.md)  
* [网络拓扑自动发现使用文档](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_hypernode_auto_discovery.md)

Related PRs: 

* [https://github.com/volcano-sh/volcano/pull/3874](https://github.com/volcano-sh/volcano/pull/3874)
* [https://github.com/volcano-sh/volcano/pull/3894](https://github.com/volcano-sh/volcano/pull/3894)
* [https://github.com/volcano-sh/volcano/pull/3969](https://github.com/volcano-sh/volcano/pull/3969)
* [https://github.com/volcano-sh/volcano/pull/3971](https://github.com/volcano-sh/volcano/pull/3971)
* [https://github.com/volcano-sh/volcano/pull/4068](https://github.com/volcano-sh/volcano/pull/4068)
* [https://github.com/volcano-sh/volcano/pull/4213](https://github.com/volcano-sh/volcano/pull/4213)
* [https://github.com/volcano-sh/volcano/pull/3897](https://github.com/volcano-sh/volcano/pull/3897)
* [https://github.com/volcano-sh/volcano/pull/3887](https://github.com/volcano-sh/volcano/pull/3887)

由衷感谢社区开发者: **@ecosysbin, @weapons97, @Xu-Wentao, @penggu, @JesseStutler, @Monokaix**对该特性的贡献！

### GPU 虚拟化支持动态 MIG 切分

Volcano 提供的 GPU 虚拟化功能支持按显存和算力申请部分 GPU 资源，通过与 Device Plugin 配合实现硬件隔离，从而提升 GPU 利用率。传统 GPU 虚拟化通过拦截 CUDA API 方式限制 GPU 使用。NVIDIA Ampere 架构引入的 MIG (Multi-Instance GPU) 技术允许将单个物理 GPU 划分为多个独立实例。然而，通用 MIG 方案通常预先固定实例大小，存在资源浪费和灵活性不足的问题。

**Volcano v1.12 提供了动态 MIG 切分与调度能力**，可根据用户申请的 GPU 用量实时选择合适的 MIG 实例大小，并使用 Best-Fit 算法减少资源浪费。同时支持 BinPack 和 Spread 等 GPU 打分策略，以减少资源碎片并提升 GPU 利用率。用户可使用统一的 `volcano.sh/vgpu-number`、`volcano.sh/vgpu-cores`、`volcano.sh/vgpu-memory` API 申请资源，无需关注底层实现。

* 设计文档：[Dynamic MIG 设计文档](https://github.com/volcano-sh/volcano/blob/master/docs/design/dynamic-mig.md)  
* 使用文档：[Dynamic MIG 使用文档](https://volcano.sh/zh/docs/gpu_virtualization/)

Related PRs: 

* [https://github.com/volcano-sh/volcano/pull/4290](https://github.com/volcano-sh/volcano/pull/4290)
* [https://github.com/volcano-sh/volcano/pull/3953](https://github.com/volcano-sh/volcano/pull/3953)

由衷感谢社区开发者: **@sailorvii, @archlitchi** 对该特性的贡献！

### 支持 DRA (Dynamic Resource Allocation)

Kubernetes DRA (Dynamic Resource Allocation，动态资源分配) 是一项内置的 Kubernetes 功能，旨在提供一种更灵活、更强大的方式来管理集群中的异构硬件资源，例如 GPU、FPGA、高性能网卡等。它解决了传统设备插件 (Device Plugin) 在某些高级场景下的局限性。Volcano v1.12 增加了对 DRA 的支持，允许集群动态分配和管理外部资源，增强了 Volcano 与 Kubernetes 生态系统的集成能力及资源管理的灵活性。

* 使用文档：[在Volcano中启用DRA](https://volcano.sh/zh/docs/unified_scheduling/#2-1-2-%E5%9C%A8volcano%E4%B8%AD%E5%90%AF%E7%94%A8dra-dynamic-resource-allocation)

Related PR: 

* [https://github.com/volcano-sh/volcano/pull/3799](https://github.com/volcano-sh/volcano/pull/3799)

由衷感谢社区开发者: **@JesseStutler** 对该特性的贡献！

### Volcano Global 支持队列容量管理

队列是 Volcano 的核心概念。为支持多集群和多租户场景下的租户配额管理，Volcano 在 v1.12 中扩展了其全局队列容量管理能力。现在，用户可以在多集群环境中统一限制租户的资源使用，其配置方式与单集群场景一致：通过在队列配置中设置 `capability` 字段来限制租户配额。

Related PR: 

* [https://github.com/volcano-sh/volcano-global/pull/16](https://github.com/volcano-sh/volcano-global/pull/16)

由衷感谢社区开发者: **@tanberBro** 对该特性的贡献！

### 安全性增强

Volcano 社区持续关注安全性。在 v1.12 中，除了对 ClusterRole 等敏感权限的精细控制外，还修复了以下潜在安全风险并进行了加固：

* **HTTP Server 设置超时时间**： Volcano 各组件的 Metric 和 Healthz 端点均已设置服务器端的 ReadHeader、Read、Write 超时，避免资源长时间占用。(PR: [https://github.com/volcano-sh/volcano/pull/4208](https://github.com/volcano-sh/volcano/pull/4208))  
* **跳过 SSL 证书验证时增加警告日志**： 当客户端请求设置`insecureSkipVerify`为 true时，添加警告日志，建议生产环境启用 SSL 证书验证。(PR: [https://github.com/volcano-sh/volcano/pull/4211](https://github.com/volcano-sh/volcano/pull/4211))  
* **默认关闭 Volcano Scheduler 的 pprof 端点**： 为避免敏感程序信息泄露，默认关闭用于定位问题的 Profiling 数据端口。(PR: [https://github.com/volcano-sh/volcano/pull/4173](https://github.com/volcano-sh/volcano/pull/4173))  
* **移除不必要的文件权限**： 移除 Go 源文件不必要的执行权限，保持文件最小权限。(PR: [https://github.com/volcano-sh/volcano/pull/4171](https://github.com/volcano-sh/volcano/pull/4171))  
* **为容器设置 Security Context 并以非 Root 权限运行**： 所有 Volcano 组件均以非 Root 权限运行，并增加了 seccompProfile, SELinuxOptions，设置 `allowPrivilegeEscalation`避免容器提权，同时仅保留必要的 Linux Capabilities，全面限制容器权限。(PR: [https://github.com/volcano-sh/volcano/pull/4207](https://github.com/volcano-sh/volcano/pull/4207))  
* **限制 HTTP 请求返回体大小**： 针对 Extender Plugin 和 Elastic Search Service 发送的 HTTP 请求，限制其返回体大小，避免资源过度消耗导致的 OOM 等问题。(披露地址: [https://github.com/volcano-sh/volcano/security/advisories/GHSA-hg79-fw4p-25p8](https://github.com/volcano-sh/volcano/security/advisories/GHSA-hg79-fw4p-25p8))

### 大规模场景性能提升

Volcano 持续优化性能。新版本在不影响功能的前提下，默认移除和关闭了部分非必要的 Webhook，提升了大规模批创建场景下的性能：

* **默认关闭 PodGroup 的 Mutating Webhook**： 在创建 PodGroup 未指定队列时，可从 Namespace 读取进行填充。由于该场景不常见，故默认关闭此 Webhook。用户可按需开启。  
* **任务提交时的队列状态校验从 Pod 迁移到 PodGroup**： 当队列处于关闭状态时，不允许提交任务。原校验逻辑在创建 Pod 时进行，而 Volcano 的调度基本单位是 PodGroup，将校验迁移至 PodGroup 创建时更为合理。因 PodGroup 数量少于 Pod，此举可减少 Webhook 调用，提升性能。

Related PRs: 

* [https://github.com/volcano-sh/volcano/pull/4128](https://github.com/volcano-sh/volcano/pull/4128)
* [https://github.com/volcano-sh/volcano/pull/4132](https://github.com/volcano-sh/volcano/pull/4132)

由衷感谢社区开发者: **@Monokaix** 对该特性的贡献！

### 多种负载类型支持 Gang 调度

Gang 调度是 Volcano 的核心能力。对于 Volcano Job 和 PodGroup 对象，用户可直接设置 `minMember` 来定义所需最小副本数。在新版本中，用户可通过在 Deployment、StatefulSet、Job 等其他类型工作负载上设置 Annotation `scheduling.volcano.sh/group-min-member` 来指定所需最小副本数。这意味着在使用 Volcano 调度时，要么指定数量的副本全部调度成功，要么一个也不调度，从而为多种负载类型实现了 Gang 调度。

例如，为 Deployment 设置 minMember=10：

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

* [https://github.com/volcano-sh/volcano/pull/4000](https://github.com/volcano-sh/volcano/pull/4000)

由衷感谢社区开发者: **@sceneryback**  对该特性的贡献！

### Job Flow 功能增强

Job Flow 是 Volcano 提供的轻量级 Volcano Job 工作流编排框架。在 v1.12 版本中，Job Flow 进行了以下增强：

* 新增监控指标： 增加了对成功和失败的 Job Flow 数量的度量支持。  
* DAG 合法性校验： 引入了对 Job Flow DAG (有向无环图) 结构进行合法性校验的功能。  
* 状态同步问题修复： 解决了 Job Flow 状态同步不准确的问题。

Related PRs: 

* [https://github.com/volcano-sh/volcano/pull/4169](https://github.com/volcano-sh/volcano/pull/4169)
* [https://github.com/volcano-sh/volcano/pull/4090](https://github.com/volcano-sh/volcano/pull/4090)
* [https://github.com/volcano-sh/volcano/pull/4135](https://github.com/volcano-sh/volcano/pull/4135)

由衷感谢社区开发者: **@dongjiang1989** 对该特性的贡献！

### 多租户场景下更细粒度的权限控制

Volcano 原生支持多租户环境，并重视多租户场景下的权限控制。在新版本中，Volcano 增强了对 Volcano Job 的权限控制，增加了只读和读写的 ClusterRole，用户可根据需要为不同租户分配不同的读写权限，以实现权限隔离。

Related PR: 

* [https://github.com/volcano-sh/volcano/pull/4174](https://github.com/volcano-sh/volcano/pull/4174)

由衷感谢社区开发者: **@Hcryw** 对该特性的贡献！

### 支持 Kubernetes 1.32

Volcano 版本紧随 Kubernetes 社区版本。v1.12 支持最新的 Kubernetes v1.32 版本，并通过完整的 UT 和 E2E 测试用例确保功能和可靠性。

如需参与 Volcano 对新 Kubernetes 版本的适配工作，请参考：[adapt-k8s-todo](https://github.com/volcano-sh/volcano/pull/4318)。

Related PR:

* [https://github.com/volcano-sh/volcano/pull/4099](https://github.com/volcano-sh/volcano/pull/4099)

由衷感谢社区开发者: **@guoqinwill, @danish9039** 对该特性的贡献！

### 队列监控指标增强

Volcano 队列新增了多项关键资源度量指标。现在支持对 CPU、Memory 及扩展资源的请求量 (request)、已分配量 (allocated)、应得量 (deserved)、容量 (capacity) 和 实际容量 (real\_capacity) 等指标进行监控与可视化，提供队列关键资源状态的详细视图。

Related PR: 

* [https://github.com/volcano-sh/volcano/pull/3937](https://github.com/volcano-sh/volcano/pull/3937)

由衷感谢社区开发者:  **@zedongh** 对该特性的贡献！

### 支持模糊测试

模糊测试 (Fuzz Testing) 是一种自动化软件测试技术。Volcano 在新版本中引入了模糊测试框架，对关键函数单元进行了模糊测试，并使用 Google 开源的 OSS-Fuzz 模糊测试框架进行持续测试，旨在提前发现潜在漏洞和缺陷，增强 Volcano 的安全性和健壮性。

Related PR: 

* [https://github.com/volcano-sh/volcano/pull/4205](https://github.com/volcano-sh/volcano/pull/4205)

由衷感谢社区开发者: **@AdamKorcz** 对该特性的贡献！

### 稳定性增强

新版本中修复了多项稳定性问题，包括队列容量设置不合理导致的 Panic、层级队列校验失败、PodGroup 无意义刷新以及 StatefulSet 副本为0时仍占用队列资源等问题，进一步提升了系统在复杂场景下的稳定运行能力。

Related PRs:   

* [https://github.com/volcano-sh/volcano/pull/4273](https://github.com/volcano-sh/volcano/pull/4273)
* [https://github.com/volcano-sh/volcano/pull/4272](https://github.com/volcano-sh/volcano/pull/4272)
* [https://github.com/volcano-sh/volcano/pull/4179](https://github.com/volcano-sh/volcano/pull/4179)
* [https://github.com/volcano-sh/volcano/pull/4141](https://github.com/volcano-sh/volcano/pull/4141)
* [https://github.com/volcano-sh/volcano/pull/4033](https://github.com/volcano-sh/volcano/pull/4033)
* [https://github.com/volcano-sh/volcano/pull/4012](https://github.com/volcano-sh/volcano/pull/4012)
* [https://github.com/volcano-sh/volcano/pull/3603](https://github.com/volcano-sh/volcano/pull/3603)

由衷感谢社区开发者: **@halcyon-r,  @guoqinwill, @JackyTYang, @JesseStutler, @zhutong196, @Wang-Kai, @HalfBuddhist** 的贡献！

#### 升级前注意事项

在升级到 Volcano v1.12 之前，请注意以下改动：

* **PodGroup Mutating Webhook 默认关闭**： 在 v1.12 中，PodGroup 的 Mutating Webhook 默认处于关闭状态。若您有依赖此行为（创建 PodGroup 未指定队列时从 Namespace 填充）的特定工作流，请确保在升级后手动开启此 Webhook。  
* **队列状态校验迁移及行为变更**： 任务提交时的队列状态校验逻辑已从 Pod 创建阶段迁移到 PodGroup 创建阶段。当队列处于关闭状态时，系统将在 PodGroup 创建时即阻止任务提交。然而，如果在队列关闭后继续向该队列提交独立的 Pod（非通过 PodGroup 提交），这些 Pod 可以提交成功，但 Volcano Scheduler 将不会对其进行调度。  
* **Volcano Scheduler pprof 端点默认禁用**： 出于安全增强考虑，Volcano Scheduler 的 pprof 端点在此版本中默认禁用。如需使用，可通过 Helm 参数 `custom.scheduler_pprof_enable=true` 或命令行参数 `--enable-pprof=true` 显式启用。

## 总结与展望

Volcano v1.12 版本的发布，得益于社区贡献者和用户的共同努力。此版本在 AI 任务调度、GPU 资源利用率、异构资源管理、安全性以及大规模场景下的性能与稳定性等多个方面进行了增强。

v1.12 版本旨在提升用户在云原生环境中运行 AI、大数据等批量计算任务的性能和效率。我们建议用户升级并体验新版本，并欢迎通过社区渠道提供使用反馈与改进建议。

未来，Volcano 社区将继续关注 CNAI 和大数据等领域的核心需求，持续进行迭代。

## **未来展望与需求征集**

Volcano 社区始终致力于构建更加强大、灵活和易用的批量计算平台，并积极响应快速发展的技术趋势与用户需求。在接下来的版本迭代中，我们计划重点投入以下方向：

1. **深化网络拓扑感知调度能力**：在v1.12 Alpha版本的基础上，我们将持续演进网络拓扑感知能力。重点包括提供对RoCE网络的自动发现支持、节点标签的智能识别与利用，并向更细粒度的任务级（Task-level）拓扑感知调度迈进。同时，我们也将积极探索和实现更多高级调度特性，以应对复杂AI训练等场景的极致性能需求。相关issue:  
   * [HyperNode based binpack scheduling policy needed](https://github.com/volcano-sh/volcano/issues/4331)  
   * [Support task level network topology constraint](https://github.com/volcano-sh/volcano/issues/4188)  
   * [Support identifying network topology from node labels and converting into hyperNode resources](https://github.com/volcano-sh/volcano/issues/4145)  
   * [Network-topology-aware scheduling optimization: node reordering for tasks](https://github.com/volcano-sh/volcano/issues/4233)  
2. **引入高级资源管理机制**：重点开发和完善作业重调度（Rescheduling）与资源预留（Resource Reservation）功能。这将有助于更灵活地应对集群动态负载变化，保障关键任务的资源确定性，并进一步提升整体集群的资源利用效率。相关issue:  
   * [GPU fragmentation across nodes and Job/Pod rescheduling strategy request](https://github.com/volcano-sh/volcano/issues/3948)  
3. **增强队列调度灵活性**：提供队列级别的调度策略（Queue-level Scheduling Policy）精细化配置能力。用户将能根据不同业务队列的特性、优先级和SLA需求，更灵活地定制其调度行为和资源分配策略。相关issue：  
   * [volcano supports queue-level scheduling policies](https://github.com/volcano-sh/volcano/issues/3992)  
4. **深化生态协同与集成**：我们将积极推进与Kubernetes上游社区及其他云原生项目的协作。例如，推动LWS（Leader Worker Set）与Volcano的集成，以便更好地为分布式应用提供Gang Scheduling能力。相关issue：  
   * [Support custom scheduler to enable gang scheduling](https://github.com/kubernetes-sigs/lws/issues/407)  
     我们热忱欢迎更多优秀的开源项目与Volcano携手，共同构建和繁荣云原生批量计算生态。  
5. **拓展异构硬件支持与合作**：加强与硬件生态伙伴的合作，如昇腾（Ascend）的Device Plugin和DRA Driver的适配与优化，以及与主流GPU厂商在DRA Driver上的协作，确保Volcano能高效、稳定地调度和管理各类前沿异构加速器资源。  
6. **JobFlow工作流能力提升**：持续优化Volcano内置的轻量级工作流引擎JobFlow。计划增强其在复杂作业依赖管理、状态监控、错误处理及用户自定义扩展等方面的能力，为用户提供更强大、更易用的工作流编排解决方案。相关issue：  
   * [Support JobFlowTemplate CRD](https://github.com/volcano-sh/volcano/issues/4098)  
   * [Enhance JobFlow Functionality](https://github.com/volcano-sh/volcano/issues/4275)
7. **引入Volcano调度模拟器，提升调度透明度与可测试性**：为提升调度过程的透明度并简化测试验证，Volcano计划引入调度模拟器。这一工具将允许用户在轻量级环境中，通过灵活配置模拟集群状态（节点、Pod、队列配置等），精准复现Volcano核心调度流程——从队列选择、节点过滤与打分到最终绑定。通过输出详尽的调度日志及可选的性能分析，模拟器将极大地便利开发者测试新特性，帮助用户深入理解和验证Volcano在不同场景下的调度行为，并高效评估各类调度策略的实际影响。相关issue：
   * [Implement Volcano Scheduler Simulator](https://github.com/volcano-sh/volcano/issues/4276)

## **社区参与**

以上 Roadmap 为社区的初步规划。我们欢迎开发者和用户通过以下渠道参与讨论，为 Volcano 的发展贡献新的想法和建议。

* **GitHub Issues:** 在 Volcano GitHub 仓库中创建 kind/feature 类型的 Issue，详细说明您的使用场景和功能期望。  
* **社区交流:** 参与社区会议，或在微信交流群/Slack 频道及邮件列表中发起讨论，与开发者和社区成员进行交流。  
* **Roadmap 共建:** 针对我们提出的 Roadmap 或您认为重要的其他特性，欢迎随时提出建议。

## **致谢贡献者**

Volcano v1.12 版本包含了来自43位社区贡献者的上百次代码提交，在此对各位贡献者表示由衷的感谢，贡献者GitHub ID：

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

