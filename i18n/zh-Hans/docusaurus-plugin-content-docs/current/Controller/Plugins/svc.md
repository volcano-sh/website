---
title: SVC
---

## 背景

**SVC 插件** 专为火山作业中的 Pod 通信而设计，这对于以下工作负载至关重要
[TensorFlow](https://tensorflow.google.cn/) 和 [MPI](https://www.open-mpi.org/)。例如，需要
“tensorflow job”用于在“ps”和“worker”之间相互联系。 Volcano 作业插件 `svc` 在作业中启用 Pod
通过域互相访问。

## 要点

- 配置完`svc`插件后，`spec`下的`hostname`字段的值将被填写为**pod名称**
  自动执行该作业下的所有 Pod。即，“pod.spec.hostname”是“pod.metadata.name”。
- 一旦配置了`svc`插件，`spec`下的字段`subdomain`的值将被填写为**作业名称**
  自动执行该作业下的所有 Pod。即，“pod.spec.subdomain”是“job.metadata.name”。
- 一旦配置了`svc`插件，环境变量`VC_%s_NUM`将被注册到所有容器（包括
  initContainers）会自动在作业下进行。 `%s` 将替换为 pod 所属的**任务名称**。价值
  环境变量的值是**任务副本**。环境变量的数量取决于任务的数量，
  对于大多数人工智能和大数据工作来说，通常是“2”，包含 2 个角色。例如，Spark作业包含“driver”和“executor”。
- 一旦配置了 svc 插件，环境变量 VC_%s_HOSTS 将被注册到所有容器（包括
  initContainers）会自动在作业下进行。 `%s` 将替换为 pod 所属的**任务名称**。价值
  环境变量的值是该任务下所有 pod 的域。环境变量的数量取决于
  任务数量，对于大多数人工智能和大数据工作包含 2 个角色，通常为“2”。例如，TensorFlow 作业
  包含`ps`和`worker`。
- 将自动创建一个名为 job-name 和 `svc` 并带有 `-` 的 configmap，其中包含所有作业的副本
  任务以及该任务下所有 pod 的域。它将作为作业下所有 pod 的卷进行挂载，并作为
  目录 `/etc/volcano/` 下的主机文件。
- 将创建一个与作业名称相同的无头服务。
- 如果“disable-network-policy”设置为 false，则会创建一个“Ingress”类型的“NetworkPolicy”对象
  工作。

## 参数

| ID  | 名称                          | 值          | 默认值 | 是否必填 | 描述                                          | 示例                                     |
| --- | ----------------------------- | -------------- | ------------- | -------- | ---------------------------------------------------- | ------------------------------------------- |
| 1   | `publish-not-ready-addresses` | `true`/`false` | `false`       | 否        | pod 未就绪时是否发布 pod 地址 | svc: ["--publish-not-ready-addresses=true"] |
| 2   | `disable-network-policy`      | `true`/`false` | `false`       | 否        | 是否禁用作业的网络策略 | svc: ["--disable-network-policy=true"]      |

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
      ] ## SVC plugin register
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
                  PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' | sed 's/^/"/;s/$/"/' | tr "\n" ","`;    ## Get host domain from host files generated
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

## 笔记：

- 字段“hostname”和“subdomain”已添加到作业“tensorflow-dist-mnist”下的 Pod 中。以下为部分内容
  `ps` pod 的 yaml。

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
        PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' | sed 's/^/"/;s/$/"/' | tr "\n" ","`;    ## Get host domain from host files generated
        WORKER_HOST=`cat /etc/volcano/worker.host | sed 's/$/&:2222/g' | sed 's/^/"/;s/$/"/' | tr "\n" ","`;
        export TF_CONFIG={\"cluster\":{\"ps\":[${PS_HOST}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"ps\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};
        python /var/tf_dist_mnist/dist_mnist.py
    env:
    - name: VK_TASK_INDEX
      value: "0"
    - name: VC_TASK_INDEX
      value: "0"
    - name: VC_PS_HOSTS     ## Environment variable `VC_PS_HOSTS` contains the domains of all the `ps` hosts.
      valueFrom:
        configMapKeyRef:
          key: VC_PS_HOSTS
          name: tensorflow-dist-mnist-svc
    - name: VC_PS_NUM       ## Environment variable `VC_PS_NUM` contains the number of `ps` hosts.
      valueFrom:
        configMapKeyRef:
          key: VC_PS_NUM
          name: tensorflow-dist-mnist-svc
    - name: VC_WORKER_HOSTS   ## Environment variable `VC_WORKER_HOSTS` contains the domains of all the `worker` hosts.
      valueFrom:
        configMapKeyRef:
          key: VC_WORKER_HOSTS
          name: tensorflow-dist-mnist-svc
    - name: VC_WORKER_NUM     ## Environment variable `VC_WORKER_NUM` contains the number of `worker` hosts.
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
    volumeMounts:   ## Mount the configmap generated for the job under `/etc/volcano`, which contains all host files.
    - mountPath: /etc/volcano
      name: tensorflow-dist-mnist-svc
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-wflz5
      readOnly: true
  dnsPolicy: ClusterFirst
  enableServiceLinks: true
  hostname: tensorflow-dist-mnist-ps-0    ## Add `hostname` field
  nodeName: volcano-control-plane
  restartPolicy: Never
  schedulerName: volcano
  subdomain: tensorflow-dist-mnist        ## Add `subdomain` field
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
  - configMap:    ## Configmap generated for the job
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

- 主机信息注册到作业下的所有 Pod 中。以下是`ps` pod 的注册环境变量。

```
[root@tensorflow-dist-mnist-ps-0 /] env | grep VC
VC_PS_NUM=1
VC_PS_HOSTS=tensorflow-dist-mnist-ps-0.tensorflow-dist-mnist  ## ps pod domain
VC_WORKER_NUM=2
VC_WORKER_HOSTS=tensorflow-dist-mnist-worker-0.tensorflow-dist-mnist,tensorflow-dist-mnist-worker-1.tensorflow-dist-mnist  ## worker pods domains
```

- `/etc/volcano`下添加的主机文件如下。

```
[root@tensorflow-dist-mnist-ps-0 /] ls /etc/volcano/
VC_PS_HOSTS  VC_PS_NUM  VC_WORKER_HOSTS  VC_WORKER_NUM  ps.host  worker.host
[root@tensorflow-dist-mnist-ps-0 /]# cat /etc/volcano/ps.host
tensorflow-dist-mnist-ps-0.tensorflow-dist-mnist
[root@tensorflow-dist-mnist-ps-0 /]# cat /etc/volcano/worker.host
tensorflow-dist-mnist-worker-0.tensorflow-dist-mnist
tensorflow-dist-mnist-worker-1.tensorflow-dist-mnist
```

- 为作业生成的无头服务“tensorflow-dist-mnist”如下。

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

- 为作业生成的配置映射“tensorflow-dist-mnist-svc”如下。

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

- 为作业生成的网络策略“tensorflow-dist-mnist”如下。

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

## 笔记

- Kubernetes 集群中需要 DNS 插件，例如“corndns”。
- Kubernetes 版本 >= v1.14