+++
title =  "架构"


date = 2019-01-28
lastmod = 2020-09-03

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "架构"
[menu.docs]
  parent = "home"
  weight = 2

+++

## 概览

{{<figure library="1" src="arch_3.PNG" title="Volcano的应用场景">}}

Volcano 与 Kubernetes 天然兼容，遵循其设计理念和风格，同时扩展了 Kubernetes 原生能力，为机器学习、大数据应用、科学计算和特效渲染等高性能工作负载提供完整支持机制。其架构设计充分考虑了可扩展性、高性能和易用性，建立在多年来大规模运行各种高性能工作负载的经验之上，并结合了开源社区的最佳实践。

{{<figure library="1" src="arch_2.PNG" title="Volcano的系统架构">}}

Volcano由四个主要组件构成：作为系统核心的 Scheduler 通过可插拔的 Action 和 Plugin 实现 Gang 调度、异构设备调度等高级特性，为批处理作业提供精细化资源分配；ControllerManager 负责管理 CRD 资源生命周期，包含 Queue、PodGroup 和 VCJob 三个控制器分别管理队列资源、Pod 组和 Volcano Job；Admission 组件对 CRD API 资源进行校验，确保作业配置符合系统要求；而 Vcctl 则作为命令行客户端工具，提供友好的接口管理和监控资源与作业。

Volcano 的分层架构设计使其能够无缝对接 Spark、TensorFlow、PyTorch、Flink 等主流计算框架，同时提供统一的调度能力。其模块化设计允许用户根据需求扩展功能，添加自定义的调度策略和资源管理能力。通过这种架构设计，Volcano 实现了资源的高效利用、作业的精确调度和系统的可靠运行，为高性能计算和大规模批处理提供了坚实的基础设施支持。

## 组件介绍

Volcano由以下几个组件构成：

- **Scheduler**：通过一系列action和plugin调度Job并匹配最适节点，区别于Kubernetes原生调度器，支持多种Job专用调度算法
- **Controller**：管理CRD资源生命周期，由多个控制器组成
- **Admission**：负责CRD API资源的校验工作
- **Vcctl**：Volcano的命令行客户端工具
- **Agent**：运行在节点上的组件，负责资源监控和过度订阅管理。通过识别闲置资源并允许合理超卖，提高集群资源利用率。
- **Network-qos**：管理在线和离线工作负载间的网络带宽分配，确保在线服务网络质量的同时最大化集群带宽利用率。

### Scheduler

#### 介绍

Volcano 调度器是一个高度可配置和可扩展的 Kubernetes 调度器，专为处理复杂工作负载和特殊调度需求而设计。它提供了超越默认 Kubernetes 调度器的高级调度功能，使其特别适合高性能计算、机器学习和大数据工作负载。

调度器通过处理 `.spec.schedulerName` 与配置的调度器名称（默认为 "volcano"）匹配的 Pod 来运行。它按照调度周期工作，评估未调度的 Pod 并根据各种调度策略和插件找到最佳的节点放置位置。

Volcano 调度器支持自定义插件扩展，可以通过配置文件定义调度策略，并提供了丰富的指标和健康检查功能，以确保调度系统的可靠性和可观测性。

#### 参数

##### Kubernetes参数

| 参数名           | 描述                                       | 默认值 | 示例                                      |
| ---------------- | ------------------------------------------ | ------ | ----------------------------------------- |
| `master`         | Kubernetes API 服务器地址                  | -      | `--master=https://kubernetes.default.svc` |
| `kubeconfig`     | kubeconfig 文件路径                        | -      | `--kubeconfig=/etc/kubernetes/admin.conf` |
| `kube-api-qps`   | 与 Kubernetes API 服务器通信的 QPS 限制    | 2000.0 | `--kube-api-qps=1000`                     |
| `kube-api-burst` | 与 Kubernetes API 服务器通信的突发请求上限 | 2000   | `--kube-api-burst=1000`                   |

##### TLS 证书参数

