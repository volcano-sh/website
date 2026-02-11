---
title: "Volcano社区发布Kthena子项目: 重新定义大模型智能推理"
description: "Volcano 社区迎来了一个新的子项目 Kthena！Kthena 是一个专为 Kubernetes 设计的、云原生、高性能的 LLM 推理路由和编排、调度系统。"
date: 2025-12-29
authors: [volcano]
---
今天，我们激动地向全球开发者和 MLOps 工程师宣布，Volcano 社区迎来了一个新的子项目 Kthena！Kthena 是一个专为 Kubernetes 设计的、云原生、高性能的 LLM 推理路由和编排、调度系统。它旨在解决在生产环境中大规模编排、部署和服务 LLM 所面临的核心挑战，通过其独特的超节点拓扑感知的亲和性调度，KV Cache 感知的流量调度、Prefill/Decode 分离路由等高级功能，显著提升 GPU/NPU 资源利用率和吞吐，降低推理延迟，并赋予企业前所未有的灵活性和控制力。作为 Volcano 的子项目，Kthena将致力于帮助 Volcano 扩展除 AI 训练之外的边界，打造训推一体的完整解决方案。

## LLM 服务化的“最后一公里”困境

大语言模型（LLM）正在以前所未有的速度重塑各行各业，但将其高效、经济地部署在生产环境中，特别是基于 Kubernetes 的云原生平台上，仍然困难重重。开发者们普遍面临以下挑战：  
1. **资源利用率低**：LLM 推理，尤其是其独特的 KV Cache 机制，对 GPU、NPU 显存的占用是动态且巨大的。传统的负载均衡一般采用Round-Robin算法，无法感知这种负载特性，导致 GPU、NPU 资源闲置与请求排队并存，成本高昂。  
2. **延迟与吞吐量难以兼顾**：LLM 推理分为“Prefill”（处理输入提示）和“Decode”（生成 Token）两个阶段，前者是计算密集型，后者是访存密集型。将两者混合调度，常常导致无法针对性优化，影响整体服务的响应速度和吞吐能力。因此PD分离的部署已经成为主流，但如何高效路由和调度，仍是一个难题。  
3. **多租户与多模型管理复杂**：在企业环境中，通常需要同时提供多个不同模型、不同版本或经过 LoRA 微调的模型。如何实现请求的公平调度、优先级管理以及动态路由，是一个复杂的工程难题，业界甚至有些方案将AI网关与大模型一一对应。  
4. **缺乏K8s原生集成**：许多现有的解决方案要么是外部系统，与 Kubernetes 生态割裂；要么过于复杂，无法满足生产级所需的简单易用性和灵活运维。

## Kthena：云原生 LLM 推理的智能大脑

为了攻克上述难题，Kthena 应运而生。它并非要取代现有的 LLM 服务框架（如 vLLM, sgLang），而是作为它们上层的智能“交通枢纽”和“调度中心”，深度集成于 Kubernetes 之中。

<div style="text-align: center;"> {{<figure library="1" src="./kthena/kthena-arch.svg">}}
</div>


Kthena 的核心由两大组件构成：

1）Kthena Router：一个独立、高性能面向多模型的router，负责接收所有推理请求，并根据 `ModelRoute` 规则，智能地将请求分发到后端的 `ModelServer`。

2）Kthena Controller Manager：Kubernetes 控制平面的控制器，它主要包含多种控制器，负责 LLM 工作负载的编排与生命周期管理。它持续调谐并联动多类 CRD（如 `ModelBooster`、`ModelServing`、`AutoScalingPolicy`/`AutoScalingPolicyBinding`、以及 `ModelRoute`/`ModelServer`），将声明式API转化为运行时资源：ModelServing 控制器编排 `ServingGroup` 与 `Prefill/Decode` 角色分组；支持网络拓扑亲和调度和Gang调度、滚动升级与故障恢复；基于 `AutoScalingPolicy` 实现弹性扩缩容。

这种架构使得 Kthena 成为连接用户请求与 LLM 模型的高度可编程的桥梁。

## 核心特性与优势

Kthena 的强大之处在于其专为 LLM 推理场景设计的核心功能：

**1) 生产级推理编排（ModelServing）**

<div style="text-align: center;"> {{<figure library="1" src="./kthena/model-serving.svg">}}
</div>

