+++
title = "百度飞桨(PaddlePaddle)分布式训练在Volcano系统上的实践"
description = "深入基于Volcano和PaddlePaddle的分布式训练最佳实践"
subtitle = ""

date = 2019-11-06
lastmod = 2021-08-23
datemonth = "Dec"
dateyear = "2020"
dateday = 23

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["PaddlePaddle团队", "Volcano团队"]

tags = ["Practice"]
summary = "深入基于Volcano和PaddlePaddle的分布式训练最佳实践"

# Add menu entry to sidebar.
linktitle = "百度飞桨(PaddlePaddle)分布式训练在Volcano系统上的实践"
[menu.posts]
parent = "tutorials"
weight = 4
+++

>本文2019年11月6日首发于容器魔方微信公众号，原文链接[百度飞桨(PaddlePaddle)分布式训练在Volcano系统上的实践](https://mp.weixin.qq.com/s/SnUUEEy9OfNghzoel7FtUg)

飞桨(PaddlePaddle)是百度于2016年9月开源的深度学习框架，旨在提供一款安全高效、灵活易用、可扩展的深度学习平台。

2018年10月，飞桨团队发布Paddle Fluid 1.0版本，对神经网络描述、大规模分布式训练、高性能推理引擎等核心能力进行了全面升级。以工业界应用必需的分布式训练能力为例，在最新的Paddle Fluid 1.5.2版本中，飞桨支持数据并行、模型并行、流水线并行等多种并行模式，参数服务器架构和点对点同步训练架构全面支持在CPU、GPU等硬件资源设备上的大规模训练。本文将介绍飞桨分布式训练在Kubernetes社区中的Volcano系统上进行实践的案例。



__Kubernetes是当今最火的容器化应用自动部署、伸缩和资源管理的开源系统。__ 随着Kubernetes的崛起，越来越多的公司愿意将自己的业务应用部署在Kubernetes上。除了典型的Web服务、数据库等服务会基于Kubernetes进行部署以外，深度学习框架的分布式训练也不例外。



然而，在Kubernetes系统中提交深度学习训练任务的功能并不像传统的高性能计算MPI平台那样直观。在2017年，Kubernetes社区就有文章Run Deep Learning with PaddlePaddle on Kubernetes分析了运行PaddlePaddle对底层资源的诉求，基于PaddlePaddle对计算容错性、弹性伸缩、资源隔离的要求，提出在Kubernetes平台上运行PaddlePaddle是最佳实践。



自Paddle Fluid 1.0 发布以来，飞桨在平台部署和任务调度管理上已经取得了长足的进步。借助Kubernetes平台，飞桨可以实现CPU/GPU等硬件资源的合理调度分配、训练任务的弹性扩缩容，并能显著提升计算资源的利用率。但是，在并行创建和调度任务、训练任务的生命周期管理、计算资源亲和性调度、调度策略优化等方面还有提升空间。__为了提升飞桨框架的计算效率，飞桨团队和Volcano团队联合发布PaddlePaddle on Volcano方案。__  

Volcano是一款构建于Kubernetes之上的增强型高性能计算任务批量处理系统。

作为一个面向高性能计算场景的平台，它弥补了kubernetes 在机器学习、深度学习、HPC、大数据计算等场景下的基本能力缺失，其中包括gang-schedule的调度能力、计算任务队列管理、GPU亲和性调度。另外，Volcano在原有Kubernetes能力基础上对计算任务的批量创建及生命周期管理、Fair-share调度等方面做了增强。



__Volcano平台可以满足飞桨对资源创建，资源调度的基本要求。__ Volcano的批量创建批量调度计算任务为飞桨作业提供计算任务的自动化生命周期管理，gang-scheduler调度策略可以满足PServer和Trainer “all or nothing”的业务调度约束，Queue和priority逻辑可以管理集群下计算作业的执行顺序，Fair-share和GPU亲和度调度使计算任务调度更贴合PServer和Trainer对节点资源和网络拓扑结构的要求而提升任务计算效率。



Volcano借助Kubernetes创建CRD能力，在Kubernetes中引入“apiVersion”为“batch.volcano.sh/v1alpha1 ”,“kind”为“Job”的资源对象，用于描述计算任务。通过配置和创建Volcano job可以使用Volcano平台创建、管理和调度计算任务。使用volcano平台，需要先在Kubernetes集群下安装Volcano，安装Volcano的方法可参考Volcano 官网。

选择一个飞桨框架任务分别使用Kubernetes原生资源和Volcano job执行计算任务并对比分析，以下对比将着重体现两者在使用方法、任务管理、调度策略方面进行比较。选择飞桨官网分布式训练CTR（Click-Through-Rate） demo进行对比测试。CTR demo将运行两个PServer任务和两个Trainer任务。



首先使用飞桨官网推荐模式执行分布式计算任务，先创建一个副本数为2的Kubernetes ReplicaSet对象，用于运行PServer业务，然后创建一个并行度为2的Kubernetes Job对象，用于运行Trainer任务。



创建PServer任务
```
root@volcano-paddlepaddle:~# kubectl apply -f pserver.yaml


replicaset.extensions/fluid-ctr-pserver create
```  

查看pserver ReplicaSet组件
```
root@volcano-paddlepaddle:~# kubectl get rs

NAME                DESIRED   CURRENT   READY   AGE
fluid-ctr-pserver   2         2         2       5
```  


查看pserver pods
```
root@volcano-paddlepaddle:~# kubectl get pods | grep fluid

fluid-ctr-pserver-b9w99   1/1     Running   0          9m18s
fluid-ctr-pserver-pb9vd   1/1     Running   0          9m18
```  

查看pserver日志，PServer已经开始工作，并对外提供服务
```
root@volcano-paddlepaddle:~# kubectl logs fluid-ctr-pserver-b9w99


+ case "$1"in
+ start_fluid_process
+ pserver_label=paddle-job-pserver=fluid-ctr
+ trainer_label=paddle-job=fluid-ct
+ hostname=c-rlnrdybm-muamumvq-1
+ task_index=
+ '[' PSERVER == TRAINER ']
+ '[' PSERVER == PSERVER ']'
+ stdbuf -oL python /root/k8s_tools.py wait_pods_running paddle-job-pserver=fluid-ctr 2
label selector: paddle-job-pserver=fluid-ctr, desired: 2
current cnt: 0 sleep for 5 seconds...
+ '[' PSERVER == TRAINER ']'
+ '[' PSERVER == WORKER ']
++ python /root/k8s_tools.py fetch_endpoints paddle-job-pserver=fluid-ctr 30236
+ export PADDLE_PSERVERS=192.168.48.24:30236,192.168.48.25:30237
+ PADDLE_PSERVERS=192.168.48.24:30236,192.168.48.25:30237
++ python /root/k8s_tools.py fetch_ips paddle-job=fluid-ctr
+ export PADDLE_TRAINER_IPS=
+ PADDLE_TRAINER_IPS=
+ '[' PSERVER == TRAINER ']'
+ '[' PSERVER == WORKER ']'
++ python /root/k8s_tools.py fetch_id paddle-job-pserver=fluid-ctr
+ task_index=0
+ export PADDLE_TRAINER_ID=0
+ PADDLE_TRAINER_ID=0
+ export PADDLE_PSERVER_ID=0
+ PADDLE_PSERVER_ID=0
+ stdbuf -oL sh -c 'cd /workspace/ctr && python train.py --is_local 0 --cloud_train 1'
2019-09-03 06:43:10,661 - INFO - run dist training
2019-09-03 06:43:10,715 - INFO - run pserver
get_pserver_program() is deprecated, call get_pserver_programs() to get pserver main and startup in a single call.
I0903 06:43:10.826609    41 grpc_server.cc:435] Server listening on 192.168.48.24:30236 selected port:
```  

创建trainer任务
```
root@volcano-paddlepaddle:~# kubectl apply -f trainer.yaml

job.batch/fluid-ctr-trainer create
```  

查看trainer pods
```
root@volcano-paddlepaddle:~# kubectl get pod | grep fluid


fluid-ctr-pserver-b9w99   1/1     Running   0          87m
fluid-ctr-pserver-pb9vd   1/1     Running   0          87m
fluid-ctr-trainer-lg9n5   1/1     Running   0          12s
fluid-ctr-trainer-tvr99   1/1     Running   0          12  
```  

查看trainer任务日志，看到任务已经开始执行

```
root@volcano-paddlepaddle:~# kubectl logs fluid-ctr-trainer-lg9n5

+ case "$1" in
+ start_fluid_process
+ pserver_labe=paddle-job-pserver=fluid-ctr
+ trainer_label=paddle-job=fluid-ctr
+ hostname=c-rlnrdybm-muamumvq-2
+ task_index=
+ '[' TRAINER == TRAINER ']'
+ stdbuf -oL python /root/k8s_tools.py wait_pods_running paddle-job-pserver=fluid-ctr 2
label selector: paddle-job-pserver=fluid-ctr, desired: 2
+ '[' TRAINER == TRAINER ']'
+ stdbuf -oL python /root/k8s_tools.py wait_pods_running paddle-job=fluid-ctr 2
label selector: paddle-job=fluid-ctr, desired: 2
++ python /root/k8s_tools.py fetch_endpoints paddle-job-pserver=fluid-ctr 30236
+ export PADDLE_PSERVERS=192.168.48.24:30236,192.168.48.25:30237
+ PADDLE_PSERVERS=192.168.48.24:30236,192.168.48.25:30237
++ python /root/k8s_tools.py fetch_ips paddle-job=fluid-ctr
+ export PADDLE_TRAINER_IPS=192.168.48.24,192.168.48.25
+ PADDLE_TRAINER_IPS=192.168.48.24,192.168.48.25
+ '[' TRAINER == TRAINER ']'
+ check_failed_cnt 1
+ max_failed=1
++ python /root/k8s_tools.py count_pods_by_phase paddle-job=fluid-ctr Failed
+ failed_count=0
+ '[' 0-gt 1 ']'
++ python /root/k8s_tools.py fetch_id paddle-job=fluid-ctr
+ task_index=0
+ export PADDLE_TRAINER_ID=0
+ PADDLE_TRAINER_ID=0
+ export PADDLE_PSERVER_ID=0
+ PADDLE_PSERVER_ID=0
+ stdbuf -oL sh -c 'cd /workspace/ctr && python train.py --is_local 0 --cloud_train 1'
2019-09-03 08:10:20,888 - INFO - run dist training
2019-09-03 08:10:20,951 - INFO - download the training materials
 % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                Dload  Upload   Total   Spent    Left  Speed
100  433M  100  433M    0     0  70.9M      0  0:00:06  0:00:06 --:--:-- 97.0M
2019-09-03 08:11:04,522 - INFO - run trainer
2019-09-03 08:11:04,591 - WARNING -
I0903 08:11:04.594007    25 parallel_executor.cc:329] The number of CPUPlace, which is used in ParallelExecutor, is 2. And the Program will be copied 2 copies
I0903 08:11:04.875757    25 rpc_client.h:101] init rpc client with trainer_id 0
2019-09-03 08:11:38,625 - INFO - TRAIN --> pass: 0 batch: 0 loss: 0.697331115723 auc: 0.500826068453, batch_auc: 0.500826068453
2019-09-03 08:11:38,967 - INFO - TRAIN --> pass: 0 batch: 1 loss: 0.652093688965 auc: 0.48451329672, batch_auc: 0.48451329672
2019-09-03 08:11:39,242 - INFO - TRAIN --> pass: 0 batch: 2 loss: 0.629092956543 auc: 0.485173881519, batch_auc: 0.485173881519
2019-09-03 08:11:39,577 - INFO - TRAIN --> pass: 0 batch: 3 loss: 0.603850708008 auc: 0.482131778494, batch_auc: 0.482131778494
2019-09-03 08:11:39,874 - INFO - TRAIN --> pass: 0 batch: 4 loss: 0.591485412598 auc: 0.479737304993, batch_auc: 0.479737304993
2019-09-03 08:11:40,133 - INFO - TRAIN --> pass: 0 batch: 5 loss: 0.58376159668 auc: 0.478554220739, batch_auc: 0.478554220739
2019-09-03 08:11:40,385 - INFO - TRAIN --> pass: 0 batch: 6 loss: 0.561969116211 auc: 0.481465857424, batch_auc: 0.481465857424
2019-09-03 08:11:40,637 - INFO - TRAIN --> pass: 0 batch: 7 loss: 0.557065185547 auc: 0.486014931119, batch_auc: 0.486014931119
2019-09-03 08:11:40,890 - INFO - TRAIN --> pass: 0 batch: 8 loss: 0.562498413086 auc: 0.489651573333, batch_auc: 0.489651573333
2019-09-03 08:11:41,158 - INFO - TRAIN --> pass: 0 batch: 9 loss: 0.566428283691 auc: 0.489853260221, batch_auc: 0.49137884426
2019-09-03 08:11:41,452 - INFO - TRAIN --> pass: 0 batch: 10 loss: 0.564840087891 auc: 0.492880386228, batch_auc: 0.494013763938
2019-09-03 08:11:41,742 - INFO - TRAIN --> pass: 0 batch: 11 loss: 0.564809204102 auc: 0.493201528907, batch_auc: 0.498872381582
2019-09-03 08:11:42,056 - INFO - TRAIN --> pass: 0 batch: 12 loss: 0.584479736328 auc: 0.494151972036, batch_auc: 0.503926628391
2019-09-03 08:11:42,329 - INFO - TRAIN --> pass: 0 batch: 13 loss: 0.615677246094 auc: 0.49252557362, batch_auc: 0.5028352489
```  


等待trainer任务执行完成，查看pserver和trainer pods状态，trainer已经执行完成，pserver仍然于运行中
```
root@volcano-paddlepaddle:~# kubectl get pods | grep fluid


fluid-ctr-pserver-b9w99   1/1     Running     0          177m
fluid-ctr-pserver-pb9vd   1/1     Running     0          177m
fluid-ctr-trainer-lg9n5   0/1     Completed   0          90m
fluid-ctr-trainer-tvr99   0/1     Completed   0          90
```  

__将上述计算任务迁移到volcano平台上进行测试。__



Volcano支持Multi-pod jobs，拓展“tasks”字段，tasks下可以定义多个pod描述，其中“replicas” 字段描述task将要生成的pod数量，“name”描述task名称，pod名称将根据task名称生成。Template字段与kubernetes “podTemplate”一致。ctr的demo中含有两个task： “pserver”和“trainer”，每个task的replicas都是2，将会创建两个PServer任务，两个Trainer任务。



使用Volcano调度器，在job的配置中需要指定“schedulerName”为“volcano”，如果schedulerName没有指定为“volcano”，job下的任务调度将会使用kubernetes的默认调度器“default”调度器。



Volcano通过指定“minAvailable”字段保证计算任务的gang-scheduler调度策略。“minAvailable”数值指明在对当前计算任务下的pods进行调度时，需保证多少计算任务都能够调度才会执行调度任务，“minAvailable”的数值需要小于或等于计算任务下的所有任务数量的总和。对于PaddlePaddle框架计算任务，只有当所有的PServer和Trainer任务都处于运行中，才能开始计算任务。因此对于飞桨计算任务，“minAvailable”的数值需要与计算任务下的所有计算任务总和相等。



对于使用飞桨分布式训练的应用，在计算过程中，如果PServer任务或者Trainer任务被驱逐或失败，PServer和Trainer形成的计算集群将会失效，所有的PServer任务和Trainer任务都需要重启，以形成新的集群开始新的计算。Volcano可以通过设置“policies”实现上述目的。设置“PodEvicted”事件对应“RestartJob”动作，设置“PodFailed”事件对应“RestartJob”动作，在设置了这两个“policies”之后，当计算任务被驱逐或者失败，所有的计算任务将会重启。



下面是使用Volcano平台执行CTR任务的配置ctr-volcano.yaml，配置文件可从Volcano代码库获取

Volcano代码仓库地址：

https://github.com/volcano-sh/volcano/blob/master/example/integrations/paddlepaddle/ctr-paddlepaddle-on-volcano.yaml  


```
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
 name: ctr-volcano
spec:
 minAvailable: 4
schedulerName: volcano
 policies:
- event: PodEvicted
   action: RestartJob
 - event: PodFailed
 action: RestartJob
 tasks:
- replicas: 2
     name: pserver
     template:
       metadata:
         labels:
paddle-job-pserver: fluid-ctr
       spec:
         imagePullSecrets:
 - name: default-secret
         volumes:
         - hostPath:
 path: /home/work/
             type: ""
   name: seqdata
         containers:
 - image: volcanosh/edlctr:v1
             command:
               - paddle_k8s
               - start_fluid
             imagePullPolicy: IfNotPresent
   name: pserver
             volumeMounts:
 - mountPath: /mnt/seqdata
 name: seqdata
             resources:
               limits:
                 cpu: 10
                 memory: 30Gi
 ephemeral-storage: 10Gi
               requests:
                 cpu: 1
                 memory: 100M
                 ephemeral-storage: 1Gi
             env:
 - name: GLOG_v
                 value: "0"
 - name: GLOG_logtostderr
                 value: "1"
               - name: TOPOLOGY
                 value: ""
 - name: TRAINER_PACKAGE
                 value: /workspace
   - name: NAMESPACE
                 valueFrom:
                   fieldRef:
                     apiVersion: v1
                     fieldPath: metadata.namespace
   - name: POD_IP
                 valueFrom:
                   fieldRef:
                     apiVersion: v1
                     fieldPath: status.podIP
   - name: POD_NAME
                 valueFrom:
                   fieldRef:
                     apiVersion: v1
       fieldPath: metadata.name
               - name: PADDLE_CURRENT_IP
                 valueFrom:
                   fieldRef:
                     apiVersion: v1
                     fieldPath: status.podIP
- name: PADDLE_JOB_NAME
                 value: fluid-ctr
     - name: PADDLE_IS_LOCAL
                 value: "0"
     - name: PADDLE_TRAINERS_NUM
                 value: "2"
               - name: PADDLE_PSERVERS_NUM
                 value: "2"
 - name: FLAGS_rpc_deadline
"                  value: "
   - name: ENTRY
                 value: cd /workspace/ctr && python train.py --is_local 0 --cloud_train 1
   - name: PADDLE_PORT
                 value: "30236"
 - name: LD_LIBRARY_PATH
                 value: /usr/local/lib:/usr/local/nvidia/lib64:/usr/local/rdma/lib64:/usr/lib64/mlnx_ofed/valgrind
- name: PADDLE_TRAINING_ROLE
                 value: PSERVER
- name: TRAINING_ROLE
                 value: PSERVER
         restartPolicy: OnFailure
   - replicas: 2
     policies:
 - event: TaskCompleted
       action: CompleteJob
     name: trainer
     template:
       metadata:
         labels:
           paddle-job: fluid-ctr
       spec:
         imagePullSecrets:
- name: default-secret
         volumes:
         - hostPath:
             path: /home/work/
             type: ""
           name: seqdata
         containers:
   - image: volcanosh/edlctr:v1
             command:
               - paddle_k8s
               - start_fluid
             imagePullPolicy: IfNotPresent
   name: trainer
             volumeMounts:
 - mountPath: /mnt/seqdata
 name: seqdata
             resources:
               limits:
                 cpu: 10
                 memory: 30Gi
                 ephemeral-storage: 10Gi
               requests:
                 cpu: 1
                 memory: 100M
                 ephemeral-storage: 10Gi
             env:
- name: GLOG_v
                 value: "0"
   - name: GLOG_logtostderr
                 value: "1"
- name: TOPOLOGY
- name: TRAINER_PACKAGE
                 value: /workspace
 - name: CPU_NUM
                 value: "2"
               - name: NAMESPACE
                 valueFrom:
                   fieldRef:
                     apiVersion: v1
                     fieldPath: metadata.namespace
 - name: POD_IP
                 valueFrom:
                   fieldRef:
                     apiVersion: v1
                     fieldPath: status.podIP
   - name: POD_NAME
                 valueFrom:
                   fieldRef:
                     apiVersion: v1
                     fieldPath: metadata.name
               - name: PADDLE_CURRENT_IP
                 valueFrom:
                   fieldRef:
                     apiVersion: v1
                     fieldPath: status.podIP
 - name: PADDLE_JOB_NAME
                 value: fluid-ctr
               - name: PADDLE_IS_LOCAL
                 value: "0"
 - name: FLAGS_rpc_deadline
"                  value: "
 - name: PADDLE_PORT
                 value: "30236"
- name: PADDLE_PSERVERS_NUM
                 value: "2"
 - name: PADDLE_TRAINERS_NUM
                 value: "2"
- name: PADDLE_TRAINING_ROLE
                 value: TRAINER
 - name: TRAINING_ROLE
                 value: TRAINER
     - name: LD_LIBRARY_PATH
                 value: /usr/local/lib:/usr/local/nvidia/lib64:/usr/local/rdma/lib64:/usr/lib64/mlnx_ofed/valgrind
   - name: ENTRY
                 value: cd /workspace/ctr && python train.py --is_local 0 --cloud_train 1
         restartPolicy: OnFailure  
``` 


在集群终端中执行以下指令在default namespace下创建volcano job  
```
root@volcano-paddlepaddle:~# kubectl apply -f ctr-volcano.yaml

job.batch.volcano.sh/ctr-volcano create  
```  

检查pods的状态，无论是pserver任务还是trainer任务都被下发到集群中，并开始运行。如果当前集群下的空闲资源，不能满足pserver任务和trainer任务的资源述求，任何任务都不会被创建。

```
root@volcano-paddlepaddle:~# kubectl get pods | grep ctr-volcano


ctr-volcano-pserver-0     1/1     Running     0          16s
ctr-volcano-pserver-1     1/1     Running     0          16s
ctr-volcano-trainer-0     1/1     Running     0          16s
ctr-volcano-trainer-1     1/1     Running     0          16
```  

选择一个PServer任务查看日志，看到PServer在监听端口，并对外提供服务

```
root@volcano-paddlepaddle:~# kubectl logs ctr-volcano-pserver-0


+ case "$1" in
+ start_fluid_process
+ pserver_label=paddle-job-pserver=fluid-ctr
+ trainer_label=paddle-job=fluid-ctr
+ hostname=ctr-volcano-pserver-0
+ task_index=
+ '[' PSERVER == TRAINER ']'
+ '[' PSERVER == PSERVER ']'
+ stdbuf -oL python /root/k8s_tools.py wait_pods_running paddle-job-pserver=fluid-ctr 2
label selector: paddle-job-pserver=fluid-ctr, desired: 2
current cnt: 0 sleep for 5 seconds...
+ '[' PSERVER == TRAINER ']'
+ '[' PSERVER == WORKER ']'
++ python /root/k8s_tools.py fetch_endpoints paddle-job-pserver=fluid-ctr 30236
+ export PADDLE_PSERVERS=172.20.0.148:30236,172.20.1.134:30237
+ PADDLE_PSERVERS=172.20.0.148:30236,172.20.1.134:30237
++ python /root/k8s_tools.py fetch_ips paddle-job=fluid-ctr
+ export PADDLE_TRAINER_IPS=172.20.0.147,172.20.1.133
+ PADDLE_TRAINER_IPS=172.20.0.147,172.20.1.133
+ '[' PSERVER == TRAINER ']'
+ '[' PSERVER == WORKER ']'
++ python /root/k8s_tools.py fetch_id paddle-job-pserver=fluid-ctr
+ task_index=0
+ export PADDLE_TRAINER_ID=0
+ PADDLE_TRAINER_ID=0
+ export PADDLE_PSERVER_ID=0
+ PADDLE_PSERVER_ID=0
+ stdbuf -oL sh -c 'cd /workspace/ctr && python train.py --is_local 0 --cloud_train 1'
2019-09-03 09:57:55,619 - INFO - run dist training
2019-09-03 09:57:55,708 - INFO - run pserver
get_pserver_program() is deprecated, call get_pserver_programs() to get pserver main and startup in a single call.
I0903 09:57:55.860916    41 grpc_server.cc:435] Server listening on 172.20.0.148:30236 selected port: 
```  


选择一个Trainer任务查看日志，看到计算任务已经开始执行
root@volcano-paddlepaddle:~# kubectl logs ctr-volcano-trainer-0

```
root@volcano-paddlepaddle:~# kubectl logs ctr-volcano-trainer-0


+ case "$1" in
+ start_fluid_process
+ pserver_label=paddle-job-pserver=fluid-ctr
+ trainer_label=paddle-job=fluid-ctr
+ hostname=ctr-volcano-trainer-0
+ task_index=
+ '[' TRAINER == TRAINER ']'
+ stdbuf -oL python /root/k8s_tools.py wait_pods_running paddle-job-pserver=fluid-ctr 2
label selector: paddle-job-pserver=fluid-ctr, desired: 2
current cnt: 0 sleep for 5 seconds...
+ '[' TRAINER == TRAINER ']'
+ stdbuf -oL python /root/k8s_tools.py wait_pods_running paddle-job=fluid-ctr 2
label selector: paddle-job=fluid-ctr, desired: 2
++ python /root/k8s_tools.py fetch_endpoints paddle-job-pserver=fluid-ctr 30236
+ export PADDLE_PSERVERS=172.20.0.148:30236,172.20.1.134:30237
+ PADDLE_PSERVERS=172.20.0.148:30236,172.20.1.134:30237
++ python /root/k8s_tools.py fetch_ips paddle-job=fluid-ctr
+ export PADDLE_TRAINER_IPS=172.20.0.147,172.20.1.133
+ PADDLE_TRAINER_IPS=172.20.0.147,172.20.1.133
+ '[' TRAINER == TRAINER ']'
+ check_failed_cnt 1
+ max_failed=1
++ python /root/k8s_tools.py count_pods_by_phase paddle-job=fluid-ctr Failed
+ failed_count=0
+ '[' 0 -gt 1 ']'
++ python /root/k8s_tools.py fetch_id paddle-job=fluid-ctr
+ task_index=0
+ export PADDLE_TRAINER_ID=0
+ PADDLE_TRAINER_ID=0
+ export PADDLE_PSERVER_ID=0
+ PADDLE_PSERVER_ID=0
+ stdbuf -oL sh -c 'cd /workspace/ctr && python train.py --is_local 0 --cloud_train 1'
2019-09-03 09:57:56,712 - INFO - run dist training
2019-09-03 09:57:56,773 - INFO - download the training materials
 % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                Dload  Upload   Total   Spent    Left  Speed
100  433M  100  433M    0     0  96.2M      0  0:00:04  0:00:04 --:--:-- 96.2M
2019-09-03 09:58:27,648 - INFO - run trainer
2019-09-03 09:58:27,732 - WARNING -
I0903 09:58:27.734141    25 parallel_executor.cc:329] The number of CPUPlace, which is used in ParallelExecutor, is 2. And the Program will be copied 2 copies
I0903 09:58:27.937546    25 rpc_client.h:101] init rpc client with trainer_id 0
2019-09-03 09:58:37,957 - INFO - TRAIN --> pass: 0 batch: 0 loss: 0.670620727539 auc: 0.510430537062, batch_auc: 0.510764985415
2019-09-03 09:58:38,264 - INFO - TRAIN --> pass: 0 batch: 1 loss: 0.641319274902 auc: 0.503955813399, batch_auc: 0.503955813399
2019-09-03 09:58:38,585 - INFO - TRAIN --> pass: 0 batch: 2 loss: 0.617138793945 auc: 0.50334993182, batch_auc: 0.50334993182
2019-09-03 09:58:38,873 - INFO - TRAIN --> pass: 0 batch: 3 loss: 0.598490356445 auc: 0.507263818365, batch_auc: 0.507263818365
2019-09-03 09:58:39,182 - INFO - TRAIN --> pass: 0 batch: 4 loss: 0.573976501465 auc: 0.510442316749, batch_auc: 0.51044231674
```  

等待大概70分钟，查看计算任务日志，发现任务已经安全退出
```
root@volcano-paddlepaddle:~# kubectl get pod | grep ctr-volcano


ctr-volcano-trainer-0   0/1     Completed   0          77m
ctr-volcano-trainer-1   0/1     Completed   0          77
```  

与此同时，在训练结束之后，我们可能需要训练出来的模型用于别处。在yaml文件当中，我们规定了该任务volcanosh/edlctr:v1镜像，该镜像的工作目录在/workspace/ctr下，在train.py当中有定义，会在每1000个batch或是每一轮pass（跑完一遍训练集）的时候，调用save_inference_model接口来保存模型。保存的模型在/workspace/ctr/models文件夹下。那么如何在任务结束后获取模型呢？我们建议以下几种方式。

在yaml文件当中trainer部分的spec当中定义volume，通过docker的volume映射容器路径和宿主机路径的机制，将/workspace/ctr/models文件夹映射到宿主机的文件夹中。接下来通过kubectl describe pod ctr-volcano-trainer-0，可以得知我们的模型所在的节点，接下来ssh登陆到对应的节点上，到宿主机被映射到路径下，就可以获取到训练出来到模型了。

如果需要更加灵活的，自动化的模型配送流程，可以在K8S集群上建立File Server和分布式文件系统，例如GlusterFS。将ctr-volcano-trainer-0容器内部的/workspace/ctr/models文件夹映射到GlusterFS的PVC（Persistent Volume Claim）上。通过ftp的wget/curl操作命令就可以实现模型的获取和配送。



综上，使用Volcano平台执行PaddlePaddle框架计算任务，可以实现计算任务的批量创建，任务的自动化管理，实现计算任务的自我管理。相较于普通的Replicaset+Job的模式，使用Volcano平台可以提升并行计算的管理效率。 

作者  
董大祥，@guru4elephant, PaddlePaddle Architect, Principal Architect, Baidu

王嘉炜，@wangjiawei04, PaddlePaddle Engineer, Senior Engineer, Baidu

于佃海，@raindrops2sea, PaddlePaddle Architect, Distinguished Architect, Baidu

张经辉, @sivanzcw, Volcano Contributor, Cloud Native software engineer, Huawei

马达, @k82cn, Kubernetes Maintainer, SIG-Scheduling Co-Leader, Volcano Lead, Huawei



参考文献

1.PaddlePaddle官网 

https://www.paddlepaddle.org.cn

2.Paddle on Spark 

https://github.com/hohdiy/paddle_on_spark/blob/master/doc/paddle_on_spark.md

3.Run Deep Learning with PaddlePaddle on Kubernetes 

https://kubernetes.io/blog/2017/02/run-deep-learning-with-paddlepaddle-on-kubernetes/

4.Volcano官网 

https://volcano.sh

5.Volcao社区 

https://github.com/volcano-sh/volcano

6.百度CTR Demo 

https://www.paddlepaddle.org.cn/documentation/docs/zh/1.5/user_guides/howto/training/deploy_ctr_on_baidu_cloud_cn.html

7.CTR-volcano 配置文件 

https://github.com/volcano-sh/volcano/blob/master/example/integrations/paddlepaddle/ctr-paddlepaddle-on-volcano.yam



 

