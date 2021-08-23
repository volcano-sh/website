+++
title = "基于Volcano的锐天离线高性能计算最佳实践"
description = "深入介绍Volcano在金融领域的应用实践案例"
subtitle = ""

date = 2021-01-05
lastmod = 2021-08-23
datemonth = "Dec"
dateyear = "2020"
dateday = 23

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["程运之/锐天投资技术总监", "徐征宇/锐天投资研发工程师"]

tags = ["Practice"]
summary = "深入介绍Volcano在金融领域的应用实践案例"

# Add menu entry to sidebar.
linktitle = "基于Volcano的锐天离线高性能计算最佳实践"
[menu.posts]
parent = "tutorials"
weight = 5
+++

>本文2021年1月5日首发于容器魔方微信公众号，原文链接[基于Volcano的锐天离线高性能计算最佳实践](https://mp.weixin.qq.com/s/FDYExtj93lCrXmiFRozBPA)  

Volcano是一个基于Kubernetes的云原生批量计算平台，也是CNCF的首个批量计算项目。

Volcano 主要用于AI、大数据、基因、渲染等诸多高性能计算场景，对主流通用计算框架均有很好的支持。它提供高性能计算任务调度，异构设备管理，任务运行时管理等能力，目前在很多领域都已落地应用。__本篇文章以锐天投资基于Volcano进行的离线高性能计算最佳实践为线索，深度解读Volcano在金融领域技术架构中的定制与应用。__


## Ruitian离线计算集群简介

锐天投资是一家私募量化基金公司，公司致力于通过多元的程序化交易策略，帮助客户实现资金的增值。锐天的离线计算集群是一个面向策略开发、研究大数据处理任务的集群。集群通过对海量数据进行分析研究，得出优秀的量化模型，用于股票及期货交易。  



在锐天成立初期，我们使用业界成熟的 Yarn 调度批处理作业，并使用 Ceph 存储海量数据。随着公司规模的扩大，策略人员使用的环境不断变化，对于不同研究环境的需求促使我们开始调研容器技术来实现多环境研究的问题。 



随着近几年 Kubernetes 的成熟稳定，在计算集群中使用容器技术已经几乎等同于使用Kubernetes。__但原生的Kubernetes调度器并未提供批处理任务的调度能力，即：__

- 支持在一个Job中运行多个Pod

- 支持Job指定到不同的队列，用队列进行公平调度

- 支持一定程度的Gang Scheduling

- 支持指定在多少个pod成功的情况下，任务就被算作成功

- 支持DRF算法



在调研期间，我们发现了Volcano 项目。在满足我们需求的同时，__它提供了丰富的调度策略与Job控制能力。__ 其简洁的结构成为了我们决定从Yarn迁移到Kubernetes的最后一块拼图。



## 迁移至Volcano

由于集群用户主要为策略研究人员，他们对Kubernetes缺乏了解。我们希望将Kubernetes的相关细节对外封装，于是开发了一个 Jobctl 作为提交工具，来生成Volcano的Job模板。

### Volcano任务模板

__方案1：一个作业多个任务__

```
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
    name: awesome-job
spec:
    minAvailable: 1
    tasks:
    - name: simulation1
        replicas: 1
        template:
            spec:
                restartPolicy: Never
                containers:
                - name: worker
                    image: rt-python:latest
          resources:
            requests:
              cpu: 1
              memory: 1Gi
            limits:
              cpu: 1
              memory: 1Gi
                args:
                - bash
                - -c
                - |-
                    python run.py --pickle-file /data/simulation/1.pickle
    - name: simulation2
        replicas: 1
        template:
            spec:
                restartPolicy: Never
                containers:
                - name: worker
                    image: rt-python:latest
          resources:
            requests:
              cpu: 1
              memory: 1Gi
            limits:
              cpu: 1
              memory: 1Gi
                args:
                - bash
                - -c
                - |-
                    python run.py --pickle-file /data/simulation/2.pickle
    - name: simulation3
        replicas: 1
        template:
            spec:
                restartPolicy: Never
                containers:
                - name: worker
                    image: rt-python:latest
          resources:
            requests:
              cpu: 1
              memory: 1Gi
            limits:
              cpu: 1
              memory: 1Gi
                args:
                - bash
                - -c
                - |-
                    python run.py --pickle-file /data/simulation/3.pickle
```  

这个方式可以针对不同的Pod设置不同的参数，并且可以对不同的pod使用不同的镜像，让它们各自负责不同的子任务类型，非常灵活。



由于在大部分情况下，不同的子任务通常负责不同的时间段，互相之间独立没有依赖，通过将 minAvaliable 设置为 1 可以让Pod全部参与调度的同时，Job处于Running状态，便于管理。但是在试运行期间，我们发现有的任务无法提交。排查后发现，有些研究人员的任务并发Pod数量巨大，超过5000。生成出的yaml的大小超过了1.5MiB，已经超出了etcd的默认最大请求大小，因此当任务数量过大时会导致无法提交作业。 



考虑到集群Job、Pod数量众多，etcd的原有压力已经很大，我们没有简单的改变默认最大请求大小，而是换了一种思路。





__方案2：一个作业一个任务多个副本__



由于在大多数情况下，作业里的所有任务仅仅是参数不一致，因此可借助任务的多副本功能，每个任务根据自己副本的id加载对应的参数文件即可，这样就解决了etcd的请求大小限制。

```
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
    name: awesome-job
spec:
    minAvailable: 1
    tasks:
    - name: simulation
        replicas: 10
        template:
            spec:
                restartPolicy: Never
                containers:
                - name: worker
                    image: rt-python:latest
          resources:
            requests:
              cpu: 1
              memory: 1Gi
            limits:
              cpu: 1
              memory: 1Gi
                args:
                - bash
                - -c
                - |-
                    python -u call_module_func.py --pickle-file /data/simulation/<work-id>.pickle module.submodule magic_function
```  

call_module_func.py 是一个引导脚本，通过 configmap 挂载进容器，负责以下工作：

- 将 <work-id> 转换成 replicas 当前的 id 号（通过获取容器内的 host 名后缀编号获取，如 host名为 awesome-job-awesome-job-1 ，id 号即为 1）

- 加载 pickle （通过 pvc 挂载进容器） 参数，传递给模块 module.submodule 里的函数 magic_function 运行。


### Volcano定制  
__minSuccess特性：__

我们的大部分任务并不需要Gang Scheduler特性，但是我们需要在所有的子任务成功的情况下，才能够认为整个任务成功。



在这种情况下，minAvailable 这个参数就不能很好的符合我们的需求，于是我们增加了 minSuccess 参数，将判断任务成功的逻辑从minAvailable中解耦合。

```
minSuccess := ps.job.Job.Spec.MinSuccess
if minSuccess == 0 {
    minSuccess = jobReplicas
}

if status.Succeeded >= minSuccess {
    status.State.Phase = vcbatch.Completed
    return true
}

if status.Succeeded+status.Failed == jobReplicas {
    if status.Failed != 0 {
        status.State.Phase = vcbatch.Failed
    } else {
        status.State.Phase = vcbatch.Completed
    }
    return true
}
```   

__autoMemoryScale特性:__



使用Volcano提交任务需要指定申请的cpu和memory，而我们的大部分策略人员无法对自己的程序有很好的内存估计。于是我们定制了 autoMemoryScale 功能，监控OOM事件。



如果程序是由于OOM退出的，它将自动扩充内存，重新调度，从而减少策略人员试错参与。


```
for i := 0; i< int(ts.Replicas); i++ {
    podName := fmt.Sprintf(jobhelpers.PodNameFmt, job.Name, name, i)
    if pod, found := pods[pdName]; found {
        if len(pod.Status.ContainerStatuses) == 0 {
            continue
         }
         
         reason := pod.Status.ContainerStatuses[0].State.Terminated.Reason
         
         if reason == "OOMKilled" {
             podToScaleUp = append(podToScaleUp, pod)
             jobResources := ts.Template.Spec.Containers[0].Resources
             podResources := pod.Spec.Containers[0].Resources
             
             jobReqMem, _ := jobResources.Requests[v1.ResourceMemory]
             podReqMem, _ := podResources.Requests[v1.ResourceMemory]
             
             if podReqMem.Value() >= jobReqMem.Value() {
                 scaleUpResource(jobResources.Requests, job.Spec.ScaleUpJobResourceRate)
                 scaleUpResource(jobResources.Limits, job.Spec.ScaleUpJobResourceRate)
                 ts.Template.Spec.Containers[0].Resources = jobResources
                 job.Spec.Task[taskId] = ts
             }
         }
     }
 }
```  

__nodeZone特性:__

在原先Yarn的集群中，我们通过分Partition可以强行预留一部分机器给紧急任务使用。同样的特性我们需要迁移到Kubernetes也具备。



开始我们的方案是创建一个单独的 daily 队列，且该队列的权重相对较小。此外我们划分了某些节点，专门给该队列运行，而且指定 daily 队列的任务需使用 nodelSelector 来选择这些节点。



但随后我们发现当集群负载高的情况下，daily 队列能划分到的资源无法完全使用。我们分析发现了如下原因：



假如有三个队列:

```
name  weight
Q1    45
Q2    45
daily 10
```  

集群整体资源100CPU，100Gi，划分了20CPU，20GiB给 daily 队列。当各个队列高负载的情况下，daily队列由于公平性只能获取10CPU和10Gi资源，即使使用了nodeSelector 也没有办法满足我们的需求。



我们的解决方案是让调度器支持 node-selector（即node-zone），调度器只需负责匹配的节点，且去除掉了daily队列。当某个调度器上的各个队列很满的情况下，并不会影响队列在另一空闲调度器上的资源公平性划分，即如果该空闲调度器仅运行有一个队列，该队列就可以申请使用全部的资源。



对于不同特性的任务，用户需要选择的是不同的 调度器 而非某个特殊的 队列，避免了由于公平性导致的资源使用不充足情形的发生。 



于是在 Volcano 中我们实现了选择特定label机器的特性，由多个scheduler实例来负责对多个node节点域进行调度。

```
sc.nodeInformer.Informer().AddEventHandlerWithResyncPeriod(
    cache.FilteringResourceEventHandler {
        FilterFunc: func(obj interface{}) bool {
            switch v := obj.(type) {
            case *v1.Node:
                nodeZone := v.Labels["node-zone"]
                return nodeZone == sc.nodeZone
            default:
                return false
            }
        },
        Handler: cache.ResourceEventHandlerFuncs {
            AddFunc:   sc.AddNode,
            UpdateFunc: sc.UpdateNode,
            DeleteFunc: sc.DeleteNode,
        },
    },
    0,
)
```  

### Volcano 监控  
由于当前Volcano社区提供的监控更多是调度性能指标，我们根据自身需求采集了一些额外的指标，并编写了一个简单的export server提供给我们的监控系统。



- volcano 生成的 Pod 是不带有队列标签的，这就导致了队列资源的搜集变得困难，因此我们特意对每个 task 添加了队列的标签



- 输出队列 Capability



- 输出 Job 的开始和完成时间



有了这些额外指标，就可在 Grafana上构建出集群整体资源、队列资源、节点资源、用户作业的进度等相关的监控信息，实时了解到集群的使用率，也方便问题的排查，尤其为何作业处于Pending状态（可能队列/集群资源申请满了，每个节点剩余资源均不够单个任务申请）。





{{<figure library="1" src="ruitian2.png">}}  

{{<figure library="1" src="ruitian3.png">}}   


### WatchDog


对于Volcano资源相关的一些自动化任务，我们编写了一个名为 WatchDog 的组件，从外部进行自动化运维。



__队列 Capability 自动更新：__ Capability是每个队列的资源使用上限，对其维护是一件繁琐的事情，每次新增节点或移除节点均需对其作出调整，所以在WatchDog中，监听节点资源信息，根据队列的百分比配置，动态的更新其 Capability



__任务状态自动报警：__ 当任务完成或失败时，通知用户，便于及时了解到任务运行的状态。



__任务资源利用率通知：__ 在任务状态报警中，通过从监控系统获取任务申请和实际使用资源量，告知用户，便于其调整申请资源，使集群资源利用率提升。  

## 总结  

Volcano 是我们迁移至 Kubernetes 过程中至关重要的组件，其简洁清晰的设计，让我们能非常方便的自己定制化调度行为。



__截至目前，Volcano已在锐天生产环境稳定运行半年以上，峰值可调度作业10万+/天。__ 我们也时刻关注着社区的动态，积极参与项目的开发与设计，同时希望能有更多开源作者能加入到 Volcano 社区的建设中来，让 Volcano 能更加灵活、高效、智能的处理各种复杂作业场景。


>公司简介：上海锐天投资公司成立于2013年，是一家重视科学研究和技术积累的量化基金公司。公司拥有业内领先的策略研发和回测平台，数百台高性能服务器组成的自建集群。创始人在全球顶级对冲基金取得相当成绩后归国创业。截至2019年一季度，锐天已跻身国内量化交易领域第一梯队，管理规模逾百亿人民币，管理基金90多支。公司官网：https://www.ruitiancapital.com/ 