- **LLM工作负载三层架构设计**：ModelServing -> ServingGroup -> Role，一个API，支持LLM原生部署、PD分离部署，乃至大EP部署等多种部署形态，简化管理多LWS的负担。例如对于PD分离的大规模部署，可用一个ModelServing表示，根据负载的大小每个ModelServing可以包含任意数目的 ServingGroup（xPyD 分组）， 每个ServingGroup包含多个角色（Prefill Decode，他们通常部署在同一个超节点内以提升推理性能），相同的角色可以等价为一个LeaderWorkerSet，支持TP/PP/EP等多节推理并行计算。  
- **原生支持Prefill-Decode分离部署**：将计算密集型的 Prefill 实例调度到配备高性能计算卡的节点组，而将访存密集型的 Decode 实例调度到配备高带宽显存的节点组，实现资源的最佳匹配和极致的端到端延迟优化。另可以独立伸缩，动态调整Prefill-Decode的比例，更灵活的应对各种复杂的业务场景（如长短句混合、实时推理等）。  
- **多并行范式支持**：TP/PP/DP/EP 等并行模式灵活配置，最大化提升资源利用率和SLO  
- **内置拓扑感知、Gang 调度支持**：Gang调度确保ServingGroup/Role“成组原子化”落地，避免资源浪费；拓扑感知调度通过将Role内的一组Pod调度到网络拓扑更优的节点，提升并行计算的数据传输时延。

**2) 开箱即用的模型上线（ModelBooster）**

- 针对主流的大模型，提供包括PD分离在内的多种部署范式模板，自动生成ModelRoute/ModelServer/ModelServing/Autoscaling等路由策略和生命周期管理资源  
- 覆盖通用的部署场景，至于更灵活的编排可通过ModelServing进行细粒度的控制

**3) 智能、模型感知的路由（Kthena Router）**

- **多模型路由**：兼容OpenAI API，根据请求头或Body体内容，将流量调度到不同的基础模型。  
- **插件化调度算法**：提供最少请求、最小时延、KV Cache 感知、Prefix Cache 感知、LoRA 亲和、GPU 利用率感知、公平调度等多种负载均衡算法，满足用户不同业务场景和部署形态的需求  
- **LoRA 模型热插拔无中断**：感知推理引擎加载的LoRA 适配器，提供无中断的插拔和路由能力  
- **丰富的流量治理策略**：基于权重的模型路由，金丝雀发布、Token级流控、故障转移
- **All-in-one实现架构**，无需部署Envoy Gateway，原生支持PD分离的流量调度，将多层路由合并成一层，易于维护

**4) 成本驱动的自动扩缩容（Autoscaler）**

- **同构伸缩**：支持稳定、突发双模式，按业务指标（CPU/GPU/内存/自定义）精准扩缩  
- **异构部署优化**：在多推理引擎/异构加速器组合中按“成本-能力”贪心分配，最大化性价比

**5) 主流推理引擎与异构硬件支持**

- 支持多种主流推理引擎vLLM、SGLang、Triton/TGI 等，统一API抽象、标准化指标  
- **支持GPU/NPU 等异构混部**，配合异构 Autoscaling 实现成本与 SLO 的动态平衡

**6) 内置流量控制与公平性调度**

- **公平调度**：支持基于优先级和历史Token消耗的的公平调度，既兼顾用户的优先级，对高优先级用户提供更好的服务，又防止低优先级用户“饿死”  
- **流量控制**：支持按照用户、模型、token长度进行精细化流量控制

## 极致的性能提升

基于 Kthena Router 的调度插件架构，在长系统提示词场景（如 4096 tokens）下，采用“KV Cache 感知 + 最少请求”策略相较随机基线：

- 吞吐可提升约 2.73 倍  
- TTFT 降低约 73.5%  
- 端到端时延降低超过 60%

| Plugin Configuration | Throughput (req/s) |  TTFT (s) |  E2E Latency (s) |
| :---- | :---- | :---- | :---- |
| Least Request + KVCacheAware | **32.22** | **9.22** | **0.57** |
| Least Request + Prefix Cache | 23.87 | 12.47 | 0.83 |
| Random | 11.81 | 25.23 | 2.15 |

短提示词场景差距会随提示词长度收敛，但在多轮对话、模板化生成、前缀高度相似的业务中，KV Cache 感知策略优势显著。实际收益与模型规模、Prompt长短、硬件紧密相关，但“按需组合、按场景选型”已被验证有效。

## 社区展望

Kthena 在项目规划和发展的初期便得到了部分社区用户单位的关注和支持，但这只是一个开始。我们计划在未来支持更高效的调度算法、更广泛的大模型最佳部署实践，并持续深耕 LLM 推理的大规模部署和性能优化。

“开源是技术创新的源头活水，也是推动产业标准化的最强引擎。作为Volcano项目的发起单位，华为云很荣幸能够与社区其他伙伴一起推出全新的Kthena分布式推理项目。这不仅是Volcano社区技术演进的重要里程碑，更是华为云在云原生AI领域长期投入与持续创新的有力见证。它将与华为云CCE（云容器引擎）、CCI（云容器实例）等基础设施深度结合，进一步释放包括昇腾（Ascend）在内的多元算力价值，为客户提供极致的算力性价比。我们希望通过Kthena，与全球开发者与伙伴，共建、共享一个开放、繁荣的云原生AI生态，为千行万业的智能化升级构筑最坚实的算力底座。”
<div style="text-align: right;">—— 祁小波，华为云通用计算服务产品部部长</div>

