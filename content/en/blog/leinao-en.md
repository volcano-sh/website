+++
title = "Integrating Volcano into the Leinao Cloud OS"
description = "Deep introduction about the challenges and solutions faced by Volcano integration with Leinao Cloud OS"
subtitle = ""

date = 2020-12-24
lastmod = 2021-08-23
datemonth = "Dec"
dateyear = "2020"
dateday = 23

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["Jian Zhu/Senior Architect in Leinao OS"]

tags = ["Practice"]
summary = "Deep introduction about the challenges and solutions faced by Volcano integration with Leinao Cloud OS"

# Add menu entry to sidebar.
linktitle = "Integrating Volcano into the Leinao Cloud OS"
[menu.posts]
parent = "tutorials"
weight = 3
+++

>This article was firstly released at `Container Cube` on December 24th, 2020, refer to [Volcano在中科类脑云OS中的落地实践](https://mp.weixin.qq.com/s/HS6RzzqztBJsHQX7P5T5ww)
 

## Introduction to the Leinao cloud AI platform  

The Leinao cloud AI platform includes an AI development platform, public service platform, AI visualized operations platform, and an AI community. 
- The AI development platform provides end-to-end technical support and solutions for AI researchers in a diverse range of business scenarios. 
  
- The public service platform provides news and insight into AI for institutions and for the general public. 
  
- The AI visualized operations platform helps managers make better informed decisions. 
  
- The AI community is where AI developers and companies gather, exchange ideas, and improve their skills.

 

## The architecture of Leinao cloud OS


{{<figure library="1" src="leinao-en1.png">}}  



In the Leinao OS, the hardware platforms sit at the bottom of the architecture. On top of them are the job scheduling and data engines. 

The computing layer, the next layer up, is composed of a set of APIs used to create general distributed training jobs. 

Finally, on the top, is the application layer, which consists of various service systems, such as the model training, resource management, and O&M monitoring systems.  


## Why Volcano?

The Kubernetes default-scheduler does not work well for batch scheduling, and batch scheduling is critical to AI and big data services. Therefore, when we were building Leinao cloud OS 2.0, we decided to replace the default-scheduler with a scheduling engine that can better serve AI and big data scenarios. Volcano has diverse advanced scheduling policies and can easily connect to mainstream computing frameworks in the AI and big data sectors. 



More importantly, Volcano allows you to configure retry policies for distributed training jobs based on events rather on the number of retries. It is more flexible. In addition, it is more light-weighted than Hadoop, which is a distributed processing framework that also supports batch scheduling. After thorough analyses and comparisons, we finally chose Volcano for Leinao cloud OS 2.0.

Volcano provides enhanced job APIs.  

{{<figure library="1" src="leinao-en2.png">}}  

Volcano improves many aspects of default-scheduler.

{{<figure library="1" src="leinao-en3.png">}} 

Default-scheduler and Volcano work differently in a couple of other ways as well.

{{<figure library="1" src="leinao-en4.png">}} 



We encountered some obstacles when we connected the OS to Volcano. For example, OS development was already complete when we tried to connect it to Volcano, and connecting them directly required a huge change to the OS's computing and application layers. Moreover, Volcano did not support debugging jobs and tool sets yet. That was when we decided to introduce job-server, for API adaptation and integrated development of debugging tool sets.


{{<figure library="1" src="leinao-en5.png">}}  

Another problem we faced was how to deal with task monitoring. Upper-layer services need detailed information on current and recent task status, and historical records, but Volcano only supports job monitoring. Should we customize Volcano or further develop the OS to support task monitoring? If we customize Volcano, it would get complicated later on, when we want to upgrade Volcano. The Volcano community iterates in a fast speed. We did not want to miss its latest features provided with every iteration. Therefore, we went with the latter choice, that is, to further develop the OS.

 

The following figure shows the monitoring mechanism. It uses an API server to watch jobs and pods.


{{<figure library="1" src="leinao-en6.png">}}  



## Creating a job

__Scenario requirements:__

- Jobs can be created in batches.  
- Debugging tool sets, such as JupyterLab, TensorBoard, code-server, and Wetty, are supported.  
- Data storage set optimization policies can be configured for batch jobs.  
- Training, quantization, and model conversion are supported.  

The workflow is as follows:


{{<figure library="1" src="leinao-en7.png">}}  

{{<figure library="1" src="leinao-en8.png">}}



#### Deleting a job

__Scenario requirements:__

- Jobs are automatically deleted when they finish.  
- Additional capabilities (Jupyter and code-server) of the jobs are deleted, as well.  

**When the job finishes, Volcano automatically deletes it.**

{{<figure library="1" src="leinao-en9.png">}}  

**Related resources (pods, services, and ingresses) are deleted.**

{{<figure library="1" src="leinao-en10.png">}}    

{{<figure library="1" src="leinao-en11.png">}}  

 


#### Retrying a job

In OS 1.0, retry policies are set simply based on the number of retries. Volcano allows you to set retry policies based on events. It is much more flexible and better suits our scenarios. We gave up on our original solution and adopted the retry mechanism of Volcano.

{{<figure library="1" src="leinao-en12.png">}}  

{{<figure library="1" src="leinao-en13.png">}}  

- Policies defined in taskRole have a higher priority than the retry policies defined in jobs. A retry policy consists of an event and action. 

- event indicates a triggering condition.

- action indicates the action to take when the specified triggering condition is met. 

- maxRetry indicates the maximum number of retries allowed for a job.


When we were developing the OS to support task monitoring, we received great support from the Volcano community. For example, we once found that RestartTask became invalid. The problem was solved the same day it was reported to the community. Their response was very fast.

{{<figure library="1" src="leinao-en14.png">}}
  

## Next Up

We look forward to working with the community on topology scheduling and how to select the best GPU topology for scheduling when there are multiple GPUs on a single server. We seek deeper cooperation with the community in developing more advanced features and building a more inclusive ecosystem.