| 参数名                 | 描述                                  | 默认值 | 示例                                          |
| ---------------------- | ------------------------------------- | ------ | --------------------------------------------- |
| `ca-cert-file`         | HTTPS 的 x509 证书文件                | -      | `--ca-cert-file=/etc/volcano/ca.crt`          |
| `tls-cert-file`        | HTTPS 的默认 x509 证书文件            | -      | `--tls-cert-file=/etc/volcano/tls.crt`        |
| `tls-private-key-file` | 与 tls-cert-file 匹配的 x509 私钥文件 | -      | `--tls-private-key-file=/etc/volcano/tls.key` |

##### 调度器配置参数

| 参数名            | 描述                                               | 默认值    | 示例                                           |
| ----------------- | -------------------------------------------------- | --------- | ---------------------------------------------- |
| `scheduler-name`  | Volcano 处理的 Pod 的 .spec.SchedulerName          | "volcano" | `--scheduler-name=volcano-scheduler`           |
| `scheduler-conf`  | 调度器配置文件的绝对路径                           | -         | `--scheduler-conf=/etc/volcano/scheduler.conf` |
| `schedule-period` | 每个调度周期之间的时间间隔                         | 1s        | `--schedule-period=2s`                         |
| `default-queue`   | 作业的默认队列名称                                 | "default" | `--default-queue=system`                       |
| `priority-class`  | 是否启用 PriorityClass 以提供 pod 组级别的抢占能力 | true      | `--priority-class=false`                       |

##### 节点选择和评分参数

| 参数名                             | 描述                                                         | 默认值 | 示例                                                         |
| ---------------------------------- | ------------------------------------------------------------ | ------ | ------------------------------------------------------------ |
| `minimum-feasible-nodes`           | 查找和评分的最小可行节点数                                   | 100    | `--minimum-feasible-nodes=50`                                |
| `minimum-percentage-nodes-to-find` | 查找和评分的最小节点百分比                                   | 5      | `--minimum-percentage-nodes-to-find=10`                      |
| `percentage-nodes-to-find`         | 每个调度周期中要评分的节点百分比；如果 <=0，将根据集群大小计算自适应百分比 | 0      | `--percentage-nodes-to-find=20`                              |
| `node-selector`                    | Volcano 只处理带有指定标签的节点                             | -      | `--node-selector=volcano.sh/role:train --node-selector=volcano.sh/role:serving` |
| `node-worker-threads`              | 同步节点操作的线程数                                         | 20     | `--node-worker-threads=30`                                   |

##### 插件和存储参数

| 参数名                 | 描述                                                  | 默认值 | 示例                                                         |
| ---------------------- | ----------------------------------------------------- | ------ | ------------------------------------------------------------ |
| `plugins-dir`          | vc-scheduler 将加载（但不激活）此目录中的自定义插件   | ""     | `--plugins-dir=/etc/volcano/plugins`                         |
| `csi-storage`          | 是否启用跟踪 CSI 驱动程序提供的可用存储容量           | false  | `--csi-storage=true`                                         |
| `ignored-provisioners` | 在计算 pod pvc 请求和抢占期间将被忽略的存储供应商列表 | -      | `--ignored-provisioners=rancher.io/local-path --ignored-provisioners=hostpath.csi.k8s.io` |

##### 监控和健康检查参数

| 参数名            | 描述                     | 默认值   | 示例                       |
| ----------------- | ------------------------ | -------- | -------------------------- |
| `enable-healthz`  | 是否启用健康检查         | false    | `--enable-healthz=true`    |
| `healthz-address` | 健康检查服务器的监听地址 | ":11251" | `--healthz-address=:11252` |
| `enable-metrics`  | 是否启用指标功能         | false    | `--enable-metrics=true`    |
| `listen-address`  | HTTP 请求的监听地址      | ":8080"  | `--listen-address=:8081`   |

##### 缓存和调试参数

| 参数名           | 描述                                 | 默认值 | 示例                                |
| ---------------- | ------------------------------------ | ------ | ----------------------------------- |
| `cache-dumper`   | 是否启用缓存转储器                   | true   | `--cache-dumper=false`              |
| `cache-dump-dir` | 转储缓存信息到 JSON 文件时的目标目录 | "/tmp" | `--cache-dump-dir=/var/log/volcano` |
| `version`        | 显示版本并退出                       | false  | `--version`                         |

##### 领导者选举参数

