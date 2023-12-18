+++
title =  "Volcano 社区共建计划"
description = "华为云携手11家合作伙伴启动Volcano社区共建计划"
subtitle = ""

date = 2023-08-11
lastmod = 2023-08-11
datemonth = "Aug"
dateyear = "2023"
dateday = 11

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["volcano"]

tags = ["Tutorials"]
summary = "华为云携手11家合作伙伴启动Volcano社区共建计划"

# Add menu entry to sidebar.
linktitle = "华为云携手11家合作伙伴启动Volcano社区共建计划"
[menu.posts]
parent = "tutorials"
weight = 6
+++

<font face="宋体" size=4>    随着人工智能技术的高速发展，以及大语言模型的推广应用，各行各业对智能算力的需求呈爆发式增长，除了AI芯片等硬件设备的支持，对于AI任务的高性能智能调度也是重中之重。</font>

{{<figure library="1" src="volcano_logo.png" width="50%">}}



<font face="宋体" size=4>
Volcano是业界首个云原生批量计算项目，2019年由华为云捐献给云原生计算基金会（CNCF），也是CNCF首个和唯一的孵化级容器批量计算项目。主要包含以下能力：
    
- 面向人工智能、大数据、HPC场景提供统一的高性能作业管理，支持丰富的高阶调度策略，包括在离线统一调度、AI弹性训练调度、SLA、作业拓扑、Fairness、负载感知、重调度、抢占、回收等；
- 对Spark、Flink、Pytorch、MPI、TensorFlow等工作负载实现统一生命周期管理，作业依赖、作业内任务依赖管理；
- 在细粒度资源管理方面，Volcano支持min-max队列资源管理，提供队列资源预留、多租户资源租借/抢占的动态资源共享等能力；
- 在异构资源管理方面，Volcano实现 x86、Arm、GPU、昇腾、昆仑等多元算力的统一调度，并提供CPU/GPU资源的精细化调度能力，用户可根据业务需求灵活搭配资源，实现最高性价比。

Volcano目前已吸引 **5.8万+全球开发者**，并获得 **3.2k Star** 和 **730+ Fork**，参与贡献企业包括华为、AWS、IBM、百度、腾讯、京东、小红书、第四范式、博云、DaoCloud、锐天投资、七牛云、银清科技、字节跳动、快手、云知声、Infosys、Visa、网易、Red Hat、金山云、浪潮、中兴、Oracle、爱奇艺等。

Volcano已实现 **50+生产落地案例**，广泛分布于互联网、先进制造、金融、生命科学、科研、自动驾驶、医药等行业，覆盖人工智能、大数据、基因测序、渲染等海量数据计算和分析场景。主要用户包括：腾讯、亚马逊、荷兰ING银行、百度、小红书、滴滴、360、爱奇艺、中科类脑、鹏程实验室、Curise、理想汽车、云知声、喜马拉雅、唯品会、希望组、BOSS直聘等，**随着Volcano社区的生态圈不断扩大，越来越多的用户表达了加入社区的强烈意愿**，为帮助用户快速融入社区，加速落地实践，共同打造繁荣的社区生态，</font> <font face="宋体" size=4 color=red>**华为云携手11家合作伙伴启动Volcano社区共建计划**</font>。

<font face="宋体" size=4>
**华为云开源业务总经理邓明昆表示：** “云原生批量计算项目Volcano自2019年6月开源以来，在人工智能、大数据、基因测序、渲染、转码、音视频、金融等领域得到越来越广泛的应用，一批行业标杆用户不仅积极地推动Volcano落地生产环境，也基于自身实践反哺社区，华为云希望携手合作伙伴启动Volcano社区共建计划，共同打造繁荣的社区生态，帮助更多企业加速云原生的进程。”

**首批加入的合作伙伴有：百度、博云、第四范式、唯品会、锐天投资、中科类脑、品览、360、网易数帆、喜马拉雅、BOSS直聘**

