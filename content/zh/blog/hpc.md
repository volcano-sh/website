+++
title =  "HPC on Volcano：容器在气象行业HPC高性能计算场景的应用"
description = "本文以传统的HPC应用WRF为例，探讨Volcano是如何支持HPC应用的。"
subtitle = ""

date = 2020-10-27
lastmod = 2021-08-24
datemonth = "Aug"
dateyear = "2021"
dateday = 24

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["金喆/华为云容器批量计算资深工程师"]

tags = ["Practice"]
summary = "本文以传统的HPC应用WRF为例，探讨Volcano是如何支持HPC应用的。"

# Add menu entry to sidebar.
linktitle = "HPC on Volcano：容器在气象行业HPC高性能计算场景的应用"
[menu.posts]
parent = "tutorials"
weight = 7
+++

>本文2020年10月27日首发于容器魔方微信公众号，原文链接[HPC on Volcano：容器在气象行业HPC高性能计算场景的应用](https://mp.weixin.qq.com/s/wLIoJeUSey9tzOCV6GZRig)  



前言：Kubernetes已经成为云原生应用编排、管理的事实标准， 越来越多的应用选择向K8S迁移。HPC作为传统的分布式计算模式，在很多领域都有着广泛的应用，很多用户都希望能将HPC应用迁移到容器中运行，通过Kubernetes强大的功能来进行作业管理。Volcano作为CNCF首个面向批量计算的分布式调度系统，也支持MPI作业的调度，__本文以传统的HPC应用WRF为例，探讨Volcano是如何支持HPC应用的。__


## HPC简介

HPC是High Performance Computing（高性能计算）的缩写。平时提到的HPC，一般指代高性能计算机群（HPCC），它将大量的计算机软件/硬件整合起来，将大的计算作业分解成一个个小部分，通过并行计算的方式加以解决。HPC高性能计算在CAE仿真、动漫渲染、物理化学、石油勘探、生命科学、气象环境等领域有广泛的应用。

__一般来说，高性能计算集群（HPCC）包含如下部分：__

{{<figure library="1" src="hpc-1.png">}}

- PBS：Protable Batch System，资源管理器，负责管理集群中所有节点的资源。除了PBS意外，常用的资源管理系统还有Slurm，LSF等

- Maui：第三方任务调度器，支持资源预留，支持各种复杂的优先级策略，支持抢占机制等。资源管理器中内置了默认的任务调取器，但功能往往比较简单

- OpenMPI：上层通信环境，兼顾通信库，编译，分布式启动任务的功能


上述三部分中，PBS和Maui对于用户来说是完全透明的，用户只需要按照PBS提供的方式提交作业即可，不需要了解内部细节。而OpenMPI则需要用户进行相关了解，来编写能够并行计算的应用。



__下面以mpirun -np 4 ./mpi_hello_world为例介绍mpi作业是如何运行的：__

{{<figure library="1" src="hpc-2.png">}}

- 调用openmpi或者其他mpi的库来编写源代码，例子里就是输出hello world字符串了
  
- 使用支持MPI的编译器来编译出可执行程序mpi_hello_world
  
- 将mpi_hello_world分发到各个节点，也可以通过共享文件系统来实现对mpi_hello_world的访问
  
- 运行mpirun来并行执行mpi_hello_world
  

## WRF简介

WRF是Weather Research and Forecasting Model（天气研究和预报模型）的简称，是一种比较常见的HPC应用。WRF是一种中尺度数值天气预报系统，设计用于大气研究和业务预报应用，可以根据实际的大气条件或理想化的条件进行模拟。



由于WRF包含多个模块，因此处理流程可能不尽相同，这里仅以WPS和WRF这两个模块为例介绍一下完整的WRF流程：

{{<figure library="1" src="hpc-3.png">}}

该处理流程包括4部分：

- 外部数据源

- 前处理系统（WPS）

- 核心模拟系统（WRF）

- 后处理系统

__外部数据源__

包含静态地理数据，网络数据等。静态地理数据可以理解为某区域内的地理信息，例如山川，河流，湖泊，森林等等。网络数据是某区域内的气象环境数据，例如气温，风速风向，空气湿度，降雨量等等。

__前处理系统__

——WPS，WRF Pre-processing System）



前处理系统用于载入地理和气象数据，对气象数据进行插值，为WRF提供输入数据。该部分包含3个程序：

- geogrid.exe：定义模型投影、区域范围，嵌套关系，对地表参数进行插值，处理地形资料和网格数据

- ungrib.exe：从grib数据中提取所需要的气象参数

- metgrid.exe：将气象参数插值到模拟区域



经过这3个程序处理后，生成可以用来进行气象模拟的数据。这3个处理程序目前不支持mpi并行运算。

__核心模拟系统（WRF）__

核心模拟系统对前处理系统生成的气象信息进行模拟和预报，是WRF的核心模块。该部分包含2个程序：

- real.exe：初始化实际气象数据

- wrf.exe：模拟及预报结果



real.exe和wrf.exe可以通过mpi并行运算来提升计算速度，例如：

{{<figure library="1" src="hpc-4.png">}}

上图中wrfinput_d0X和wrfbdy_d0X为real.exe的运算结果，wrf.exe以该结果为输入进行模拟演算，生成最终的气象模拟结果wrfout_dxx_yyyy-mm-dd_hh:mm:ss，并由后处理系统进行验证展示。

__后处理系统__

后处理系统用来验证和显示核心模拟系统的计算结果。主要由各种第三方图像和验证工具组成。下图展示了Conus 2.5km算例中各个地区相对湿度的模拟预报结果：

{{<figure library="1" src="hpc-5.png">}}

Conus 2.5km是指美国本土气象数据，分辨率为2.5km（将整个区域分成一个个2.5km*2.5km*2.5km的方格，每个方格中的气象信息被认为是完全一致的）。

## HPC on Volcano

{{<figure library="1" src="hpc-6.png">}}

上面介绍了一个HPCC包括资源管理器，调度器和mpi并行计算库三部分，其中资源管理器由Kubernetes负责，调度器由Volcano负责。



__在Kubernetes+Volcano环境中运行HPC应用，本质上就是在容器中运行HPC作业，示意图如下：__

{{<figure library="1" src="hpc-7.png">}}

将运行的容器分为Master容器和Worker容器两种。Master容器负责启动mpirun/mpiexec命令，Worker容器负责运行真正的计算作业。



__因此Volcano为了支持MPI作业运行，添加了如下功能：__

- Volcano job支持定义多个pod模板，能够同时定义master pod和worker pod

- 支持 Gang scheduling，保证作业中所有的pod能够同时启动

- Master/Worker pod内部主机IP映射

- Master/Workerpod之间ssh免密登录

- 作业生命周期管理



__Volcano mpi作业配置mpi_sample.yaml：__

```
apiVersion: batch.Volcano.sh/v1alpha1
kind: Job
metadata:
  name: mpi-job
  labels:
    # 根据业务需要设置作业类型
    "Volcano.sh/job-type": "MPI"
spec:
  # 设置最小需要的服务 (小于总replicas数)
  # 这里等于mpimaster和mpiworker的总数
  minAvailable: 3
  # 指定调度器为Volcano
  schedulerName: Volcano
  plugins:
    # 提供 ssh 免密认证
    ssh: []
    # 提供运行作业所需要的网络信息，hosts文件，headless service等
    svc: []
  # 如果有pod被 杀死，重启整个作业
  policies:
    - event: PodEvicted
      action: RestartJob
  tasks:
    - replicas: 1
      name: mpimaster
      # 当 mpiexec 结束，认为整个mpi作业结束
      policies:
        - event: TaskCompleted
          action: CompleteJob
      template:
        spec:
          # Volcano的信息会统一放到 /etc/Volcano 目录下
          containers:
            # master容器中
            # 1. 启动sshd服务
            # 2. 通过/etc/Volcano/mpiworker.host获取mpiworker容器列表
            # 3. 运行mpirun/mpiexec
            - command:
            - /bin/sh
                - -c
                - |
                  MPI_HOST=`cat /etc/Volcano/mpiworker.host | tr "\n" ","`;
                  mkdir -p /var/run/sshd; /usr/sbin/sshd;
                  mpiexec --allow-run-as-root --host ${MPI_HOST} -np 2 mpi_hello_world;
              image: Volcanosh/example-mpi:0.0.1
              imagePullPolicy: IfNotPresent
              name: mpimaster
              ports:
                - containerPort: 22
                  name: mpijob-port
              workingDir: /home
              resources:
                requests:
                  cpu: "100m"
                  memory: "1024Mi"
                limits:
                  cpu: "100m"
                  memory: "1024Mi"
          restartPolicy: OnFailure
          imagePullSecrets:
            - name: default-secret
    - replicas: 2
      name: mpiworker
      template:
        spec:
          containers:
            # worker容器中只需要启动sshd服务
            - command:
                - /bin/sh
                - -c
                - |
                  mkdir -p /var/run/sshd; /usr/sbin/sshd -D;
              image: Volcanosh/example-mpi:0.0.1
              imagePullPolicy: IfNotPresent
              name: mpiworker
              ports:
                - containerPort: 22
                  name: mpijob-port
              workingDir: /home
              resources:
                requests:
                  cpu: "100m"
                 memory: "2048Mi"
                limits:
                  cpu: "100m"
                  memory: "2048Mi"
          restartPolicy: OnFailure
          imagePullSecrets:
            - name: default-secret
```   

__提交mpi Volcano job：__

{{<figure library="1" src="hpc-8.png">}}


__作业执行完毕：__

{{<figure library="1" src="hpc-9.png">}}

__查看master pod的结果：__

{{<figure library="1" src="hpc-10.png">}}


通过上述执行结果可以看出，在作业执行结束后，Volcano只清理worker pod，保留master pod，这样用户kubectl命令获取执行结果。



此外，由于网络构建可能会出现延迟，在作业运行开始时，master pod会出现连接worker pod失败的情况。对于这种情况，Volcano会自动重启master pod，保证作业能够正确运行。



通过以上示例我们可以看出，Volcano想要运行WRF作业的话，理论上需要将其中的mpi_hello_world替换为real.exe/wrf.exe，此外，用户还需要进行如下准备：

- 自建docker images，包含完整的WRF运行环境

- 将计算所需要的数据（原生数据或者中间结果数据）挂载到相应的容器中



__这样就能在Kubernetes+Volcano上运行气象模拟作业了。__


 


