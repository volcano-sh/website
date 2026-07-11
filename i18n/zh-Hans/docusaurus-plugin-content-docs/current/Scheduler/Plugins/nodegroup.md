---
title: Nodegroup

---

## 介绍

**Nodegroup插件**旨在通过为节点分配标签并在队列上设置节点标签亲和力来隔离资源。

## 用法

### 为节点分配标签

为节点分配标签，标签键为“volcano.sh/nodegroup-name”。

```shell script
kubectl label nodes <nodename> volcano.sh/nodegroup-name=<groupname>
```

### 配置队列

创建队列并将节点组绑定到它。

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

### 提交 vcjob

将 vcjob job-1 提交到默认队列。

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

### 验证队列关联性和反关联性规则是否生效

查询Pod信息并验证Pod是否已调度到正确的节点上。 pod 应该安排在节点上
标签“nodeGroupAffinity.requiredDuringSchedulingIgnoredDuringExecution”或“nodeGroupAffinity.preferredDuringSchedulingIgnoredDuringExecution”。如果不是，则应将 pod 调度到标签为“nodeGroupAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution”的节点上。具体来说，Pod 不得调度在带有“nodeGroupAntiAffinity.requiredDuringSchedulingIgnoredDuringExecution”标签的节点上。

```shell script
kubectl get po job-1-nginx-0 -o wide
```

### Nodegroup插件严格配置

“strict”是一个布尔参数，用于控制未定义节点组关联的队列的调度行为。

- 当“strict: false”时，没有关联性的队列中的任务可以安排在**不**具有“volcano.sh/nodegroup-name”标签的节点上。
- 当“strict: true”（默认值）时，只允许在具有“volcano.sh/nodegroup-name”标签的节点上调度任务。

默认值为“true”。

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

### 分层队列配置

#### 启用分层支持

要将分层队列与节点组插件一起使用，请确保插件配置包含“enableHierarchy: true”：

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

#### 创建队列层次结构

**基本层次结构设置**

1. **创建具有节点组关联性的根队列：**

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

2. **创建继承亲和力的子队列：**

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

3. **创建具有自定义关联性的子队列：**

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

| 场景                                                       | 行为                                         |
| ---------------------------------------------------------- | -------------------------------------------- |
| 子队列无亲和性，父队列有亲和性                             | 继承父队列的亲和性                           |
| 子队列无亲和性，父队列也无亲和性                           | 从最近的具有亲和性的祖先队列继承             |
| 子队列有亲和性                                             | 使用其自身的亲和性（不继承）                 |
| 未指定父队列的队列                                         | 被视为根队列的子队列                         |

## Nodegroup 插件的工作原理

节点组设计文档提供了有关节点组的最详细信息。有一些提示可帮助避免某些问题。这些提示基于四节点集群和名为 job-1 的 vcjob：

| Node  | Label      |
| ----- | ---------- |
| node1 | groupname1 |
| node2 | groupname2 |
| node3 | groupname3 |
| node4 | groupname4 |

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

1. 软约束是硬约束的子集，包括亲和性和反亲和性。考虑如下队列设置：

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

   这意味着“默认”队列中的任务将安排在“groupname1”和“groupname2”上，并优先运行“​​groupname1”。任务被限制在“groupname3”和“groupname4”上运行。但如果其他节点组资源不足，任务可以在“nodegroup3”上运行。

2. 如果软约束不形成硬约束的子集，则队列配置不正确，导致任务在“groupname2”上运行：

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

3. 如果nodeGroupAffinity和nodeGroupAntiAffinity之间存在冲突，则nodeGroupAntiAffinity具有更高的优先级。

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

   这意味着“默认”队列中的任务只能在“groupname2”上运行。

4. 通常，任务会首先在 "groupname1" 上运行，因为这是一个软约束。然而，评分函数由多个插件组成，因此任务有时可能会在 "groupname2" 上运行。
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

## 分层队列故障排除

### 问题：尽管节点可用，但任务未安排

**症状：**

- 即使节点组中有可用节点，任务仍处于待处理状态
- 有关队列关联性要求的错误消息

**可能的原因：**

1. 子队列从父队列继承限制性关联
2. 节点组标签与继承的亲和性规则不匹配
3.循环队列依赖

**解决方案：**

1. 检查继承链：

```bash
kubectl get queue <queue-name> -o yaml
# Verify parent hierarchy and affinity inheritance
```

2. 覆盖限制性继承：

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

### 问题：意外的关联行为

**症状：**

- 计划在意外节点组上的任务
- 继承未按预期工作

**调试步骤：**

1. 启用详细日志记录：

```bash
# Check scheduler logs with higher verbosity
kubectl logs -n volcano-system volcano-scheduler-xxx --tail=100 | grep -i nodegroup
```

2. 验证队列配置：

```bash
# List all queues with their hierarchy
kubectl get queues -o custom-columns=NAME:.metadata.name,PARENT:.spec.parent,WEIGHT:.spec.weight
```

### 问题：循环队列依赖性

**症状：**

- 队列未正确构建祖先
- 有关周期检测的警告消息

**解决方案：**

1. 查看队列层次结构：

```bash
# Check for circular references
kubectl get queues -o custom-columns=NAME:.metadata.name,PARENT:.spec.parent
```

2. 通过更新父引用来修复循环依赖：

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
