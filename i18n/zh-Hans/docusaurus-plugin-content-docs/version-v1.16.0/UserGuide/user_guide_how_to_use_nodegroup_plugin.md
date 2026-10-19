---
title: "NodeGroup 插件用户指南"

---

## 简介

**NodeGroup 插件**用于通过为节点分配标签并在 Queue 上设置节点标签亲和性来实现资源隔离。

## 用法

### 为节点分配标签

为节点分配标签，标签键为 `volcano.sh/nodegroup-name`。

```shell script
kubectl label nodes <nodename> volcano.sh/nodegroup-name=<groupname>
```

### 配置 Queue

创建 Queue 并将其绑定到 NodeGroup。

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: default
  spec:
    reclaimable: true
    weight: 1
    affinity: # added field
      nodeGroupAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          - <groupname>
        preferredDuringSchedulingIgnoredDuringExecution:
          - <groupname>
      nodeGroupAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          - <groupname>
        preferredDuringSchedulingIgnoredDuringExecution:
          - <groupname>
```

### 提交 Volcano Job

将名为 job-1 的 Volcano Job 提交到 default Queue。

```shell script
$ cat <<EOF | kubectl apply -f -
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: job-1
spec:
  minAvailable: 1
  schedulerName: volcano
  queue: default
  policies:
    - event: PodEvicted
      action: RestartJob
  tasks:
    - replicas: 1
      name: nginx
      policies:
      - event: TaskCompleted
        action: CompleteJob
      template:
        spec:
          containers:
            - command:
              - sleep
              - 10m
              image: nginx:latest
              name: nginx
              resources:
                requests:
                  cpu: 1
                limits:
                  cpu: 1
          restartPolicy: Never
EOF
```

### 验证 Queue 亲和性与反亲和规则是否生效

查询 Pod 信息，确认 Pod 是否已调度到正确节点。Pod 应调度到带有 `nodeGroupAffinity.requiredDuringSchedulingIgnoredDuringExecution` 或 `nodeGroupAffinity.preferredDuringSchedulingIgnoredDuringExecution` 标签的节点；否则，应调度到带有 `nodeGroupAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution` 标签的节点。特别地，Pod **不得**调度到带有 `nodeGroupAntiAffinity.requiredDuringSchedulingIgnoredDuringExecution` 标签的节点。

```shell script
kubectl get po job-1-nginx-0 -o wide
```

### NodeGroup 插件 strict 配置

`strict` 为布尔参数，用于控制未定义 NodeGroup 亲和性的 Queue 的调度行为。

- 当 `strict: false` 时，未配置亲和性的 Queue 中的任务可调度到**未**带有 `volcano.sh/nodegroup-name` 标签的节点。
- 当 `strict: true`（默认值）时，任务仅允许调度到带有 `volcano.sh/nodegroup-name` 标签的节点。

默认值为 `true`。

```yaml
# scheduler configuration
actions: "allocate, backfill, preempt, reclaim"
tiers:
  - plugins:
      - name: priority
      - name: gang
      - name: conformance
  - plugins:
      - name: drf
      - name: predicates
      - name: proportion
      - name: nodegroup
        arguments:
          strict: false
```

### 层级 Queue 配置

#### 启用层级支持

若要在 NodeGroup 插件中使用层级 Queue，请确保插件配置中包含 `enableHierarchy: true`：

```yaml
# scheduler configuration
actions: "allocate, backfill, preempt, reclaim"
tiers:
  - plugins:
      - name: priority
      - name: gang
      - name: conformance
  - plugins:
      - name: drf
      - name: predicates
      - name: proportion
      - name: nodegroup
        enableHierarchy: true
```

#### 创建 Queue 层级

**基本层级设置**

1. **创建带 NodeGroup 亲和性的根 Queue：**

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: root
spec:
  weight: 1
  affinity:
    nodeGroupAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - production
```

2. **创建继承亲和性的子 Queue：**

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: engineering
spec:
  weight: 1
  parent: root
  # No affinity specified - inherits from root

---
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: backend-team
spec:
  weight: 1
  parent: engineering
  # No affinity specified - inherits from root (through engineering)
```

3. **创建带自定义亲和性的子 Queue：**

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: frontend-team
spec:
  weight: 1
  parent: engineering
  affinity:
    nodeGroupAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - frontend
    # Overrides inherited affinity from root
```

#### 继承行为

| 编号 | 场景                                                   | 行为                                     |
| ---- | ------------------------------------------------------ | ---------------------------------------- |
| 1    | 子 Queue 未配置亲和性，父 Queue 已配置亲和性           | 继承父 Queue 的亲和性                    |
| 2    | 子 Queue 与父 Queue 均未配置亲和性                     | 继承最近祖先的亲和性                     |
| 3    | 子 Queue 已配置亲和性                                  | 使用自身亲和性（不继承）                 |
| 4    | 未指定父 Queue                                         | 视为根 Queue 的子 Queue                  |

## NodeGroup 插件工作原理

NodeGroup 设计文档对 NodeGroup 有最详细的说明。以下提示基于四节点集群及名为 job-1 的 Volcano Job，可帮助避免某些问题：

| 编号 | 节点  | 标签       |
| ---- | ----- | ---------- |
| 1    | node1 | groupname1 |
| 2    | node2 | groupname2 |
| 3    | node3 | groupname3 |
| 4    | node4 | groupname4 |

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: job-1
spec:
  minAvailable: 1
  schedulerName: volcano
  queue: default
  policies:
    - event: PodEvicted
      action: RestartJob
  tasks:
    - replicas: 1
      name: nginx
      policies:
        - event: TaskCompleted
          action: CompleteJob
      template:
        spec:
          containers:
            - command:
                - sleep
                - 10m
              image: nginx:latest
              name: nginx
              resources:
                requests:
                  cpu: 1
                limits:
                  cpu: 1
          restartPolicy: Never
