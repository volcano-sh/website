+++
title =  "科大讯飞凭借Volcano实现AI基础设施突破，赢得CNCF最终用户案例研究竞赛"
description = "科大讯飞凭借在 Volcano 上的创新应用，成功斩获 CNCF 最终用户案例研究竞赛大奖，并在 KubeCon + CloudNativeCon China 2025 大会上分享了其大规模 AI 模型训练的成功经验。"
subtitle = ""

date = 2025-06-13
lastmod = 2025-06-13
datemonth = "June"
dateyear = "2025"
dateday = 13

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["volcano"]

tags = ["News"]
summary = "科大讯飞凭借在 Volcano 上的创新应用，成功斩获 CNCF 最终用户案例研究竞赛大奖，并在 KubeCon + CloudNativeCon China 2025 大会上分享了其大规模 AI 模型训练的成功经验。"

# Add menu entry to sidebar.
linktitle = "科大讯飞凭借Volcano实现AI基础设施突破，赢得CNCF最终用户案例研究竞赛"
[menu.posts]
parent = "news"
weight = 6
+++

<div style="text-align: center;"> {{<figure library="1" src="./kubecon/iflytek.jpeg">}}
</div>

[ 中国，香港，2025年6月10日 ] 云原生计算基金会（CNCF）宣布，科大讯飞赢得 CNCF 最终用户案例研究竞赛。CNCF致力于构建可持续的云原生软件生态，科大讯飞凭借其在 Volcano 上的创新应用脱颖而出，获得本次殊荣，于6月10日至11日在香港举行的KubeCon + CloudNativeCon China 大会上，分享其大规模 AI 模型训练的成功经验。

### 科大讯飞的挑战

作为专注于语音和语言 AI 的中国科技公司，科大讯飞在业务快速增长过程中遇到了扩展难题。调度效率低导致 GPU 资源利用不足，工作流管理复杂，团队间资源争抢激烈，这些问题拖慢了研发进度，也给基础设施带来压力。

**使用 Volcano 后，科大讯飞实现了弹性调度、基于 DAG 的工作流和多租户隔离，简化了操作流程，显著提升了资源利用率。**

“在使用 Volcano 之前，跨团队协调大规模 GPU 集群训练就像不断‘灭火’，资源瓶颈、任务失败和复杂的训练管道调试层出不穷，”**科大讯飞高级平台架构师 DongJiang** 表示。“Volcano 让我们拥有更灵活的控制权，能够高效可靠地扩展 AI 训练。CNCF 对我们的认可令我们倍感荣幸，我们也很期待在 KubeCon + CloudNativeCon China 现场与更多同行分享我们的实践经验。”


### 关于 Volcano

Volcano 是基于 Kubernetes 构建的云原生批处理系统，专为 AI/机器学习训练、大数据处理和科学计算等高性能工作负载设计。它提供先进的调度功能，如任务编排、资源公平分配和队列管理，能够高效管理大规模分布式任务。自 2020 年加入 CNCF Sandbox 项目，2022 年晋升为 Incubating 阶段项目，Volcano 已成为处理计算密集型任务的关键工具。

### Volcano 为科大讯飞带来的显著成效

随着 AI 需求不断增长，科大讯飞选择 Volcano 来应对训练基础设施日益复杂和庞大的挑战。工程团队需要更高效的资源分配方案，管理多阶段复杂训练工作流，减少任务中断，并保障不同团队的公平资源使用。**借助 Volcano，他们实现了：**

* **GPU 利用率提升 40%**，显著降低基础设施成本和计算资源闲置。
* **任务失败恢复速度提升 70%**，确保训练过程不中断。
* **资源干扰率降低 50 %**，保障业务稳定性和资源使用灵活性

**CNCF 首席技术官 Chris Aniszczyk** 表示：“科大讯飞的案例展示了开源技术如何解决复杂且关键的规模化挑战。通过 Volcano 提升 GPU 效率和优化训练工作流，他们降低了成本，加快了开发，并在 Kubernetes 平台上构建了更可靠的 AI 基础设施，这对所有致力于 AI 领先的组织都至关重要。”

随着 AI 工作负载变得更加复杂和资源密集，科大讯飞的实践证明，Volcano 等云原生工具能够帮助团队简化运营、提升扩展能力。其在 KubeCon + CloudNativeCon China 的分享[1]，带来如何在 Kubernetes 环境下更有效管理分布式训练的实用经验。

### 参考资料

[1] 分享: [https://kccncchn2025.sched.com/event/23EWS?iframe=no](https://kccncchn2025.sched.com/event/23EWS?iframe=no)