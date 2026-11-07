---
title: "Ray on Volcano"
sidebar_position: 8
---
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

1. **KubeRay Operator方式**：通过集成Volcano调度器的KubeRay Operator，直接支持`RayCluster`和`RayJob`资源的自动化部署和管理。`RayService`本身不创建PodGroup，而是通过其创建的`RayCluster`间接获得gang调度，该路径未经过验证
2. **Volcano Job (vcjob) 方式**：通过Volcano Job配合Ray插件直接部署Ray集群

以上两种方式都可以充分利用Volcano强大的调度能力，包括gang调度和网络拓扑感知调度，以实现最优的资源分配。

### 方法一：使用KubeRay Operator

[KubeRay](https://docs.ray.io/en/latest/cluster/kubernetes/index.html) 是一个开源的Kubernetes Operator，可以简化在Kubernetes上运行Ray的流程。它通过Kubernetes原生的工具和API实现Ray集群的自动化部署、扩缩容和管理。

{/* This is a raw anchor so that Docusaurus does not add the /zh-Hans/ locale prefix. The broken-link checker does not cover it. It targets the English heading "Method 1: Using KubeRay Operator" in docs/Ecosystem/RayOnVolcano.md, so update it if that heading or page is renamed. */}

KubeRay与Volcano集成的完整说明（包括支持的标签、PodGroup的计算规则、RayCluster和RayJob的部署示例，以及网络拓扑感知调度的配置）已在英文文档中更新。请参阅英文版<a href="/docs/Ecosystem/RayOnVolcano#method-1-using-kuberay-operator">Ray on Volcano</a>中的 “Method 1: Using KubeRay Operator” 一节。

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
- 有关Volcano Job Ray插件的详细信息，请参阅[Volcano Ray插件指南](/docs/UserGuide/user_guide_how_to_use_ray_plugin)