---
title: "Volcano 完成 2025 年度安全审计"
description: "Volcano 完成 2025 年度安全审计"
authors: ["adam-korczynski", "xavier-chang"]
date: 2025-05-30
tags: ["security", "audit", "volcano", "cncf"]
---

Volcano 很高兴地宣布，我们已完成了由 CNCF 资助的安全审计工作。此次审计由 [Ada Logics](https://adalogics.com/) 负责执行，[OSTIF](https://ostif.org/) 负责协调，并得到了 Volcano 维护者团队的通力协作。此次审计的范围涵盖了 Volcano 的源代码、供应链风险以及模糊测试（fuzzing）环节。审计团队共识别出 10 个安全问题，Volcano 安全团队已在审计工作结束的同时完成了对这些问题的修复。

<!-- truncate -->

Volcano 通过实施针对性的配置变更，解决了若干基础设施层面的安全问题；这些变更有效降低了风险，并提升了其默认部署环境下的整体安全态势。下文将详细列出每一个安全问题及其关联风险，并阐述 Volcano 采取的解决措施，同时展示由此带来的安全改进成果。

其中一个问题涉及多个 Volcano 组件在默认状态下以 root 权限运行。容器若以 root 权限运行，会带来较高的安全风险：一旦容器遭到入侵，攻击者便能获取到可用于进行权限提升的系统能力（capabilities）。Volcano 针对此问题进行了修复，将所有组件——包括调度器（scheduler）、准入控制器（admission controller）、各类控制器（controllers）以及仪表板（dashboard）——均配置为默认以非 root 权限运行。这一变更限制了攻击者在容器内部可执行的操作范围，有助于在安全事件发生时更有效地遏制其扩散。

另一个问题是 Volcano 的各类工作负载（workloads）中均未配置 seccomp 配置文件。若缺乏 seccomp 机制，容器将能够调用任意 Linux 系统调用，从而扩大了针对内核层面的攻击面，并增加了容器逃逸（container escapes）的风险。Volcano 通过引入 seccomp 配置文件解决了这一问题——具体而言，我们采用了 `RuntimeDefault` 模式，该模式将容器可调用的系统调用范围限制在一个安全的子集内。此举有效降低了内核的暴露风险，并强化了运行时的隔离安全性。

此外，Volcano 的容器环境中此前也未启用 SELinux 安全机制。SELinux 负责在内核层面实施访问控制，并对进程与文件、系统资源及其他进程之间的交互行为进行限制。目前，Volcano 已为其所有的 Pod 和容器全面启用了 SELinux 安全机制。此外，Volcano 此前曾为容器分配了不必要的 Linux Capabilities（能力集）——这是一种细粒度的权限控制机制，用于决定容器化进程能够执行的操作。例如，像 `CAP_NET_ADMIN` 或 `CAP_SYS_ADMIN` 这样的能力集赋予了进程极高的权限，而对于典型的应用程序逻辑而言，这些权限往往并非必需。Volcano 采取了风险缓解措施，通过“全部丢弃”（drop all）的策略移除所有非必要的能力集，仅在确有需要时才重新添加特定的权限。此举不仅缩小了系统的攻击面，还严格贯彻了“最小权限原则”。

在本次安全审计之前，Volcano 允许容器在运行时进行权限提升（Privilege Escalation），这意味着原本不具备特权的进程有可能借机获取额外的权限。这种权限提升行为会显著增加攻击者绕过容器安全防护机制的风险。Volcano 针对这一问题进行了修复，通过在容器和 Pod 的配置中将 `allowPrivilegeEscalation` 参数设置为 `false`，从而确保容器内的进程只能在其最初被分配的权限范围内运行。

上述变更有助于有效遏制潜在的攻击行为，减少攻击者利用权限提升或容器逃逸漏洞进行渗透的途径，进而全面提升系统在多租户及生产环境下的整体安全韧性。

在应用程序层面，审计人员共发现了 5 个安全隐患。其中最值得关注的一项漏洞在于：若攻击者成功攻陷了集群内的弹性服务（Elastic Service）或扩展插件（Extender Plugin），便可借此引发 Volcano 调度器的拒绝服务（Denial of Service）故障。该漏洞已被分配了 CVE 编号：CVE​​-2025-32777，其危害等级被定为“高危”（HIGH）。

## 模糊测试（Fuzzing）

在本次安全审计期间，Ada Logics 团队将 Volcano 项目接入了 [Google 的 OSS-Fuzz 项目](https://github.com/google/oss-fuzz/tree/master/projects/volcano)，并提交了首批两个模糊测试用例。OSS-Fuzz 是一个开源项目，旨在为各类关键性的开源软件项目提供集成式的模糊测试服务。Google 会利用其庞大的计算资源对已接入项目的模糊测试用例进行大规模运行，并通过电子邮件将发现的任何安全问题反馈给相应的项目开发团队。OSS-Fuzz 生成的报告内容详实，不仅包含完整的堆栈追踪信息（Stack Traces）和漏洞复现步骤，还会指明是哪一个模糊测试用例（Fuzz Harness）发现了该问题，以及其他相关细节。此外，OSS-Fuzz 系统会定期尝试对已报告的漏洞进行复现验证，以确认该漏洞是否依然存在。若系统无法成功复现该漏洞，OSS-Fuzz 便会自动将其标记为“已修复”状态。

## 参与 Volcano 社区

Volcano 是业界首款云原生批处理计算引擎，也是目前 CNCF（云原生计算基金会）旗下唯一的批处理计算项目。它作为一套 Kubernetes 原生的批处理调度系统运行，对标准的 kube-scheduler 进行了功能增强。Volcano 提供了全面的功能，用于管理和优化各类批处理及弹性工作负载，涵盖 AI/ML/DL、生物信息学/基因组学以及其他“大数据”应用场景。它与 Spark、Flink、Ray、TensorFlow、PyTorch、Argo、MindSpore、PaddlePaddle、Kubeflow、MPI、Horovod、MXNet 和 KubeGene 等各类框架实现了深度集成。凭借超过十五年的……