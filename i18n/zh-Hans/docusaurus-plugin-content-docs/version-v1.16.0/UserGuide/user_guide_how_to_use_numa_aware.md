---
title: "NUMA 感知调度用户指南"
---

## 环境准备

### 前置条件

- 启用 CPU Manager，并将策略设置为 `static`
- 启用 Topology Manager，并设置所需的策略选项

1. 通过编辑 kubelet 配置文件完成上述设置：

   ```
   cat /var/lib/kubelet/config.yaml
   ```

   ```
   {...}
   cpuManagerPolicy: static
   topologyManagerPolicy: best-effort
   kubeReserved:
     cpu: 1000m
   ```

2. 重启 kubelet 使配置生效，执行以下命令：

   ```
   1. systemctl stop kubelet
   2. rm -rf /var/lib/kubelet/cpu_manager_state
   3. systemctl daemon-reload
   4. systemctl start kubelet
   ```

### 安装 Volcano

#### 1. 从源码安装

请参考 [安装指南](https://github.com/volcano-sh/volcano/blob/master/installer/README.md) 安装 Volcano。

安装完成后，更新调度器配置：

```shell script
kubectl edit cm -n volcano-system volcano-scheduler-configmap
```

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: volcano-scheduler-configmap
  namespace: volcano-system
data:
  volcano-scheduler.conf: |
    actions: "enqueue, allocate, backfill"
    tiers:
    - plugins:
      - name: priority
      - name: gang
      - name: conformance
    - plugins:
      - name: drf
      - name: predicates
      - name: proportion
      - name: nodeorder
      - name: binpack
      - name: numa-aware # 添加该插件以启用 NUMA 感知调度
        arguments:
          weight: 10
```

#### 2. 从发布包安装

与上述步骤相同，安装完成后在 `volcano-scheduler-configmap` ConfigMap 中更新调度器配置。

### 安装 Volcano Resource Exporter

请参考 [Volcano Resource Exporter](https://github.com/volcano-sh/resource-exporter/blob/main/README.md)。

### 验证环境是否就绪

检查 CRD **numatopo**，确认各节点数据已生成：

```
kubectl get numatopo 
NAME              AGE
node-1            4h8m
node-2            4h8m
node-3            4h8m
```

## 使用方法

### 在 Volcano Job 中配置拓扑策略

支持在 Task 级别设置拓扑策略。编辑 **spec.tasks.topologyPolicy** 即可指定是否进行拓扑感知调度。可选值与 kubelet 上的 [Topology Manager](https://v1-19.docs.kubernetes.io/docs/tasks/administer-cluster/topology-manager/) 一致：

````
   1. single-numa-node
   2. best-effort
   3. restricted
   4. none

````

示例：

```
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: vj-test
spec:
  schedulerName: volcano
  minAvailable: 1
  tasks:
    - replicas: 1
      name: "test"
      topologyPolicy: best-effort # 为 Task 设置拓扑策略
      template:
        spec:
          containers:
            - image: alpine
              command: ["/bin/sh", "-c", "sleep 1000"]
              imagePullPolicy: IfNotPresent
              name: running
              resources:
                limits:
                  cpu: 20
                  memory: "100Mi"
          restartPolicy: OnFailure
```

### 在 TFJob 中配置拓扑策略

通过注解 **volcano.sh/numa-topology-policy** 指定所需的拓扑策略：

```
apiVersion: kubeflow.org/v1
kind: TFJob
metadata:
  generateName: tfjob
  name: tfjob-test
spec:
  tfReplicaSpecs:
    PS:
      replicas: 1
      restartPolicy: OnFailure
      template:
        metadata:
          annotations:
            sidecar.istio.io/inject: "false"
            volcano.sh/numa-topology-policy: "best-effort" # 为 Pod 设置拓扑策略
        spec:
          containers:
          - name: tensorflow
            image: alpine:latest
            imagePullPolicy: IfNotPresent
            command: ["/bin/sh", "-c", "sleep 1000"]
            resources:
              limits:
                cpu: 15
                memory: 2Gi
              requests:
                cpu: 15
                memory: 2Gi
    Worker:
      replicas: 1
      restartPolicy: OnFailure
      template:
        metadata:
          annotations:
            sidecar.istio.io/inject: "false"
            volcano.sh/numa-topology-policy: "best-effort"
        spec:
          containers:
          - name: tensorflow
            image: alpine:latest
            imagePullPolicy: IfNotPresent
            command: ["/bin/sh", "-c", "sleep 1000"]
            resources:
              limits:
                cpu: 15
                memory: 2Gi
              requests:
                cpu: 15
                memory: 2Gi
```

### 实践示例

| 工作节点 | NUMA 节点 0 可分配 CPU | NUMA 节点 2 可分配 CPU |
|-----|----|-----|
| node-1 | 12 | 12 |
| node-2 | 20 | 20 |

提交如下 Volcano Job：

```
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: vj-test
spec:
  schedulerName: volcano
  minAvailable: 1
  tasks:
    - replicas: 1
      name: "test"
      topologyPolicy: best-effort # 为 Task 设置拓扑策略
      template:
        spec:
          containers:
            - image: alpine
              command: ["/bin/sh", "-c", "sleep 1000"]
              imagePullPolicy: IfNotPresent
              name: running
              resources:
                limits:
                  cpu: 16
                  memory: "100Mi"
          restartPolicy: OnFailure
```

Pod 会被调度到 `node-2`，因为该节点可以在单个 NUMA 节点上满足 Pod 的 CPU 请求；而 `node-1` 需要将请求分散到两个 NUMA 节点上才能满足。
