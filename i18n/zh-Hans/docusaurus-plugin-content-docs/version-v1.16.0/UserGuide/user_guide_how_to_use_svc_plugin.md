---
title: "Volcano Job 插件 -- SVC 用户指南"
---

## 背景

**SVC 插件**用于实现 Volcano Job 内 Pod 之间的通信，这在 [TensorFlow](https://tensorflow.google.cn/)、[MPI](https://www.open-mpi.org/) 等分布式工作负载中是必需的。例如，TensorFlow 作业中的 `ps` 与 `worker` 需要相互访问。启用 `svc` 插件后，同一 Job 内的 Pod 可通过域名互相访问。

## 要点

- 配置 `svc` 插件后，Job 下所有 Pod 的 `spec.hostname` 会自动设置为 **Pod 名称**，即 `pod.spec.hostname` 等于 `pod.metadata.name`。
- 配置 `svc` 插件后，Job 下所有 Pod 的 `spec.subdomain` 会自动设置为 **Job 名称**，即 `pod.spec.subdomain` 等于 `job.metadata.name`。
- 配置 `svc` 插件后，会自动为 Job 下所有容器（含 initContainers）注入环境变量 `VC_%s_NUM`。其中 `%s` 为 Pod 所属 **Task 名称**，变量值为该 Task 的 **副本数**。环境变量数量取决于 Task 数量；多数 AI/大数据作业包含两个角色，通常为 `2`（例如 Spark 的 `driver` 与 `executor`）。
- 配置 `svc` 插件后，会自动为 Job 下所有容器（含 initContainers）注入环境变量 `VC_%s_HOSTS`。其中 `%s` 为 Pod 所属 **Task 名称**，变量值为该 Task 下所有 Pod 的域名列表。环境变量数量同样取决于 Task 数量；例如 TensorFlow 作业通常包含 `ps` 与 `worker` 两个 Task。
- 会自动创建名为 `{job-name}-svc` 的 ConfigMap，记录各 Task 副本数及 Pod 域名，并挂载到 Job 下所有 Pod，在 `/etc/volcano/` 目录下提供主机列表文件。
- 会自动创建与 Job 同名的 Headless Service。
- 若 `disable-network-policy` 为 `false`，会为该 Job 创建类型为 `Ingress` 的 `NetworkPolicy` 对象。

## 参数说明

| ID  | 名称                          | 取值           | 默认值 | 是否必填 | 说明                                          | 示例                                     |
| --- | ----------------------------- | -------------- | ------ | -------- | --------------------------------------------- | ------------------------------------------- |
| 1   | `publish-not-ready-addresses` | `true`/`false` | `false` | 否       | Pod 未就绪时是否发布其地址                     | svc: ["--publish-not-ready-addresses=true"] |
| 2   | `disable-network-policy`      | `true`/`false` | `false` | 否       | 是否为该 Job 禁用 NetworkPolicy               | svc: ["--disable-network-policy=true"]      |

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
                  PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' | sed 's/^/"/;s/$/"/' | tr "\n" ","`;    ## 从生成的主机列表文件读取域名
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

## 说明

- Job `tensorflow-dist-mnist` 下的 Pod 已自动填充 `hostname` 与 `subdomain` 字段。以下为 `ps` Pod 的部分 YAML：

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    scheduling.k8s.io/group-name: tensorflow-dist-mnist
    volcano.sh/job-name: tensorflow-dist-mnist
    volcano.sh/job-version: "0"
    volcano.sh/queue-name: default
    volcano.sh/task-spec: ps
    volcano.sh/template-uid: tensorflow-dist-mnist-ps
  labels:
    volcano.sh/job-name: tensorflow-dist-mnist
    volcano.sh/job-namespace: default
    volcano.sh/queue-name: default
    volcano.sh/task-spec: ps
  name: tensorflow-dist-mnist-ps-0
  namespace: default
  ownerReferences:
  - apiVersion: batch.volcano.sh/v1alpha1
    blockOwnerDeletion: true
    controller: true
    kind: Job
    name: tensorflow-dist-mnist
    uid: 52c98cc2-4791-490f-8572-22df2c16ef8f
  resourceVersion: "855403"
  uid: 1b9e834b-de7e-4760-9b23-2a673d38e5d9
spec:
  containers:
  - command:
      - sh
        - -c
        - |
        PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' | sed 's/^/"/;s/$/"/' | tr "\n" ","`;    ## 从生成的主机列表文件读取域名
        WORKER_HOST=`cat /etc/volcano/worker.host | sed 's/$/&:2222/g' | sed 's/^/"/;s/$/"/' | tr "\n" ","`;
        export TF_CONFIG={\"cluster\":{\"ps\":[${PS_HOST}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"ps\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};
        python /var/tf_dist_mnist/dist_mnist.py
    env:
    - name: VK_TASK_INDEX
      value: "0"
    - name: VC_TASK_INDEX
      value: "0"
    - name: VC_PS_HOSTS     ## 环境变量 VC_PS_HOSTS 包含所有 ps Pod 的域名
      valueFrom:
        configMapKeyRef:
          key: VC_PS_HOSTS
          name: tensorflow-dist-mnist-svc
    - name: VC_PS_NUM       ## 环境变量 VC_PS_NUM 为 ps Task 的副本数
      valueFrom:
        configMapKeyRef:
          key: VC_PS_NUM
          name: tensorflow-dist-mnist-svc
    - name: VC_WORKER_HOSTS   ## 环境变量 VC_WORKER_HOSTS 包含所有 worker Pod 的域名
      valueFrom:
        configMapKeyRef:
          key: VC_WORKER_HOSTS
          name: tensorflow-dist-mnist-svc
    - name: VC_WORKER_NUM     ## 环境变量 VC_WORKER_NUM 为 worker Task 的副本数
      valueFrom:
        configMapKeyRef:
          key: VC_WORKER_NUM
          name: tensorflow-dist-mnist-svc
    image: volcanosh/dist-mnist-tf-example:0.0.1
    name: tensorflow
    ports:
    - containerPort: 2222
      name: tfjob-port
      protocol: TCP
    resources: {}
    volumeMounts:   ## 将 Job 对应的 ConfigMap 挂载到 /etc/volcano，其中包含各 Task 的主机列表文件
    - mountPath: /etc/volcano
      name: tensorflow-dist-mnist-svc
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-wflz5
      readOnly: true
  dnsPolicy: ClusterFirst
  enableServiceLinks: true
  hostname: tensorflow-dist-mnist-ps-0    ## 自动设置 hostname
  nodeName: volcano-control-plane
  restartPolicy: Never
  schedulerName: volcano
  subdomain: tensorflow-dist-mnist        ## 自动设置 subdomain
  tolerations:
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 300
  volumes:
  - configMap:    ## Job 自动创建的 ConfigMap
      defaultMode: 420
      name: tensorflow-dist-mnist-svc
    name: tensorflow-dist-mnist-svc
status:
  conditions:
  - lastProbeTime: null
    lastTransitionTime: "2022-04-13T02:08:17Z"
    status: "True"
    type: Initialized
  - lastProbeTime: null
    lastTransitionTime: "2022-04-13T02:08:18Z"
    status: "True"
    type: Ready
  - lastProbeTime: null
    lastTransitionTime: "2022-04-13T02:08:18Z"
    status: "True"
    type: ContainersReady
  - lastProbeTime: null
    lastTransitionTime: "2022-04-13T02:08:17Z"
    status: "True"
    type: PodScheduled
  hostIP: x.x.x.x
  phase: Running
  podIP: x.x.x.x
  podIPs:
  - ip: x.x.x.x
  qosClass: BestEffort
  startTime: "2022-04-13T02:08:17Z"
```

- 主机信息已注册到 Job 下所有 Pod。`ps` Pod 中的相关环境变量如下：

```
[root@tensorflow-dist-mnist-ps-0 /] env | grep VC
VC_PS_NUM=1
VC_PS_HOSTS=tensorflow-dist-mnist-ps-0.tensorflow-dist-mnist  ## ps Pod 域名
VC_WORKER_NUM=2
VC_WORKER_HOSTS=tensorflow-dist-mnist-worker-0.tensorflow-dist-mnist,tensorflow-dist-mnist-worker-1.tensorflow-dist-mnist  ## worker Pod 域名
```

- `/etc/volcano` 目录下的主机列表文件如下：

```
[root@tensorflow-dist-mnist-ps-0 /] ls /etc/volcano/
VC_PS_HOSTS  VC_PS_NUM  VC_WORKER_HOSTS  VC_WORKER_NUM  ps.host  worker.host
[root@tensorflow-dist-mnist-ps-0 /]# cat /etc/volcano/ps.host
tensorflow-dist-mnist-ps-0.tensorflow-dist-mnist
[root@tensorflow-dist-mnist-ps-0 /]# cat /etc/volcano/worker.host
tensorflow-dist-mnist-worker-0.tensorflow-dist-mnist
tensorflow-dist-mnist-worker-1.tensorflow-dist-mnist
```

- 为该 Job 自动创建的 Headless Service `tensorflow-dist-mnist` 如下：

```yaml
apiVersion: v1
kind: Service
metadata:
  creationTimestamp: "2022-04-13T02:08:15Z"
  name: tensorflow-dist-mnist
  namespace: default
  ownerReferences:
    - apiVersion: batch.volcano.sh/v1alpha1
      blockOwnerDeletion: true
      controller: true
      kind: Job
      name: tensorflow-dist-mnist
      uid: 52c98cc2-4791-490f-8572-22df2c16ef8f
  resourceVersion: "855341"
  uid: a77cb081-72ae-442f-96da-e36974dfed48
spec:
  clusterIP: None
  clusterIPs:
    - None
  ipFamilies:
    - IPv4
  ipFamilyPolicy: SingleStack
  selector:
    volcano.sh/job-name: tensorflow-dist-mnist
    volcano.sh/job-namespace: default
  sessionAffinity: None
  type: ClusterIP
status:
  loadBalancer: {}
```

- 为该 Job 自动创建的 ConfigMap `tensorflow-dist-mnist-svc` 如下：

```yaml
apiVersion: v1
data:
  VC_PS_HOSTS: tensorflow-dist-mnist-ps-0.tensorflow-dist-mnist
  VC_PS_NUM: "1"
  VC_WORKER_HOSTS: tensorflow-dist-mnist-worker-0.tensorflow-dist-mnist,tensorflow-dist-mnist-worker-1.tensorflow-dist-mnist
  VC_WORKER_NUM: "2"
  ps.host: tensorflow-dist-mnist-ps-0.tensorflow-dist-mnist
  worker.host: |-
    tensorflow-dist-mnist-worker-0.tensorflow-dist-mnist
    tensorflow-dist-mnist-worker-1.tensorflow-dist-mnist
kind: ConfigMap
metadata:
  creationTimestamp: "2022-04-13T02:08:15Z"
  name: tensorflow-dist-mnist-svc
  namespace: default
  ownerReferences:
    - apiVersion: batch.volcano.sh/v1alpha1
      blockOwnerDeletion: true
      controller: true
      kind: Job
      name: tensorflow-dist-mnist
      uid: 52c98cc2-4791-490f-8572-22df2c16ef8f
  resourceVersion: "855340"
  uid: c4f3db21-6857-451f-b8b8-bbd5aa8b06ec
```

- 为该 Job 自动创建的 NetworkPolicy `tensorflow-dist-mnist` 如下：

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  creationTimestamp: "2022-04-13T02:08:15Z"
  name: tensorflow-dist-mnist
  namespace: default
  ownerReferences:
    - apiVersion: batch.volcano.sh/v1alpha1
      blockOwnerDeletion: true
      controller: true
      kind: Job
      name: tensorflow-dist-mnist
      uid: 52c98cc2-4791-490f-8572-22df2c16ef8f
  resourceVersion: "855343"
  uid: ddf8aada-51d7-47c1-99a0-5e0d8a913a4d
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

- 集群需部署 DNS 插件（如 CoreDNS）。
- Kubernetes 版本需 >= v1.14。
