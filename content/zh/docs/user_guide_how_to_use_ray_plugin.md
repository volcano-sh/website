++
title = "Ray 插件用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_ray_plugin/"
[menu.docs]
  parent = "user-guide"
++

## 介绍

**Ray 插件** 用于在 Volcano 上简化 Ray 集群的部署与使用体验，既减少用户编写 YAML 的复杂度，又方便快速起一个 Ray 集群。

## Ray 插件的工作机制

Ray 插件主要完成三件事：

* 为 Ray 集群中的 head 和 worker 节点配置启动命令；
* 为 head 节点开放 Ray 使用的三个端口（GCS、Ray Dashboard、Client server）；
* 创建一个 Service 映射到 head 节点容器端口，以便：
  - 提交 Ray 作业；
  - 访问 Ray Dashboard；
  - 访问客户端服务。

> **说明**
> - 插件基于 Ray CLI（命令行接口），本文示例使用的是 [官方 Ray Docker 镜像](https://hub.docker.com/r/rayproject/ray)；
> - 使用 Ray 插件时，**必须启用 `svc` 插件**。

## Ray 插件参数

### 参数列表

| ID | 名称             | 类型   | 默认值   | 必须 | 描述                                  | 示例                      |
|----|------------------|--------|----------|------|---------------------------------------|---------------------------|
| 1  | head             | string | head     | 否   | Volcano Job 中 head Task 的名称       | `--head=head`             |
| 2  | worker           | string | worker   | 否   | Volcano Job 中 worker Task 的名称     | `--worker=worker`         |
| 3  | headContainer    | string | head     | 否   | head Task 中主容器的名称              | `--headContainer=head`    |
| 4  | workerContainer  | string | worker   | 否   | worker Task 中主容器的名称            | `--workerContainer=worker`|
| 5  | port             | string | 6379     | 否   | GCS 使用的端口                        | `--port=6379`             |
| 6  | dashboardPort    | string | 8265     | 否   | Ray Dashboard 使用的端口              | `--dashboardPort=8265`    |
| 7  | clientServerPort | string | 10001    | 否   | Client server 使用的端口              | `--clientServerPort=10001`|

## 示例

> 本节示例基于 Ray 官方文档中的 [RayCluster Quick Start](https://docs.ray.io/en/master/cluster/kubernetes/getting-started/raycluster-quick-start.html#step-4-run-an-application-on-a-raycluster)。

首先，使用如下 YAML 创建一个 Ray 集群：

> 更多关于 Ray 集群的概念，请参考 [Ray Cluster Key Concepts](https://docs.ray.io/en/latest/cluster/key-concepts.html)；  
> 如何编排 Ray 集群，可参考 [Launching an On-Premise Cluster](https://docs.ray.io/en/latest/cluster/vms/user-guides/launching-clusters/on-premises.html#on-prem)。

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

应用该 YAML 后，会创建一个由 1 个 head 节点和多个 worker 节点组成的 Ray 集群：

```sh
kubectl get pod
```

```sh
NAME                       READY   STATUS    RESTARTS   AGE
ray-cluster-job-head-0     1/1     Running   0          106s
ray-cluster-job-worker-0   1/1     Running   0          106s
ray-cluster-job-worker-1   1/1     Running   0          106s
```

同时会创建名为 `ray-cluster-job-head-svc` 的 Kubernetes Service（Service `ray-cluster-job` 为 `svc` 插件创建的 headless service）：

```sh
kubectl get service 
```

```bash
NAME                       TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)                       AGE
ray-cluster-job            ClusterIP   None           <none>        <none>                        3s
ray-cluster-job-head-svc   ClusterIP   10.96.184.65   <none>        6379/TCP,8265/TCP,10001/TCP   3s
```

接下来，通过端口转发访问 Ray Dashboard（默认 8265 端口）：

```sh
# 在单独的终端中执行
kubectl port-forward service/ray-cluster-job-head-svc 8265:8265 > /dev/null &
```

当 Dashboard 端口可访问后，即可向 RayCluster 提交作业：

```sh
# 以下作业日志会打印 Ray 集群的整体资源容量（包含 2 个 CPU）
ray job submit --address http://localhost:8265 -- python -c "import ray; ray.init(); print(ray.cluster_resources())"
```

示例输出：

```sh
Job submission server address: http://localhost:8265

-------------------------------------------------------
Job 'raysubmit_W8nYZjW4HEFG6Mqa' submitted successfully
-------------------------------------------------------

Next steps
  Query the logs of the job:
    ray job logs raysubmit_W8nYZjW4HEFG6Mqa
  Query the status of the job:
    ray job status raysubmit_W8nYZjW4HEFG6Mqa
  Request the job to be stopped:
    ray job stop raysubmit_W8nYZjW4HEFG6Mqa

Tailing logs until the job exits (disable with --no-wait):
2025-09-23 14:58:49,442	INFO job_manager.py:531 -- Runtime env is setting up.
2025-09-23 14:59:00,106	INFO worker.py:1630 -- Using address 10.244.2.42:6379 set in the environment variable RAY_ADDRESS
2025-09-23 14:59:00,144	INFO worker.py:1771 -- Connecting to existing Ray cluster at address: 10.244.2.42:6379...
2025-09-23 14:59:00,161	INFO worker.py:1942 -- Connected to Ray cluster. View the dashboard at http://10.244.2.42:8265 
{'memory': 16277940225.0, 'node:10.244.4.41': 1.0, 'object_store_memory': 6976260095.0, 'CPU': 30.0, 'node:10.244.3.42': 1.0, 'node:10.244.2.42': 1.0, 'node:__internal_head__': 1.0}

------------------------------------------
Job 'raysubmit_W8nYZjW4HEFG6Mqa' succeeded
------------------------------------------
```

然后在浏览器中访问 `${YOUR_IP}:8265`（例如 `127.0.0.1:8265`），即可打开 Ray Dashboard，在 “Recent jobs” 面板中看到刚才提交的作业：

![ray_dashboard](/img/ray-dashboard.png)

