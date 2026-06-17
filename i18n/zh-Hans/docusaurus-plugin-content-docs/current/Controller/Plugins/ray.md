---
title: Ray
---


## 介绍

**Ray插件**旨在优化用户部署ray集群时的体验，它不仅可以让用户编写更少的yaml，还支持用户部署ray集群。

## Ray 插件的工作原理

Ray 插件将做三件事：

* 配置ray集群中头节点和工作节点的命令。
* 打开射线头节点使用的三个端口。 （GCS、Ray 仪表板和客户端服务器）
* 创建映射到射线头节点容器端口的服务。 （例如，提交 ray 作业、访问 ray 仪表板和客户端服务器）

> *注*
> - 该插件基于 ray cli（命令行界面），本指南使用[官方 ray docker 镜像](https://hub.docker.com/r/rayproject/ray)。
> - **使用ray插件时需要svc插件**。

## Ray插件的参数

### 参数

| ID  | 名称             | 类型   | 默认值 | 是否必填 | 描述                             | 示例                  |
| --- | ---------------- | ------ | ------------- | -------- | --------------------------------------- | ------------------------ |
| 1   | head             | string | head          | 否       | Volcano 作业中头任务的名称 | --head=head              |
| 2   | worker           | string | worker        | 否       | Volcano 作业中工作任务的名称 | --worker=worker          |
| 3   | headContainer    | string | head          | 否       | 头任务中主容器的名称 | --headContainer=head     |
| 4   | workerContainer  | string | worker        | 否       | 工作任务中主容器的名称 | --workerContainer=worker |
| 5   | port             | string | 6379          | 否       | 为 GCS 打开的端口 | --port=6379              |
| 6   | dashboardPort    | string | 8265          | 否       | 为 Ray 仪表板打开的端口 | --dashboardPort=8265     |
| 7   | clientServerPort | string | 10001         | 否       | 为客户端服务器打开的端口 | --clientServerPort=10001 |

## 示例
> 本指南基于 [RayCluster 快速入门](https://docs.ray.io/en/master/cluster/kubernetes/getting-started/raycluster-quick-start.html#step-4-run-an-application-on-a-raycluster) 中提供的说明。

首先，使用下面显示的 YAML 清单创建一个 Ray 集群。
- 有关 Ray 集群的更多详细信息，请参阅 [Ray 集群核心概念文档](https://docs.ray.io/en/latest/cluster/key-concepts.html)。
- 有关如何构建 Ray 集群的更多详细信息，请参阅 [启动本地集群](https://docs.ray.io/en/latest/cluster/vms/user-guides/launching-clusters/on-premises.html#on-prem)。
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

一旦应用，将配置一个由“头节点”和一个或多个“工作节点”组成的 Ray 集群。

```sh
kubectl get pod
```

```sh
NAME                       READY   STATUS    RESTARTS   AGE
ray-cluster-job-head-0     1/1     Running   0          106s
ray-cluster-job-worker-0   1/1     Running   0          106s
ray-cluster-job-worker-1   1/1     Running   0          106s
```

与集群一起，还会创建一个 `ray-cluster-job-head-svc` [Kubernetes 服务](https://kubernetes.io/docs/concepts/services-networking/service/) 资源。
（`ray-cluster-job` `service` 是由 `svc` 插件创建的。）
```sh
kubectl get service 
```

```bash
NAME                       TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)                       AGE
ray-cluster-job            ClusterIP   None           <none>        <none>                        3s
ray-cluster-job-head-svc   ClusterIP   10.96.184.65   <none>        6379/TCP,8265/TCP,10001/TCP   3s
```

现在服务名称可用，使用端口转发来访问 Ray Dashboard 端口（默认为 8265）。

```sh
# Execute this in a separate shell.
kubectl port-forward service/ray-cluster-job-head-svc 8265:8265 > /dev/null &
```

现在可以访问仪表板端口了，向 RayCluster 提交作业：
```sh
# The following job's logs will show the Ray cluster's total resource capacity, including 2 CPUs.
ray job submit --address http://localhost:8265 -- python -c "import ray; ray.init(); print(ray.cluster_resources())"
```

```sh
Job submission server address: http://localhost:8265

-------------------------------------------------------
作业“raysubmit_W8nYZjW4HEFG6Mqa”提交成功
-------------------------------------------------------

后续步骤
  查询作业的日志：
    ray 作业日志raysubmit_W8nYZjW4HEFG6Mqa
  查询作业状态：
    射线作业状态raysubmit_W8nYZjW4HEFG6Mqa
  请求停止作业：
    射线作业停止raysubmit_W8nYZjW4HEFG6Mqa

跟踪日志直到作业退出（使用 --no-wait 禁用）：
2025-09-23 14:58:49,442 INFO job_manager.py:531 -- 正在设置运行时环境。
2025-09-23 14:59:00,106 INFO worker.py:1630 -- 使用环境变量 RAY_ADDRESS 中设置的地址 10.244.2.42:6379
2025-09-23 14:59:00,144 INFO worker.py:1771 -- 连接到地址为 10.244.2.42:6379 的现有 Ray 集群...
2025-09-23 14:59:00,161 INFO worker.py:1942 -- 连接到 Ray 集群。查看仪表板：http://10.244.2.42:8265 
{'内存'：16277940225.0，'节点：10.244.4.41'：1.0，'object_store_memory'：6976260095.0，'CPU'：30.0，'节点：10.244.3.42'：1.0，'节点：10.244.2.42'： 1.0, '节点:__internal_head__': 1.0}

------------------------------------------
作业“raysubmit_W8nYZjW4HEFG6Mqa”成功
------------------------------------------

```

在浏览器中访问 `${YOUR_IP}:8265` 查看仪表板。例如，“127.0.0.1:8265”。在“最近的作业”窗格中查看您在上面提交的作业，如下所示。

![ray_dashboard](/img/ray-dashboard.png)