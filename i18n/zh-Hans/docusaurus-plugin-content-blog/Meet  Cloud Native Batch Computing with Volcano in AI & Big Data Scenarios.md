---
title: "Volcano 在 AI 和大数据场景下的云原生批量计算实践"
description: "Volcano 参加 KubeCon + CloudNativeCon Europe 2024！"
authors: ["volcano"]
date: 2024-03-08
tags: ["kubecon", "batch-computing", "ai", "big-data", "volcano"]
---

云原生批量计算引擎 Volcano 专为 AI、大数据、基因测序、渲染等高性能计算应用场景而设计，并支持各类主流的通用计算框架。目前，全球已有超过 58,000 名开发者加入了 Volcano 社区，其中核心贡献者来自华为、AWS、百度、腾讯、京东、小红书等知名企业。该项目在 GitHub 上已获得超过 3700 个 Star 和 800 多个 Fork。Volcano 已被证实能够胜任 AI、大数据、基因测序等领域的海量数据计算与分析任务。其支持的计算框架涵盖 Spark、Flink、TensorFlow、PyTorch、Argo、MindSpore、PaddlePaddle、Kubeflow、MPI、Horovod、MXNet、KubeGene 以及 Ray。随着越来越多的开发者和应用案例涌现，Volcano 的生态系统正呈现出蓬勃发展的态势。
![](/img/blog/volcano_logo.svg)

{/* truncate */}

作为业界首个云原生批量计算项目，Volcano 于 2019 年 6 月在 KubeCon 上海峰会上正式开源，并于 2020 年 4 月正式成为 CNCF（云原生计算基金会）的官方项目。2022 年 4 月，Volcano 成功晋级为 CNCF 孵化项目。截至目前，全球已有超过 600 名开发者为该项目提交了代码。Volcano 社区正日益受到开发者、合作伙伴及用户的广泛关注与青睐。 ### 体验 Volcano v1.8.2 的新特性

在 Volcano 的最新版本 v1.8.2 中，新增了以下特性：

- **支持 vGPU 调度与隔离**

- **支持 vGPU 及用户自定义资源的抢占能力**

- **新增 JobFlow 工作流调度引擎**

- **支持针对多种监控系统的节点负载感知调度与重调度**

- **优化 Volcano 的微服务调度能力**

- **优化 Volcano Chart 包的发布与归档流程**

立即体验 Volcano v1.8.2：https://github.com/volcano-sh/volcano/releases/tag/v1.8.2

### 加入 Volcano 社区共建计划
近期，已有超过 50 个与 Volcano 相关的应用案例落地实施。这些案例广泛分布于互联网、先进制造、金融、生命科学、科学研究、自动驾驶及医药等行业。它们涵盖了 AI、大数据、基因测序、渲染等海量数据计算与分析场景。主要用户包括腾讯、亚马逊、ING 银行、百度、小红书、滴滴、360、爱奇艺、乐脑、鹏城实验室、Cruise、理想汽车、云知声、喜马拉雅、唯品会、GrandOmics、BOSS 直聘等。随着 Volcano 生态系统的不断壮大，越来越多的用户表现出极高的意愿加入社区。

Volcano 社区正式启动了“社区共建计划”，旨在欢迎更多用户融入 Volcano 社区，加速云原生技术的演进，并确保 Volcano 生态系统的多元化发展。

通过参与该计划，您将有机会获得技术指导、推广支持，以及参与线上和线下的技术分享活动。如果您的公司或组织认可 Volcano 所能创造的价值，希望在使用 Volcano 方面获得协助，或者希望发挥自身的技术影响力，欢迎考虑加入此项计划。
有关参与要求与权益的详细信息，请参阅：https://github.com/volcano-sh/community/blob/master/community-building-program.md

### 3月19日至22日，相约巴黎 KubeCon + CloudNativeCon Europe 大会，与 Volcano 共同交流！ ![](/img/blog/2024-paris.png)
Volcano 将参与多项活动，具体包括：

- 演讲日程
- 3月19日 14:05 - 14:30（CET）：7.3层 | S03会议室
Volcano 维护者 Kevin Wang（华为）将发表题为《利用 Karmada 与 Volcano 实现高效的多集群 GPU 工作负载管理》的演讲。 
- 3月22日 11:55 - 12:30（CET）：7号馆 | 7.3层 | N03会议室
Volcano 维护者 William Wang（华为）与 Mengxuan Li（第四范式）将发表题为《基于 Volcano 的云原生批处理计算：最新进展与未来展望》的演讲。 
- 3月22日 16:00 - 16:35（CET）：7号馆 | 7.3层 | Paris 会议室
Volcano 维护者 William Wang 与 Hongcai Ren（华为）将发表题为《最大化多集群 GPU 利用率：云原生 AI 平台的挑战与解决方案》的演讲。
- 展台开放时间：
- 3月20日至22日 下午时段（周三、周四、周五）：欢迎莅临 KubeCon + CloudNativeCon Europe 大会现场的 CNCF 项目展区 PP18-B 展台，与专家交流或观看演示！