| 参数名                  | 描述                                                         | 默认值           | 示例                                  |
| ----------------------- | ------------------------------------------------------------ | ---------------- | ------------------------------------- |
| `lock-object-namespace` | 锁对象的命名空间（已弃用，请使用 --leader-elect-resource-namespace） | "volcano-system" | `--lock-object-namespace=kube-system` |

### Controller

#### 介绍

Volcano Controller 是 Volcano 的核心组件，负责管理和协调 Kubernetes 集群中的批处理作业和资源。它采用多控制器架构，包含作业控制器、队列控制器、PodGroup 控制器、垃圾回收控制器等多个专用模块，共同处理不同类型的资源对象和业务逻辑。

与传统的 Kubernetes 控制器相比，Volcano Controller 提供了更丰富的批处理作业管理能力，支持作业生命周期管理、资源队列维护、PodGroup 协调等高级特性，特别适合高性能计算和机器学习等场景。它通过框架化设计实现了良好的可扩展性，允许用户根据需求启用或禁用特定控制器。

Volcano Controller 与 Kubernetes 深度集成，使用领导者选举机制确保高可用性，同时提供健康检查和指标收集功能便于系统监控。其灵活的配置选项允许用户调整工作线程数、QPS 限制和资源管理策略等参数。

#### 参数

##### Kubernetes参数

| 参数名           | 描述                                       | 默认值 | 示例                                      |
| ---------------- | ------------------------------------------ | ------ | ----------------------------------------- |
| `master`         | Kubernetes API 服务器地址                  | -      | `--master=https://kubernetes.default.svc` |
| `kubeconfig`     | kubeconfig 文件路径                        | -      | `--kubeconfig=/etc/kubernetes/admin.conf` |
| `kube-api-qps`   | 与 Kubernetes API 服务器通信的 QPS 限制    | 50.0   | `--kube-api-qps=100`                      |
| `kube-api-burst` | 与 Kubernetes API 服务器通信的突发请求上限 | 100    | `--kube-api-burst=200`                    |

##### TLS 证书参数

| 参数名                 | 描述                                  | 默认值 | 示例                                          |
| ---------------------- | ------------------------------------- | ------ | --------------------------------------------- |
| `ca-cert-file`         | HTTPS 的 x509 证书文件                | -      | `--ca-cert-file=/etc/volcano/ca.crt`          |
| `tls-cert-file`        | HTTPS 的默认 x509 证书文件            | -      | `--tls-cert-file=/etc/volcano/tls.crt`        |
| `tls-private-key-file` | 与 tls-cert-file 匹配的 x509 私钥文件 | -      | `--tls-private-key-file=/etc/volcano/tls.key` |

##### 调度器配置参数

| 参数名                      | 描述                                       | 默认值    | 示例                                 |
| --------------------------- | ------------------------------------------ | --------- | ------------------------------------ |
| `scheduler-name`            | Volcano 处理的 Pod 的 .spec.SchedulerName  | "volcano" | `--scheduler-name=volcano-scheduler` |
| `worker-threads`            | 并发同步作业操作的线程数                   | 3         | `--worker-threads=5`                 |
| `max-requeue-num`           | 作业、队列或命令在队列中重新排队的最大次数 | 15        | `--max-requeue-num=20`               |
| `inherit-owner-annotations` | 创建 PodGroup 时是否继承所有者的注释       | true      | `--inherit-owner-annotations=false`  |

##### 专用线程参数

| 参数名                        | 描述                       | 默认值 | 示例                               |
| ----------------------------- | -------------------------- | ------ | ---------------------------------- |
| `worker-threads-for-podgroup` | 同步 PodGroup 操作的线程数 | 5      | `--worker-threads-for-podgroup=10` |
| `worker-threads-for-queue`    | 同步队列操作的线程数       | 5      | `--worker-threads-for-queue=10`    |
| `worker-threads-for-gc`       | 回收作业的线程数           | 1      | `--worker-threads-for-gc=2`        |

##### 健康检查和监控参数

| 参数名            | 描述                     | 默认值   | 示例                       |
| ----------------- | ------------------------ | -------- | -------------------------- |
| `healthz-address` | 健康检查服务器的监听地址 | ":11251" | `--healthz-address=:11252` |
| `enable-healthz`  | 是否启用健康检查         | false    | `--enable-healthz=true`    |
| `enable-metrics`  | 是否启用指标功能         | false    | `--enable-metrics=true`    |
| `listen-address`  | HTTP 请求的监听地址      | ":8081"  | `--listen-address=:8082`   |