```

1. 软约束是硬约束的子集，包括亲和与反亲和。例如，Queue 配置如下：

   ```yaml
   apiVersion: scheduling.volcano.sh/v1beta1
   kind: Queue
   metadata:
     name: default
     spec:
       reclaimable: true
       weight: 1
       affinity: # added field
         nodeGroupAffinity:
           requiredDuringSchedulingIgnoredDuringExecution:
             - groupname1
             - groupname2
           preferredDuringSchedulingIgnoredDuringExecution:
             - groupname1
         nodeGroupAntiAffinity:
           requiredDuringSchedulingIgnoredDuringExecution:
             - groupname3
             - groupname4
           preferredDuringSchedulingIgnoredDuringExecution:
             - groupname3
   ```

   这意味着 default Queue 中的任务将调度到 groupname1 与 groupname2，并优先在 groupname1 上运行。任务不得运行在 groupname3 与 groupname4 上。但若其他 NodeGroup 资源不足，任务可运行在 groupname3 上。

2. 若软约束不是硬约束的子集，则 Queue 配置不正确，会导致任务运行在 groupname2 上：

   ```yaml
   apiVersion: scheduling.volcano.sh/v1beta1
   kind: Queue
   metadata:
     name: default
     spec:
       reclaimable: true
       weight: 1
       affinity: # added field
         nodeGroupAffinity:
           requiredDuringSchedulingIgnoredDuringExecution:
             - groupname2
           preferredDuringSchedulingIgnoredDuringExecution:
             - groupname1
         nodeGroupAntiAffinity:
           requiredDuringSchedulingIgnoredDuringExecution:
             - groupname4
           preferredDuringSchedulingIgnoredDuringExecution:
             - groupname3
   ```

3. 若 nodeGroupAffinity 与 nodeGroupAntiAffinity 冲突，nodeGroupAntiAffinity 优先级更高。

   ```yaml
   apiVersion: scheduling.volcano.sh/v1beta1
   kind: Queue
   metadata:
     name: default
     spec:
       reclaimable: true
       weight: 1
       affinity: # added field
         nodeGroupAffinity:
           requiredDuringSchedulingIgnoredDuringExecution:
             - groupname1
             - groupname2
           preferredDuringSchedulingIgnoredDuringExecution:
             - groupname1
         nodeGroupAntiAffinity:
           requiredDuringSchedulingIgnoredDuringExecution:
             - groupname1
           preferredDuringSchedulingIgnoredDuringExecution:
             - groupname2
   ```

   这意味着 default Queue 中的任务只能在 groupname2 上运行。

4. 通常任务会优先运行在 groupname1 上，因为它是软约束。但评分函数由多个插件组成，因此任务有时也可能运行在 groupname2 上。
   ```yaml
   apiVersion: scheduling.volcano.sh/v1beta1
   kind: Queue
   metadata:
     name: default
     spec:
       reclaimable: true
       weight: 1
       affinity: # added field
         nodeGroupAffinity:
           requiredDuringSchedulingIgnoredDuringExecution:
             - groupname1
             - groupname2
           preferredDuringSchedulingIgnoredDuringExecution:
             - groupname1
         nodeGroupAntiAffinity:
           requiredDuringSchedulingIgnoredDuringExecution:
             - groupname3
             - groupname4
           preferredDuringSchedulingIgnoredDuringExecution:
             - groupname3
   ```

## 层级 Queue 故障排查

### 问题：节点可用但任务仍未调度

**现象：**

- NodeGroup 中虽有可用节点，任务仍处于 Pending
- 出现与 Queue 亲和性要求相关的错误信息

**可能原因：**

1. 子 Queue 继承了父 Queue 的严格亲和性
2. NodeGroup 标签与继承的亲和规则不匹配
3. Queue 存在循环依赖

**解决方案：**

1. 检查继承链：

```bash
kubectl get queue <queue-name> -o yaml
# Verify parent hierarchy and affinity inheritance
```

2. 覆盖过于严格的继承：

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: flexible-team
spec:
  parent: restrictive-parent
  affinity:
    nodeGroupAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - flexible-nodes
```

### 问题：亲和行为不符合预期

**现象：**

- 任务被调度到意外的 NodeGroup
- 继承未按预期生效

**排查步骤：**

1. 启用详细日志：

```bash
# Check scheduler logs with higher verbosity
kubectl logs -n volcano-system volcano-scheduler-xxx --tail=100 | grep -i nodegroup
```

2. 验证 Queue 配置：

```bash
# List all queues with their hierarchy
kubectl get queues -o custom-columns=NAME:.metadata.name,PARENT:.spec.parent,WEIGHT:.spec.weight
```

### 问题：Queue 循环依赖

**现象：**

- Queue 无法正确构建祖先关系
- 出现与环检测相关的警告信息

**解决方案：**

1. 检查 Queue 层级：

```bash
# Check for circular references
kubectl get queues -o custom-columns=NAME:.metadata.name,PARENT:.spec.parent
```

2. 通过更新父引用修复循环依赖：

```yaml
# Remove or correct circular parent relationships
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: problematic-queue
spec:
  parent: "" # Remove circular reference
  weight: 1
```