“Kthena进一步巩固了Volcano在智能计算调度领域的领先地位。我们的平台利用Volcano的统一调度与资源池化能力，一站式满足通用计算与智能计算中训练、推理等多类算力需求。这使得算力资源能够在不同场景间灵活流转，有效避免了资源割裂的问题。展望未来，我们期待 Kthena结合Volcano的弹性伸缩能力与Volcano Global的跨集群调度特性，共同推动算力资源利用率进一步提升！”
<div style="text-align: right;">—— 杨磊，中电信人工智能公司 PaaS研发总监</div>

“Volcano 项目自诞生之日起，便始终与社区以及各类 AI 场景深度共建、同频演进，逐步沉淀出一整套面向 AI 工作负载的调度与批处理生态。今天，Kthena 的出现，不仅将这条共建链路进一步拓展到大模型推理领域，把推理这一关键一环真正纳入 Volcano 生态之中，更是在统一编排与智能路由层面，将 Volcano 在调度、弹性伸缩以及多算力适配上的多年实践，凝练成一个令人振奋的里程碑式能力。  
借助既有的 Kubernetes / Volcano 生态，更多团队可以用更低的成本，获得更智能的调度决策和更高效的算力利用，并在开放协作的基础上持续演进。这不仅为道客解决了在推理场景中遇到的实际问题，也是我们所期待的云原生 AI 形态——一个足够开放、足够智能、值得我们长期投入和深度参与的社区方向。”  
<div style="text-align: right;">—— 徐俊杰，DaoCloud 开源团队负责人、Kubernetes 社区指导委员会成员</div>

“自建大模型推理服务的生产级部署和运维难题，是一个覆盖推理服务全生命周期管理（部署、运维、弹性、故障恢复等），GPU集群稳定性，资源调度效率、推理服务性能提升，推理流量智能调度、AI可观测等领域的系统工程。而这也正是Kthena项目的技术定位。  
早在Kthena的规划阶段，小红书云原生团队就和Kthena贡献者做了深度的沟通，在推理流量智能调度方向，一起设计了多种流量调度策略和路由实现。未来，双方将继续在AI网关方向合作，结合小红书内部业务经验，一起为社区提供更精细化的AI流量智能调度能力，模型API管理能力，MCP协议支持等多种生产可用能力。”  
<div style="text-align: right;">—— 空古(陈华昌)，小红书云原生业务网关负责人</div>

“在深入调研并试用Kthena这一云原生AI推理平台后，联通云对其展现出的前瞻能力印象深刻。我们尤为看好其与Volcano实现的联合调度特性，其网络拓扑感知与Gang Scheduling功能，能够有效解决大规模分布式模型推理场景下中，关于效率与可靠性的核心诉求，为破解复杂调度难题提供了极具潜力的解决方案。我们相信，Kthena卓越的低延迟、高吞吐与多模型智能路由能力，将为开源社区带来真正具备生产级的AI推理解决方案，助力开发者更高效地构建和管理云原生环境下的智能应用。”
<div style="text-align: right;">—— 卢照旭，联通云智算能力中心团队长</div>

“开放和协作是构建社区的未来、加速技术创新的核心动力。在CNCF，我们持续致力于推动基础设施向‘AI Native’演进，为整个云原生生态提供标准、中立且可扩展的基础能力。Volcano社区通过孵化Kthena子项目，将其在大规模批量计算和调度上积累的拓扑感知、Gang调度等核心经验，精准地应用到了LLM在线推理这一关键场景。  
Kthena的价值在于，它提供了一套专为大模型设计、可供业界参考借鉴的云原生调度原语和抽象，这有助于将复杂的LLM推理工作负载，真正以Kubernetes原生的一等公民身份进行高效管理。  
这不仅是Volcano项目技术演进的重要一步，更是社区生态在解决AI规模化部署挑战中贡献的一份重要实践经验。我们诚挚邀请全球的开发者、研究人员和所有云原生爱好者加入，共同贡献智慧，完善这些关键AI基础设施，加速 AI Native 进程。”
<div style="text-align: right;">—— Kevin Wang,  Volcano Maintainer、CNCF TOC 副主席</div>

## 立即开始探索 Kthena

**GitHub 仓库**: [https://github.com/volcano-sh/kthena](https://github.com/volcano-sh/kthena)  
**官网**:  [https://kthena.volcano.sh/](https://kthena.volcano.sh/)   
**社区**: 加入我们的 Slack [https://cloud-native.slack.com/archives/C011GJDQS0N](https://cloud-native.slack.com/archives/C011GJDQS0N)  

让我们一起，为 LLM 插上云原生的翅膀，释放 AI 的全部潜能！