##### 领导者选举参数

| 参数名                            | 描述                       | 默认值                  | 示例                                               |
| --------------------------------- | -------------------------- | ----------------------- | -------------------------------------------------- |
| `lock-object-namespace`           | 锁对象的命名空间（已弃用） | "volcano-system"        | `--lock-object-namespace=kube-system`              |
| `leader-elect`                    | 是否启用领导者选举         | -                       | `--leader-elect=true`                              |
| `leader-elect-resource-name`      | 领导者选举资源名称         | "vc-controller-manager" | -                                                  |
| `leader-elect-resource-namespace` | 领导者选举资源命名空间     | -                       | `--leader-elect-resource-namespace=volcano-system` |

##### 控制器管理参数

| 参数名        | 描述               | 默认值            | 示例                                              |
| ------------- | ------------------ | ----------------- | ------------------------------------------------- |
| `controllers` | 指定要启用的控制器 | "*"（所有控制器） | `--controllers=+job-controller,-queue-controller` |
| `version`     | 显示版本并退出     | false             | `--version`                                       |

##### 控制器列表

Volcano 支持以下控制器，可以通过 `controllers` 参数启用或禁用：

- `gc-controller`: 垃圾回收控制器
- `job-controller`: 作业控制器
- `jobflow-controller`: 作业流控制器
- `jobtemplate-controller`: 作业模板控制器
- `pg-controller`: PodGroup 控制器
- `queue-controller`: 队列控制器

使用 `*` 启用所有控制器，使用 `+[controller-name]` 显式启用特定控制器，使用 `-[controller-name]` 显式禁用特定控制器。

#### gc-controller

Garbage Collector 是一个专门的控制器，负责清理已完成的 Job 资源。它通过监听 Job 的创建和更新事件，识别那些已经完成（Completed、Failed 或 Terminated）且设置了 TTL（.spec.ttlSecondsAfterFinished）的 Job。

控制器维护一个工作队列，将需要清理的 Job 加入队列并在适当的时间处理。它会计算 Job 完成后的经过时间，当达到或超过指定的 TTL 时，通过 API 服务器删除这些 Job。对于尚未到期的 Job，控制器会将其重新加入队列，并设置在 TTL 到期时再次处理。

这种机制确保了已完成的 Job 不会永久占用集群资源，同时提供了灵活的资源回收策略，使用户可以根据需要保留 Job 历史记录一段时间后自动清理。

#### job-controller

Job Controller 是核心控制器，负责管理和协调 Job 资源的生命周期。它通过监听 Job、Pod、PodGroup 等资源的变化，处理相关事件并维护 Job 的状态。

控制器会根据 Job 的当前状态和触发的事件，调用相应的状态处理函数来同步 Job 资源，包括创建 Pod、检查 Pod 状态、更新 Job 状态等。

控制器实现了一个工作队列系统，使用哈希算法将 Job 分配到不同的工作队列中以实现并行处理。它还包含了一个延迟动作机制，允许某些操作在特定延迟后执行，如处理 Pod 失败或重试等情况。它还实现了错误处理和重试机制，当操作失败时会将请求重新加入队列，超过最大重试次数后会终止 Job 并释放资源。

#### jobflow-controller

jobflow-controller主要负责管理和协调 JobFlow CR的生命周期。它通过监听 JobFlow、JobTemplate 和 Job 资源的变化，处理相关事件并维护 JobFlow 的状态。

当 JobFlow 被创建或更新时，控制器会将请求加入工作队列，然后执行相应的状态转换操作，调用相应的处理函数来同步 JobFlow 资源，包括创建依赖的 Job、检查 Job 状态、更新 JobFlow 状态等。

它还负责处理错误情况，包括重试失败的请求和记录事件，以便用户了解 JobFlow 的运行状况

#### jobtemplate-controller

jobTemplate Controller 是负责管理 JobTemplate 资源的控制器。它通过监听 JobTemplate 和 Job 资源的创建事件，处理相关操作并维护 JobTemplate 的状态。

控制器初始化时会设置各种 informer 来监听资源变化，并创建工作队列来处理这些事件。

