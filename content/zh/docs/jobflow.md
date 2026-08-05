+++
title = "JobFlow"

date = 2025-06-25
lastmod = 2025-06-25

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
toc_depth = 5
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
[menu.docs]
  parent = "features"
  weight = 8
+++

# 背景

在当今的云计算环境中，批处理作业的复杂性和规模不断增长，特别是在人工智能、大数据和高性能计算(HPC)领域。这些作业通常需要长时间运行（数天或数周），并且彼此之间存在复杂的依赖关系。传统的作业管理方法要求用户手动编排多个VCJob或依赖第三方作业编排平台，这不仅增加了管理复杂性，还降低了资源利用效率。

现有的工作流引擎虽然能够处理一般性的工作流程，但它们并非专为批量作业工作负载设计，无法充分理解和优化VCJob的特性。用户往往难以获取作业的详细运行状态、执行进度以及资源使用情况，这给复杂工作负载的管理带来了挑战。

为了解决这些问题，我们提出了JobFlow，这是一种专为VCJob设计的云原生编排解决方案。JobFlow引入了JobTemplate和JobFlow两个核心概念，允许用户以声明式方式定义作业并通过丰富的控制原语（如顺序执行、并行执行、条件分支、循环等）来编排它们。这种方法不仅简化了复杂作业的管理，还提高了资源利用率，加速了工作负载的执行。

与通用工作流引擎不同，JobFlow深度理解VCJob的内部机制，能够提供更详细的作业洞察，包括运行状态、时间戳、下一步执行计划和故障率等关键指标。这使得用户能够更好地监控和优化其工作负载，确保关键任务按预期执行。

# 功能

这个功能扩展了对VCJob的支持，引入了顺序启动和依赖关系管理的能力。用户可以配置VCJob按特定顺序启动，或设置某个VCJob必须等待其他VCJob完成后才能执行，增强了工作流控制的灵活性

新增的JobFlow和JobTemplate自定义资源定义(CRD)提供了更高级的作业管理功能。用户可以通过这些资源创建可重用的作业模板和复杂的作业流程，并能够实时查看JobFlow的运行状态。

# 使用

要使用JobFlow的功能，首先我们要理解两个关键概念：JobTemplate和 JobFlow。他们配合工作的一个例子在https://github.com/volcano-sh/volcano/tree/master/example/jobflow这里找到。

## JobTemplate

JobTemplate (jt) 是 Volcano 作业(vcjob)的模板定义，它不会被直接处理执行，而是等待被 JobFlow 引用。

一个简单的JobTemplate的例子如下：

```
apiVersion: flow.volcano.sh/v1alpha1
kind: JobTemplate
metadata:
  name: a
spec:
  minAvailable: 1
  schedulerName: volcano
  queue: default
  tasks:
    - replicas: 1
      name: "default-nginx"
      template:
        metadata:
          name: web
        spec:
          containers:
            - image: nginx:1.14.2
              command:
                - sh
                - -c
                - sleep 10s
              imagePullPolicy: IfNotPresent
              name: nginx
              resources:
                requests:
                  cpu: "1"
          restartPolicy: OnFailure
```

这个JobTemplate定义了一个任务模版，使用默认（default）队列，定义了一个名字叫default-nginx的任务，使用nginx:1.14.2这个镜像，执行sh -c  sleep 10s这个命令。

## JobFlow

 JobFlow (jf) 则定义了一组作业的运行流程和依赖关系，它可以引用多个 JobTemplate，根据指定的依赖关系按顺序创建和执行 Volcano 作业。JobFlow 支持多种依赖类型(如 HTTP、TCP、任务状态等)，并且可以在引用 JobTemplate 时通过 patch 机制对其进行修改。

一个简单的JobFlow的例子如下：

```
apiVersion: flow.volcano.sh/v1alpha1
kind: JobFlow
metadata:
  name: test
  namespace: default
spec:
  jobRetainPolicy: delete   # After jobflow runs, keep the generated job. Otherwise, delete it.
  flows:
    - name: a
    - name: b
      dependsOn:
        targets: ['a']
    - name: c
      dependsOn:
        targets: ['b']
    - name: d
      dependsOn:
        targets: ['b']
    - name: e
      dependsOn:
        targets: ['c','d']
```

这个 YAML 文件定义了一个名为 `test` 的 JobFlow 资源，它在 Kubernetes 的 `default` 命名空间中创建。这个 JobFlow 编排了五个作业（a、b、c、d、e）的执行流程，并定义了它们之间的依赖关系。

jobRetainPolicy: delete 这表示当 JobFlow 执行完成后，所有生成的 Volcano 作业将被删除，不会保留在系统中。

这个yaml所表示的依赖关系如下：

- 作业 `a` 没有依赖，将首先执行
- 作业 `b` 依赖于 `a`，只有当 `a` 成功完成后才会开始
- 作业 `c` 依赖于 `b`，需要等待 `b` 完成
- 作业 `d` 也依赖于 `b`，需要等待 `b` 完成
- 作业 `e` 依赖于 `c` 和 `d`，只有当 `c` 和 `d` 都完成后才会执行

# 架构

jobFlow在架构设计上，仍然采用CRD和Controller的Kubernetes Operator方式实现，其架构设计如图。

其中，蓝色部分是k8s本身的组件，橙色是Volcano现有的定义，红色是JobFlow的新定义。

![作业流程-2.png](https://github.com/volcano-sh/volcano/raw/master/docs/design/images/jobflow-2.png)

## 工作流程

JobFlow和JobTemplate的Controller与资源的交互如图。

![作业流程-3.png](https://github.com/volcano-sh/volcano/raw/master/docs/design/images/jobflow-3.png)

其创建的工作流程可以表述如下：

1. 用户创建JobFlow和JobTemplate资源。
2. JobFlowController根据JobFlow的配置，以JobTemplate为模板，按照流程依赖规则创建相应的VcJob。
3. VcJob 创建完成后，VcJobController 根据 VcJob 的配置创建相应的 Pod 和 PodGroup。
4. 当Pod、PodGroup创建完成后，vc-scheduler会去kube-apiserver获取Pod/PodGroup以及节点信息。
5. vc-scheduler 获取到这些信息之后，会根据其配置的调度策略，为每个 Pod 选择合适的节点。
6. 将节点分配给Pod后，kubelet会从kube-apiserver获取Pod的配置，并启动相应的容器。

如想知道更进一步的信息，可以参看controller的详细逻辑/volcano/pkg/controllers/jobflow/jobflow_controller.go
