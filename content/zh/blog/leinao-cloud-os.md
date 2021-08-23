+++
title =  "Volcano在中科类脑云OS中的落地实践"
description = "深入介绍Volcano在中科类脑云OS落地实践过程中遇到的挑战和解决方案"
subtitle = ""

date = 2020-12-24
lastmod = 2021-08-23
datemonth = "Dec"
dateyear = "2020"
dateday = 23

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["朱建/中科类脑平台事业部高级系统架构师"]

tags = ["Practice"]
summary = "深入介绍Volcano在中科类脑云OS落地实践过程中遇到的挑战和解决方案"

# Add menu entry to sidebar.
linktitle = "Volcano在中科类脑云OS中的落地实践"
[menu.posts]
parent = "tutorials"
weight = 3
+++

>本文2020年12月24日首发于容器魔方微信公众号，原文链接[Volcano在中科类脑云OS中的落地实践](https://mp.weixin.qq.com/s/HS6RzzqztBJsHQX7P5T5ww)  

## 类脑AI云平台介绍

AI开发平台 ：面向AI科研人员，提供不同领域不同应用场景相匹配的全流程技术支撑和解决方案

公共服务平台：面向政府和社会人员，提供人工智能相关的新闻咨询、运营内容等支撑

AI可视化平台：面向管理人员，提供统一的运营数据可视化展示，运筹帷幄

AI社区：面向AI开发者和相关企业的社区平台，提供AI交流、问答、培训服务

 

## 类脑云OS架构

{{<figure library="1" src="leinao-1.png" title="类脑云os基础架构">}}



在OS架构中，最底层为硬件平台，硬件平台之上为引擎层。引擎层主要包括调度引擎和数据引擎两部分，提供任务调度和数据管理能力。  

引擎层之上为计算层，它提供一系列面向通用场景创建分布式训练任务的接口。  

应用层由面向业务的一系列业务系统组成，如模型管理系统、资源管理系统、运维监控系统等。  


## 为什么选择volcano？

在搭建类脑云OS 2.0时，我们尝试寻找一款生态环境比较好的调度引擎。经过一系列的调研，我们发现Volcano的分布式训练任务重试机制是基于失败场景的，而我们原有的任务重试机制是基于失败次数的；其次，**Volcano对深度学习框架的支持比较友好**；此外，**Volcano有大量高级调度策略** 。  

另外，我们发现K8s默认的调度机制对批量调度的支持并不友好。Hadoop虽然支持批量任务，但是它的架构比较笨重。因此，基于上面几点我们最终选择了Volcano。  

{{<figure library="1" src="leinao-2.png">}}  

{{<figure library="1" src="leinao-3.png">}}   


由于在决定引入Volcano调度服务时，我们系统已经完成开发，如何在现有系统里引入Volcano呢？如果直接引入会导致系统计算层和应用层修改较大。  


 另外，我们在引入前也对Volcano需求进行了分析，发现单机任务和分布式训练任务上Volcano已经支持，但是对调试任务、调试工具集需要做一系列定制开发，所以需要引入一个组件job-server做接口的适配和类似调试工具集的集成开发。

{{<figure library="1" src="leinao-4.png">}}  

在确定使用Volcano和通过 job server去做任务适配后，我们梳理了Volcano的场景，发现上层的业务是需要知道task详细的运行信息、状态变化信息、历史信息，而Volcano Job可以提供job的运行状态信息，但暂未提供task运行相关信息。

 

因此我们就面临一个问题：**去定制修改Volcano还是实现Volcano task监控？**当时发现Volcano对新功能的版本迭代是非常快的，如果去做深度的修改，这种源码会给后续版本的升级带来很大的困难。并且我们也希望这个版本随着Volcano升级功能的增强，和它版本迭代一起往上升级，所以我们采用了第二种方案，去监控Volcano task的一些运行状态信息。

 

下图是一个简单的监控机制，通过Watch的方式去监控API Server里job相关信息的变化和Pod相关信息的变化。

{{<figure library="1" src="leinao-5.png">}}  



## 实践思路

__场景__


- 创建批量任务

- 批量任务需要具备jupyter lab、tensorboard、code-server、wetty等调试工具集

- 批量任务支持数据存储集优化策略

- 支持训练、量化和模型转换  
  

基于上面的场景，我们做如下的设计：

{{<figure library="1" src="leinao-6.png">}}  

{{<figure library="1" src="leinao-7.png">}}



#### 任务的清理

__场景__

- Job运行完成后，清理任务

- 清理该Job附加的能力（jupyter、code-server）

**1）当Job结束时，volcano可以自动清理**

{{<figure library="1" src="leinao-8.png">}}  

**2）清理能力相关资源（pod、service、ingress）**

{{<figure library="1" src="leinao-9.png">}}    

{{<figure library="1" src="leinao-10.png">}}  

 


#### 任务重试

我们1.0版本设计的初衷是基于次数进行限制，但是后来发现Volcano基于事件触发的机制更加灵活，业务场景也更加合理。因此我们在任务重试方面进行了原有方案的一系列改动，直接采用Volcano的任务重试机制。

{{<figure library="1" src="leinao-11.png">}}  

{{<figure library="1" src="leinao-12.png">}}  

- TaskRole中的策略优先级高于Job中的重试策略

- 重试策略中包含Event和Action，Event表示触发条件，

- Action表示条件满足后执行的动作

- maxRetry限定最大重试次数


在实现以上特性的过程中，我们得到了Volcano社区的大力支持。当时遇到的一个问题是RestartTask失效，在当天遇到这个问题时反馈给了社区，当天就得到了解决，这个响应速度是非常快的。

{{<figure library="1" src="leinao-13.png">}}
  

## 后期计划

在拓扑调度、基于单机多卡如何选择最好的GPU拓扑结构进行调度这两方面，希望社区能够给予更好的支持。也希望我们和社区共同努力，深化双方在技术、运营等方面的合作，使得社区生态更加繁荣！ 

 