当一个 JobTemplate 被创建时，控制器会将其加入工作队列，然后执行同步操作，可能包括根据模板创建实际的 Job 资源。同样地，当一个 Job 被创建时，控制器也会检查是否需要更新相关的 JobTemplate 状态。

控制器实现了错误处理和重试机制，当操作失败时会将请求重新加入队列，直到达到最大重试次数。它还负责记录事件，以便用户了解 JobTemplate 的处理状态。

#### pg-controller

PodGroup Controller 是一个专门的控制器，负责为使用 Volcano 调度器的 Pod 自动创建和管理 PodGroup 资源。它通过监听 Pod 和 ReplicaSet 的创建和更新事件，识别那些需要 PodGroup 但尚未关联的 Pod。

控制器维护一个工作队列，将需要处理的 Pod 请求加入队列并处理。当检测到使用 Volcano 调度器但没有指定 PodGroup 的 Pod 时，控制器会自动创建相应的 PodGroup 资源，确保这些 Pod 能够被 Volcano 调度系统正确处理。

此外，当启用工作负载支持特性时，控制器还会监听 ReplicaSet 资源，为属于同一 ReplicaSet 的 Pod 创建统一的 PodGroup，从而支持更复杂的工作负载模式。控制器还可以根据配置从 Pod 所有者继承注解，实现更灵活的资源管理策略。

#### queue-controller

Queue Controller 是一个核心控制器，负责管理和维护 Volcano 调度系统中的队列状态。它通过监听 Queue、PodGroup 和 Command 资源的变化，协调队列的生命周期和状态转换。

控制器维护两个工作队列：一个处理队列状态变更请求，另一个处理队列命令。当队列状态需要变更时（如开启、关闭或同步），控制器会调用相应的状态处理函数执行状态转换。控制器还维护了队列与 PodGroup 之间的映射关系，确保资源分配和调度策略的正确实施。

当启用 QueueCommandSync 参数时，控制器还会监听 Command 资源，支持通过命令方式动态控制队列行为，如开启或关闭队列。控制器实现了错误处理和重试机制，当操作失败时会将请求重新加入队列，超过最大重试次数后会记录事件并放弃处理。这种设计确保了队列状态的一致性和可靠性，是 Volcano 调度系统的重要组成部分。

### Admission

#### 介绍

Volcano Admission 是 Volcano 系统的关键组件，负责验证和修改提交到 Kubernetes 集群的资源对象。它通过 Kubernetes 的 Webhook 机制实现，能够拦截特定资源的创建、更新和删除请求，并根据预定义的规则进行验证或修改。

Admission 支持多种资源的准入控制，包括 Jobs、PodGroups、Pods 和 Queues 等。通过配置不同的准入路径，可以灵活地控制哪些资源需要进行验证或变更。默认情况下，它会处理由 Volcano 调度器（默认名为 "volcano"）管理的 Pod 资源。

该组件提供了 HTTPS 服务以接收 Kubernetes API 服务器的准入请求，并支持健康检查功能，便于监控其运行状态。

#### 参数

##### Kubernetes 参数

| 参数名           | 描述                                                  | 默认值 | 示例                                      |
| ---------------- | ----------------------------------------------------- | ------ | ----------------------------------------- |
| `master`         | Kubernetes API 服务器的地址（覆盖 kubeconfig 中的值） | 空     | `--master=https://kubernetes.default.svc` |
| `kubeconfig`     | 包含认证和主服务器位置信息的 kubeconfig 文件路径      | 空     | `--kubeconfig=/etc/kubernetes/admin.conf` |
| `kube-api-qps`   | 与 Kubernetes API 服务器通信时的 QPS 限制             | 50.0   | `--kube-api-qps=100`                      |
| `kube-api-burst` | 与 Kubernetes API 服务器通信时的突发请求限制          | 100    | `--kube-api-burst=200`                    |

- Vcctl
Volcano vcctl是Volcano的命令行客户端工具。
##### TLS 证书参数

