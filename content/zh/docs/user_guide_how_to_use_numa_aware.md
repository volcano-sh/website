+++
title = "NUMA 感知用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_numa_aware/"
[menu.docs]
  parent = "user-guide"
+++

## 环境准备

### 预置条件

在使用 NUMA 感知调度前，需要对 kubelet 做如下配置：

- 启用 CPU Manager，并将策略设置为 `"static"`；
- 启用 Topology Manager，并按需要设置策略。

1. 通过编辑 kubelet 配置文件设置上述选项：

   ```bash
   cat /var/lib/kubelet/config.yaml
   ```

   示例配置：

   ```yaml
   ...
   cpuManagerPolicy: static
   topologyManagerPolicy: best-effort
   kubeReserved:
     cpu: 1000m
   ```

2. 重启 kubelet 使配置生效：

   ```bash
   systemctl stop kubelet
   rm -rf /var/lib/kubelet/cpu_manager_state
   systemctl daemon-reload
   systemctl start kubelet
   ```

### 安装 Volcano

#### 1. 从源码安装

参考 [安装指南](https://github.com/volcano-sh/volcano/blob/master/installer/README.md) 安装 Volcano。

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
      - name: numa-aware # 添加以启用 numa-aware 插件
        arguments:
          weight: 10
```

#### 2. 使用发布包安装

与上述相同，安装完成后在 `volcano-scheduler-configmap` 中更新调度器配置。

### 安装 Volcano Resource Exporter

参考 [volcano resource exporter](https://github.com/volcano-sh/resource-exporter/blob/main/README.md) 文档安装资源导出组件。

### 校验环境是否就绪

检查 CRD **numatopo**，确保所有节点都已上报 NUMA 拓扑数据：

```bash
kubectl get numatopo
NAME     AGE
node-1   4h8m
node-2   4h8m
node-3   4h8m
```

## 使用方法

### 使用 Volcano Job 的拓扑策略

支持在 Task 级别配置拓扑策略，即编辑 `spec.tasks.topologyPolicy` 字段。  
策略选项与 kubelet 的 [Topology Manager](https://v1-19.docs.kubernetes.io/docs/tasks/administer-cluster/topology-manager/) 保持一致：

````text
   1. single-numa-node
   2. best-effort
   3. restricted
   4. none
````

示例：

```yaml
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
      topologyPolicy: best-effort # 为任务设置拓扑策略
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

### 在 TFJob 中使用拓扑策略

可以通过在 Pod 模板中增加注解 **`volcano.sh/numa-topology-policy`** 来指定拓扑策略：

```yaml
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
            volcano.sh/numa-topology-policy: "best-effort" # 为 PS Pod 设置拓扑策略
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

假设集群中 worker 节点 NUMA 资源如下：

| worker 节点 | NUMA 0 可分配 CPU | NUMA 2 可分配 CPU |
|-------------|-------------------|-------------------|
| node-1      | 12                | 12                |
| node-2      | 20                | 20                |

提交如下 Volcano Job：

```yaml
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
      topologyPolicy: best-effort # 为任务设置拓扑策略
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

在该示例中，Pod 会被调度到 `node-2`，因为 `node-2` 能在**单个 NUMA 节点**上满足 Pod 的 CPU 请求，而 `node-1` 需要跨两个 NUMA 节点才能满足请求。