<center> {{<figure library="1" src="./Volcano community co-construction program/co-construction-1.jpg">}}</center>
 
 
**百度飞浆开源技术生态负责人 周倜表示：** “为了提升飞桨框架的计算效率，飞桨团队和Volcano团队联合发布PaddlePaddle on Volcano方案。作为一个面向高性能计算场景的平台，Volcano弥补了Kubernetes 在机器学习、深度学习、HPC、大数据计算等场景下的基本能力缺失，并在原有Kubernetes能力基础上对计算任务的批量创建及生命周期管理、Fair-share调度等方面做了增强，从而满足飞桨对资源创建，资源调度的基本要求。”
 
 
**博云PAAS产品线总经理 赵安全表示：** “博云高性能算力解决方案为多个客户提供了运行 AI、big data、仿真计算等应用的高并发计算基础平台，切实解决了众多行业痛点，方案支持的CNCF Volcano调度引擎得到了众多客户的认可。秉持“取之于社区，回馈于社区”的理念，我们将行业首个用于高性能算力的作业编排组件JobFlow捐献给 Volcano 社区，便于用户更好地应用云原生技术。”
 
 
**第四范式异构算力虚拟化负责人 李孟轩表示：** “Volcano项目使得我们能以较低的成本解决AI项目在云原生落地的过程中遇到的痛点，尤其是在设备复用领域，使用Volcano将会为集群资源使用率带来显著的提升。第四范式将持续的为volcano项目贡献代码，目的是将volcano打造成一个支持所有主流异构算力（NPU，GPU，MLU，DCU等）的复用平台。
 
 
**唯品会AI云平台负责人 何颖鹏表示：** “作为国内TOP级的电商平台，随着业务发展，唯品会面临业务体量快速增长、产品快速迭代、产品模式多样化等问题。通过构建基于Volcano的AI训练平台，结合queue动态资源共享、gang-scheduling等Volcano提供的高阶调度能力，可支持系统10多万核的节点调度，加速了业务创新步伐。”
 
 
**中科类脑研发中心负责人 常峰表示：** “Volcano是最早针对批量计算场景开源的云原生项目之一，其动态可配的高级调度策略和优秀的资源管理能力解决了AI场景下作业调度、生命周期管理、异构硬件支持等多个问题。在落地实践的过程中，我们基于Volcano的能力做扩展，有效提升了系统稳定性和资源利用效率。”
 
 
**品览联合创始人&CTO 彭靖田表示：** “CNCF Volcano 项目成功应用于品览的 云原生智能建筑设计产品：筑绘通AlphaDraw。在CAD二维图纸的AI识图翻模和三维建筑模型的智能设计等业务场景中，Volcano为AlphaDraw的算法服务提供了批处理和弹性伸缩负载的能力，大幅提升了Kubernetes集群资源利用率，同时优化了工作负载性能。作为Volcano社区共建计划的首批成员，品览会将 Cloud+AI 在建筑设计领域的最佳实践，持续贡献给开源社区。期待AlphaDraw与Volcano项目共同成长，未来不断为智能云计算和产业云落地提供更多优秀的产品和解决方案。”
 
 
**网易数帆云原生技术专家 王新勇表示：** “Volcano为Kubernetes的原生能力提供了许多有益的补充，使其能够更好地编排AI训练、大数据计算等批处理任务。Volcano良好的任务抽象和管理能力，多种场景化的调度机制支持，以及与多种常见的开源计算框架集成，开箱即用，使我们能够更加专注于为用户提供业务价值，而无需花费大量精力去重复造轮子。”
 
 
**锐天投资基础架构团队负责人表示：** “Volcano补全了原生Kubernetes批处理任务调度、资源共享、公平调度策略等能力，并提供统一的接口降低学习和维护成本。在生产环境中，Volcano配合我们自研的二级调度，实现了每日数万任务的需求，大大提升了策略研究的效率。”

 
 
**360容器团队负责人表示：** “Volcano弥补了Kubernetes原生调度在机器学习，大数据计算任务上的能力缺失，丰富的调度插件，以解决不同场景下的任务调度，极大提升集群整体利用率。且支持大部分主流的计算框架，诸如Spark,Tensorflow,Flink等。整体设计遵循Kubernetes的设计理念和风格，降低学习成本。”
 
 
**喜马拉雅AI云团队负责人表示：** “Volcano补全了原生Kubernetes批处理任务调度、资源共享、公平调度策略等能力，并提供弹性调度能力。在生产环境中，作为机器学习平台资源调度的基础组件，提升了GPU利用率。”
 
 
**BOSS直聘AI基础平台团队负责人表示：** “BOSS直聘基于Volcano在AI、大数据计算等场景构建基础设施，其强大的批处理能力和丰富的调度策略，为我们支撑复杂业务场景提供了极大的便利，大幅提升集群资源利用率和稳定性。在其丰富的生态和广泛的社区的支持下，为我们的技术和业务发展提供了极大的帮助。”




我们期待着与更多的组织共建Volcano社区的繁荣！</font>
<center>
    <font face="宋体" size=5 color=red>**Volcano社区共建计划介绍** </font>
</center>

<font face="宋体" size=4>
为帮助用户快速融入社区，加速落地实践，共同打造繁荣的社区生态，Volcano社区现推出Volcano社区共建计划。

通过Volcano社区共建计划，你将获得技术指导、宣传推广等支持，线上/线下技术布道分享等机会！如果你的公司、组织认可Volcano的技术路线，希望在使用Volcano的过程中获得帮助，并有意和Volcano社区共建技术影响力，请考虑加入该计划。

关于加入该计划的要求与权益详情，请参考：https://github.com/volcano-sh/community/blob/master/community-building-program.md
</font>

## 申请流程
- 扫描二维码或点击阅读全文填写申请表单

<center> {{<figure library="1" src="./Volcano community co-construction program/co-construction-2.jpg">}}</center>

- 结果将通过邮件通知，请耐心等待
 
 
<font face="宋体" size=4> **任何疑问和问题，请联系Volcano社区 Maintainer: wang.platform@gmail.com** </font>