| 参数名                 | 描述                                        | 默认值 | 示例                                          |
| ---------------------- | ------------------------------------------- | ------ | --------------------------------------------- |
| `tls-cert-file`        | HTTPS 服务的 x509 证书文件路径              | 空     | `--tls-cert-file=/etc/volcano/tls.crt`        |
| `tls-private-key-file` | 与 `tls-cert-file` 匹配的 x509 私钥文件路径 | 空     | `--tls-private-key-file=/etc/volcano/tls.key` |
| `ca-cert-file`         | HTTPS 服务的 CA 证书文件路径                | 空     | `--ca-cert-file=/etc/volcano/ca.crt`          |

##### 服务配置参数

| 参数名           | 描述                                  | 默认值 | 示例                       |
| ---------------- | ------------------------------------- | ------ | -------------------------- |
| `listen-address` | Admission Controller 服务器监听的地址 | 空     | `--listen-address=0.0.0.0` |
| `port`           | Admission Controller 服务器使用的端口 | 8443   | `--port=8443`              |
| `version`        | 显示版本信息并退出                    | false  | `--version`                |

##### Webhook 配置参数

| 参数名                 | 描述                   | 默认值 | 示例                                                         |
| ---------------------- | ---------------------- | ------ | ------------------------------------------------------------ |
| `webhook-namespace`    | Webhook 所在的命名空间 | 空     | `--webhook-namespace=volcano-system`                         |
| `webhook-service-name` | Webhook 服务的名称     | 空     | `--webhook-service-name=volcano-admission`                   |
| `webhook-url`          | Webhook 的 URL         | 空     | `--webhook-url=https://volcano-admission.volcano-system:8443` |
| `admission-conf`       | Webhook 的配置文件路径 | 空     | `--admission-conf=/etc/volcano/admission.conf`               |

##### 准入控制参数

| 参数名              | 描述                                                    | 默认值                                                       | 示例                                              |
| ------------------- | ------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| `enabled-admission` | 启用的准入 Webhook 路径，多个路径用逗号分隔             | "/jobs/mutate,/jobs/validate,/podgroups/mutate,/pods/validate,/pods/mutate,/queues/mutate,/queues/validate" | `--enabled-admission=/jobs/mutate,/pods/validate` |
| `scheduler-name`    | Volcano 将处理 `.spec.SchedulerName` 与此参数匹配的 Pod | ["volcano"]                                                  | `--scheduler-name=volcano,custom-scheduler`       |

##### 健康检查参数

| 参数名            | 描述                           | 默认值   | 示例                       |
| ----------------- | ------------------------------ | -------- | -------------------------- |
| `enable-healthz`  | 是否启用健康检查               | false    | `--enable-healthz=true`    |
| `healthz-address` | 健康检查服务器监听的地址和端口 | ":11251" | `--healthz-address=:11252` |

### Vcctl

#### 介绍

`vcctl` 是 Volcano 提供的命令行工具，用于管理和操作 Volcano 集群中的资源。它提供了一组直观的命令，使用户能够轻松地查询、创建、修改和删除 Volcano 资源，如作业(Job)、队列(Queue)和 PodGroup 等。

该工具支持多种操作，包括列出、创建、删除和管理 Volcano 作业，控制作业的生命周期（挂起、恢复、运行），查询和管理队列资源，查看 PodGroup 状态和详情，以及与 Volcano 调度器交互。通过命令行界面，用户可以快速执行常见的管理任务，而无需直接操作 Kubernetes API 或 YAML 文件。这使得 Volcano 资源管理变得更加简单和高效，特别适合于批处理作业和高性能计算场景。

`vcctl` 工具采用了类似于 `kubectl` 的命令结构，使 Kubernetes 用户能够快速上手。它支持详细的帮助信息，用户可以通过 `vcctl -h` 或 `vcctl [command] -h` 获取各命令的详细用法和选项说明。作为 Volcano 生态系统的重要组成部分，`vcctl` 为用户提供了一个便捷的接口，简化了复杂批处理工作负载的管理和操作流程。

#### 参数

vcctl不需要其他额外参数，直接启动即可。

### Agent

#### 介绍

Agent 是运行在 Kubernetes 节点上的组件，主要负责资源监控和过度订阅管理。它通过识别节点上的闲置资源并允许合理超卖，显著提高集群资源利用率。

Agent 持续监控节点资源使用情况，为 Volcano 调度系统提供准确的资源信息，支持更智能的调度决策。在资源紧张时，它能够执行资源回收操作，确保关键工作负载的性能不受影响。

