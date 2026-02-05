+++
title = "Volcano Job 插件 -- SVC 用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_svc_plugin/"
[menu.docs]
  parent = "user-guide"
+++

## 背景

**SVC 插件** 为同一 Volcano Job 内的 Pod 提供服务发现与通信能力，对于 [TensorFlow](https://tensorflow.google.cn/) 和 [MPI](https://www.open-mpi.org/) 等分布式工作负载尤为重要。  
例如，在 TensorFlow 作业中，`ps` 与 `worker` 之间需要互相发现并通信，SVC 插件可以让它们通过域名互访。

## 关键点

- 启用 `svc` 插件后，所有 Pod 的 `spec.hostname` 字段会被自动设置为 **Pod 名称**，即：`pod.spec.hostname = pod.metadata.name`；
- 启用 `svc` 插件后，所有 Pod 的 `spec.subdomain` 字段会被自动设置为 **Job 名称**，即：`pod.spec.subdomain = job.metadata.name`；
- 启用 `svc` 插件后，会为 Job 下的所有容器（包括 initContainers）注册环境变量 `VC_%s_NUM`，其中 `%s` 为 Task 名，值为该 Task 的副本数（replicas）。环境变量数量取决于 Task 数量（大多数 AI/大数据作业通常为 2 个角色，例如 Spark 的 `driver` 和 `executor`）；
- 同时会为所有容器注册环境变量 `VC_%s_HOSTS`，其中 `%s` 为 Task 名，值为该 Task 下所有 Pod 的域名列表；
- 会自动创建一个名为 `job-name-svc` 的 ConfigMap，其中包含：
  - 每个 Task 的副本数；
  - 各 Task 下所有 Pod 的域名；
  该 ConfigMap 将以卷的形式挂载到 Job 下所有 Pod 的 `/etc/volcano/` 目录；
- 会为该 Job 创建一个 **headless Service**，其名称与 Job 名相同；
- 若 `disable-network-policy` 未显式设置为 true，则会为该 Job 创建一条 `Ingress` 类型的 `NetworkPolicy`，仅允许同 Job 内 Pod 之间流量互通。

## 参数

| ID | 名称                          | 取值          | 默认值  | 必须 | 描述                                     | 示例                                      |
|----|-------------------------------|---------------|---------|------|------------------------------------------|-------------------------------------------|
| 1  | `publish-not-ready-addresses` | `true`/`false`| `false` | 否   | 是否在 Pod 尚未就绪时也发布其地址       | `svc: ["--publish-not-ready-addresses=true"]` |
| 2  | `disable-network-policy`      | `true`/`false`| `false` | 否   | 是否关闭该 Job 的 NetworkPolicy 管控    | `svc: ["--disable-network-policy=true"]`  |

## 示例

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-dist-mnist
spec:
  minAvailable: 3
  schedulerName: volcano
  plugins:
    env: []
    svc: [
        "--publish-not-ready-addresses=false",
        "--disable-network-policy=false",
      ] ## 注册 SVC 插件
  policies:
    - event: PodEvicted
      action: RestartJob
  queue: default
  tasks:
    - replicas: 1
      name: ps
      template:
        spec:
          containers:
            - command:
                - sh
                - -c
                - |
                  PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' | sed 's/^/"/;s/$/"/' | tr "\n" ","`;    ## 从生成的 host 文件中获取 ps 主机域名
                  WORKER_HOST=`cat /etc/volcano/worker.host | sed 's/$/&:2222/g' | sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  export TF_CONFIG={\"cluster\":{\"ps\":[${PS_HOST}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"ps\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};
                  python /var/tf_dist_mnist/dist_mnist.py
              image: volcanosh/dist-mnist-tf-example:0.0.1
              name: tensorflow
              ports:
                - containerPort: 2222
                  name: tfjob-port
              resources: {}
          restartPolicy: Never
    - replicas: 2
      name: worker
      policies:
        - event: TaskCompleted
          action: CompleteJob
      template:
        spec:
          containers:
            - command:
                - sh
                - -c
                - |
                  PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' | sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  WORKER_HOST=`cat /etc/volcano/worker.host | sed 's/$/&:2222/g' | sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  export TF_CONFIG={\"cluster\":{\"ps\":[${PS_HOST}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"worker\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};
                  python /var/tf_dist_mnist/dist_mnist.py
              image: volcanosh/dist-mnist-tf-example:0.0.1
              name: tensorflow
              ports:
                - containerPort: 2222
                  name: tfjob-port
              resources: {}
          restartPolicy: Never
```

## 进一步说明

### Pod 上的 hostname / subdomain

以 `ps` Pod 为例，配置中会自动加入如下字段：

```yaml
...
spec:
  ...
  hostname: tensorflow-dist-mnist-ps-0    ## 自动添加的 hostname
  ...
  subdomain: tensorflow-dist-mnist        ## 自动添加的 subdomain
...
```

### 环境变量示例

在 `ps` Pod 中，与 SVC 相关的环境变量如下：

```bash
[root@tensorflow-dist-mnist-ps-0 /] env | grep VC
VC_PS_NUM=1
VC_PS_HOSTS=tensorflow-dist-mnist-ps-0.tensorflow-dist-mnist  ## ps Pod 域名
VC_WORKER_NUM=2
VC_WORKER_HOSTS=tensorflow-dist-mnist-worker-0.tensorflow-dist-mnist,tensorflow-dist-mnist-worker-1.tensorflow-dist-mnist  ## 所有 worker Pod 域名
```

### `/etc/volcano/` 下的 host 文件

在 `ps` Pod 中：

```bash
[root@tensorflow-dist-mnist-ps-0 /] ls /etc/volcano/
VC_PS_HOSTS  VC_PS_NUM  VC_WORKER_HOSTS  VC_WORKER_NUM  ps.host  worker.host

[root@tensorflow-dist-mnist-ps-0 /] cat /etc/volcano/ps.host
tensorflow-dist-mnist-ps-0.tensorflow-dist-mnist

[root@tensorflow-dist-mnist-ps-0 /] cat /etc/volcano/worker.host
tensorflow-dist-mnist-worker-0.tensorflow-dist-mnist
tensorflow-dist-mnist-worker-1.tensorflow-dist-mnist
```

### 生成的 Headless Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: tensorflow-dist-mnist
  namespace: default
  ...
spec:
  clusterIP: None
  selector:
    volcano.sh/job-name: tensorflow-dist-mnist
    volcano.sh/job-namespace: default
  type: ClusterIP
```

### 生成的 ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tensorflow-dist-mnist-svc
  namespace: default
data:
  VC_PS_HOSTS: tensorflow-dist-mnist-ps-0.tensorflow-dist-mnist
  VC_PS_NUM: "1"
  VC_WORKER_HOSTS: tensorflow-dist-mnist-worker-0.tensorflow-dist-mnist,tensorflow-dist-mnist-worker-1.tensorflow-dist-mnist
  VC_WORKER_NUM: "2"
  ps.host: tensorflow-dist-mnist-ps-0.tensorflow-dist-mnist
  worker.host: |-
    tensorflow-dist-mnist-worker-0.tensorflow-dist-mnist
    tensorflow-dist-mnist-worker-1.tensorflow-dist-mnist
```

### 生成的 NetworkPolicy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: tensorflow-dist-mnist
  namespace: default
spec:
  ingress:
    - from:
        - podSelector:
            matchLabels:
              volcano.sh/job-name: tensorflow-dist-mnist
              volcano.sh/job-namespace: default
  podSelector:
    matchLabels:
      volcano.sh/job-name: tensorflow-dist-mnist
      volcano.sh/job-namespace: default
  policyTypes:
    - Ingress
```

## 注意事项

- 集群中需要安装 DNS 插件（如 `coredns`）以支持域名解析；
- Kubernetes 版本需 >= v1.14。

