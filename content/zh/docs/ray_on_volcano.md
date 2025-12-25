+++
title =  "Ray on Volcano"

date = 2025-12-22
lastmod = 2025-12-22

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Ray"
[menu.docs]
  parent = "ecosystem"
  weight = 9

+++



### Ray简介

[Ray](https://docs.ray.io/en/latest/ray-overview/getting-started.html) 是一个专为AI/ML应用设计的统一分布式计算框架。Ray提供以下核心能力：

- **分布式训练**：将机器学习工作负载从单机扩展到数千个节点
- **超参数调优**：通过Ray Tune运行并行实验，实现高效的模型优化
- **分布式数据处理**：使用Ray Data处理大规模数据集，支持批量推理和数据预处理
- **强化学习**：通过Ray RLlib大规模训练强化学习模型
- **模型服务**：使用Ray Serve在生产环境中部署和扩展机器学习模型
- **通用分布式计算**：使用Ray Core API构建任意分布式应用

### 在Volcano上运行Ray

当前有两种方式可以在Volcano上部署Ray集群：

1. **KubeRay Operator方式**：通过集成Volcano调度器的KubeRay Operator实现`RayCluster`, `RayService`和`RayJob`资源的自动化部署和管理
2. **Volcano Job (vcjob) 方式**：通过Volcano Job配合Ray插件直接部署Ray集群

以上两种方式都可以充分利用Volcano强大的调度能力，包括gang调度和网络拓扑感知调度，以实现最优的资源分配。

### 方法一：使用KubeRay Operator

[KubeRay](https://docs.ray.io/en/latest/cluster/kubernetes/index.html) 是一个开源的Kubernetes Operator，可以简化在Kubernetes上运行Ray的流程。它通过Kubernetes原生的工具和API实现Ray集群的自动化部署、扩缩容和管理。

#### KubeRay与Volcano集成

从KubeRay v1.5.1版本开始，所有KubeRay资源（RayJob、RayCluster和RayService）均支持Volcano的高级调度特性，包括gang调度和网络拓扑感知调度。该集成能够优化资源分配并提升分布式AI/ML工作负载的性能。

#### 支持的标签

在RayJob和RayCluster资源的metadata部分，可以使用以下标签配置Volcano调度：

| 标签 | 描述 | 是否必需 |
|------|------|----------|
| `ray.io/priority-class-name` | 为Pod调度分配[Kubernetes](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/#priorityclass)优先级类 | 否 |
| `volcano.sh/queue-name` | 指定资源提交的Volcano队列 | 否 |
| `volcano.sh/network-topology-mode` | 配置网络拓扑感知调度模式 | 否 |
| `volcano.sh/network-topology-highest-tier-allowed` | 设置调度允许的最高网络层级 | 否 |

#### 自动扩缩容行为

KubeRay与Volcano的集成会根据自动扩缩容是否启用采用不同的gang调度策略：

- **启用自动扩缩容时**：使用`minReplicas`进行gang调度
- **禁用自动扩缩容时**：使用期望的副本数进行gang调度

这确保了在支持灵活扩缩容行为的同时，gang调度约束能够得到正确维护。

以下是包含详细说明的配置示例。有关完整的配置选项，请参阅[KubeRay Volcano调度器文档](https://docs.ray.io/en/latest/cluster/kubernetes/k8s-ecosystem/volcano.html#kuberay-integration-with-volcano)。


#### 环境要求

在使用KubeRay部署Ray之前，请确保：

- 已安装Volcano的Kubernetes集群正常运行
- 已安装支持Volcano批处理调度器的KubeRay Operator：

```bash
# Install KubeRay Operator with Volcano integration
$ helm install kuberay-operator kuberay/kuberay-operator --version 1.5.1 --set batchScheduler.name=volcano
```

#### 部署示例

##### RayCluster示例

使用Volcano调度部署RayCluster：

```bash
# Download the sample RayCluster configuration with Volcano labels
$ curl -LO https://raw.githubusercontent.com/ray-project/kuberay/v1.5.1/ray-operator/config/samples/ray-cluster.volcano-scheduler.yaml

# Apply the configuration
$ kubectl apply -f ray-cluster.volcano-scheduler.yaml

# Verify the RayCluster deployment
$ kubectl get pod -l ray.io/cluster=test-cluster-0

# Expected output:
# NAME                                 READY   STATUS    RESTARTS   AGE
# test-cluster-0-head-jj9bg            1/1     Running   0          36s
```

##### RayJob示例

从KubeRay v1.5.1版本开始支持RayJob与Volcano的集成：

```bash
# Download the sample RayJob configuration with Volcano queue integration
$ curl -LO https://raw.githubusercontent.com/ray-project/kuberay/v1.5.1/ray-operator/config/samples/ray-job.volcano-scheduler-queue.yaml

# Apply the configuration
$ kubectl apply -f ray-job.volcano-scheduler-queue.yaml

# Monitor the job execution
$ kubectl get pod

# Expected output:
# NAME                                             READY   STATUS      RESTARTS   AGE
# rayjob-sample-0-k449j-head-rlgxj                 1/1     Running     0          93s
# rayjob-sample-0-k449j-small-group-worker-c6dt8   1/1     Running     0          93s
# rayjob-sample-0-k449j-small-group-worker-cq6xn   1/1     Running     0          93s
# rayjob-sample-0-qmm8s                            0/1     Completed   0          32s
```

### 方法二：使用Volcano Job配合Ray插件

Volcano提供了原生的Ray插件，可以简化通过Volcano Job直接部署Ray集群的流程。该方式作为KubeRay的轻量级替代方案，允许用户使用Volcano的作业管理能力来管理Ray集群。

#### Ray插件工作原理

Ray插件自动完成以下配置：

- 为Ray集群中的head节点和worker节点配置启动命令
- 开放Ray服务所需的端口（GCS：6379，Dashboard：8265，Client Server：10001）
- 创建映射到Ray head节点的Kubernetes Service，用于作业提交和Dashboard访问

#### 环境要求

在使用Volcano Job部署Ray之前，请确保：

- 已安装Volcano并启用Ray插件
- 同时启用`svc`插件（创建Service所必需）

#### 部署示例

创建一个包含1个head节点和2个worker节点的Ray集群：

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: ray-cluster-job
spec:
  minAvailable: 3
  schedulerName: volcano
  plugins:
    ray: []
    svc: []
  policies:
    - event: PodEvicted
      action: RestartJob
  queue: default
  tasks:
    - replicas: 1
      name: head
      template:
        spec:
          containers:
            - name: head
              image: rayproject/ray:latest-py311-cpu
              resources: {}
          restartPolicy: OnFailure
    - replicas: 2
      name: worker
      template:
        spec:
          containers:
            - name: worker
              image: rayproject/ray:latest-py311-cpu
              resources: {}
          restartPolicy: OnFailure
```

应用配置：
```bash
kubectl apply -f ray-cluster-job.yaml
```

#### 访问Ray集群

部署完成后，可以通过自动创建的Service访问Ray集群：

```bash
# Check pod status
kubectl get pod
# Expected output:
# NAME                       READY   STATUS    RESTARTS   AGE
# ray-cluster-job-head-0     1/1     Running   0          106s
# ray-cluster-job-worker-0   1/1     Running   0          106s
# ray-cluster-job-worker-1   1/1     Running   0          106s

# Check service
kubectl get service
# Expected output includes:
# ray-cluster-job-head-svc   ClusterIP   10.96.184.65   <none>   6379/TCP,8265/TCP,10001/TCP

# Port-forward to access Ray Dashboard
kubectl port-forward service/ray-cluster-job-head-svc 8265:8265

# Submit a job to the cluster
ray job submit --address http://localhost:8265 -- python -c "import ray; ray.init(); print(ray.cluster_resources())"
```

### 了解更多

- 有关KubeRay集成的详细信息，请访问[KubeRay Volcano调度器文档](https://docs.ray.io/en/latest/cluster/kubernetes/k8s-ecosystem/volcano.html#kuberay-integration-with-volcano)
- 有关Volcano Job Ray插件的详细信息，请参阅[Volcano Ray插件指南](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_ray_plugin.md)