通过与 Kubernetes CGroup 系统的深度集成，Agent 实现了精细化的资源控制，是 Volcano 高效批处理调度的重要支撑组件，特别适合高性能计算和机器学习等场景。

#### 参数

##### Kubernetes 参数

| 参数名                 | 类型   | 默认值                        | 描述                                                         |
| ---------------------- | ------ | ----------------------------- | ------------------------------------------------------------ |
| `--kube-cgroup-root`   | string | `""`                          | Kubernetes 的 cgroup 根路径。如果启用了 CgroupsPerQOS，这是 QOS cgroup 层次结构的根 |
| `--kube-node-name`     | string | 环境变量 `KUBE_NODE_NAME`     | Agent 运行所在的节点名称                                     |
| `--kube-pod-name`      | string | 环境变量 `KUBE_POD_NAME`      | Agent 所在 Pod 的名称                                        |
| `--kube-pod-namespace` | string | 环境变量 `KUBE_POD_NAMESPACE` | Agent 所在 Pod 的命名空间                                    |

##### 健康检查参数

| 参数名              | 类型   | 默认值 | 描述                     |
| ------------------- | ------ | ------ | ------------------------ |
| `--healthz-address` | string | `""`   | 健康检查服务器监听的地址 |
| `--healthz-port`    | int    | `3300` | 健康检查服务器监听的端口 |

##### 资源过度订阅参数

| 参数名                      | 类型   | 默认值     | 描述                                                         |
| --------------------------- | ------ | ---------- | ------------------------------------------------------------ |
| `--oversubscription-policy` | string | `"extend"` | 过度订阅策略，决定过度订阅资源的报告和使用方式。默认为 `extend`，表示报告为扩展资源 |
| `--oversubscription-ratio`  | int    | `60`       | 过度订阅比率，决定有多少闲置资源可以被超卖，单位为百分比     |
| `--include-system-usage`    | bool   | `false`    | 是否在计算过度订阅资源和执行驱逐时考虑系统资源使用情况       |

##### 功能特性参数

| 参数名                 | 类型     | 默认值  | 描述                                                         |
| ---------------------- | -------- | ------- | ------------------------------------------------------------ |
| `--supported-features` | []string | `["*"]` | 支持的特性列表。`*` 表示支持所有默认启用的特性，`foo` 表示支持名为 `foo` 的特性，`-foo` 表示不支持名为 `foo` 的特性 |

#### Network-qos

##### 介绍

Network插件是一个专为 Kubernetes 集群设计的网络带宽管理解决方案，与Agent组件一同使用，旨在智能调节不同类型工作负载之间的网络资源分配。该插件通过 CNI 机制与现有网络插件链式组合，实现对容器网络流量的精细控制。

它的核心功能是区分在线和离线工作负载，并根据在线服务的实时带宽需求动态调整离线作业的带宽上限。当在线服务的带宽使用超过预设水位线时，系统会自动降低离线作业的可用带宽，确保关键业务服务质量；当在线服务带宽需求较低时，系统则允许离线作业使用更多带宽资源，提高集群整体资源利用率。

该插件基于 Linux TC（Traffic Control）和 eBPF 技术实现，提供高效、低开销的网络流量管理能力，是混合部署环境中保障服务质量的重要工具。

###### 参数

| 参数名称                   | 说明                                                         | 默认值 | 类型   |
| -------------------------- | ------------------------------------------------------------ | ------ | ------ |
| `CheckoutInterval`         | 检查和更新离线作业带宽限制的时间间隔                         | 无     | string |
| `OnlineBandwidthWatermark` | 在线作业的带宽阈值，是所有在线 Pod 带宽使用的总和上限        | 无     | string |
| `OfflineLowBandwidth`      | 当在线作业带宽使用超过水位线时，离线作业可使用的最大网络带宽 | 无     | string |
| `OfflineHighBandwidth`     | 当在线作业带宽使用未达到水位线时，离线作业可使用的最大网络带宽 | 无     | string |
| `EnableNetworkQoS`         | 是否启用网络 QoS 功能                                        | false  | bool   |

## Helm

如果需要查看完整的Helm参数，可以通过这里[Volcano Helm](https://github.com/volcano-sh/volcano/blob/master/installer/helm/chart/volcano/values.yaml)获取
