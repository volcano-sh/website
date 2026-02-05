+++
title = "Nodegroup 插件用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_nodegroup_plugin/"
[menu.docs]
  parent = "user-guide"
+++

## 介绍

**Nodegroup 插件** 通过给节点打标签并在队列上配置节点组亲和性，来实现集群资源的分组与隔离。

## 使用方法

### 为节点打标签

为目标节点打上 nodegroup 标签，标签键为 `volcano.sh/nodegroup-name`：

```shell script
kubectl label nodes <nodename> volcano.sh/nodegroup-name=<groupname>
```

### 配置队列

创建队列并将 nodegroup 绑定到该队列：

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: default
spec:
  reclaimable: true
  weight: 1
  affinity: # 新增字段
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

向 `default` 队列提交一个名为 `job-1` 的作业：

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

### 校验队列亲和/反亲和是否生效

查询 Pod 信息并验证其是否被调度到符合预期的节点上。  
Pod 应优先调度到带有 `nodeGroupAffinity.required...` 或 `nodeGroupAffinity.preferred...` 标签的节点上；  
当资源不足时，可以考虑 `nodeGroupAntiAffinity.preferred...` 中的节点，但**绝不会**被调度到拥有 `nodeGroupAntiAffinity.required...` 标签的节点上。

```shell script
kubectl get po job-1-nginx-0 -o wide
```

### Nodegroup 插件 strict 参数

`strict` 是一个布尔参数，用于控制对未配置 nodegroup 亲和性的队列的调度行为：

- 当 `strict: false` 时：来自未配置 nodegroup 亲和性的队列的任务，可以调度到**没有** `volcano.sh/nodegroup-name` 标签的节点上；
- 当 `strict: true`（默认值）时：只允许将任务调度到带有 `volcano.sh/nodegroup-name` 标签的节点。

示例：

```yaml
# 调度器配置
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

#### 启用层级支持

如果需要在分层队列中使用 nodegroup 插件，需要在插件配置中开启 `enableHierarchy: true`：

```yaml
# 调度器配置
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

#### 创建队列层级结构

**基础层级示例：**

1. 创建带 nodegroup 亲和性的根队列：

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

2. 创建继承亲和性的子队列：

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: engineering
spec:
  weight: 1
  parent: root
  # 未显式配置 affinity，将继承 root 配置

---
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: backend-team
spec:
  weight: 1
  parent: engineering
  # 未显式配置 affinity，将通过 engineering 继续继承 root 配置
```

3. 创建带自定义亲和性的子队列（覆盖继承）：

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
    # 覆盖从 root 继承的 affinity
```

#### 继承行为

| 场景                                               | 行为说明                                                 |
|----------------------------------------------------|----------------------------------------------------------|
| 子队列未配置 affinity，父队列配置了 affinity       | 子队列继承父队列的 affinity                              |
| 子队列与其父队列都未配置 affinity                  | 子队列从最近一个有 affinity 的祖先队列继承              |
| 子队列显式配置了 affinity                         | 仅使用自身 affinity，不从父队列继承                     |
| 队列未指定 parent                                  | 视为 root 队列的子队列                                   |

## Nodegroup 插件工作原理及排障

Nodegroup 设计文档中包含更详尽的信息，这里列出一些关键点与排障建议。

假设一个 4 节点集群及作业 `job-1`：

| 节点  | 标签       |
|-------|-----------|
| node1 | groupname1|
| node2 | groupname2|
| node3 | groupname3|
| node4 | groupname4|

作业 YAML 略，重点关注队列配置的几种情况：

1. **软约束应为硬约束的子集（包括 affinity 与 anti-affinity）**：

   若队列配置如下：

   ```yaml
   apiVersion: scheduling.volcano.sh/v1beta1
   kind: Queue
   metadata:
     name: default
   spec:
     reclaimable: true
     weight: 1
     affinity:
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

   表示 `default` 队列中的任务只能运行在 `groupname1` 或 `groupname2` 中，并且更倾向于先使用 `groupname1`；  
   同时任务禁止运行在 `groupname3` 和 `groupname4` 上。当其他组资源不足时，可适当使用软约束（preferred）。

2. **若软约束不是硬约束的子集，配置就是不一致的**：

   ```yaml
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

   此时任务最终只能运行在 `groupname2` 中。

3. **当 nodeGroupAffinity 与 nodeGroupAntiAffinity 冲突时，antiAffinity 优先级更高**：

   ```yaml
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

   这意味着任务最终只能运行在 `groupname2` 中。

4. **一般情况下，由于 soft 约束的存在，任务会优先尝试 groupname1**，但由于打分由多个插件共同决定，有时也可能落在 `groupname2`。

### 分层队列常见问题排查

#### 问题：节点可用但任务未被调度

**症状：**

- 节点有空闲资源，但任务长时间处于 Pending；
- 日志中出现队列亲和性相关错误。

**可能原因：**

1. 子队列从父队列继承了过于严格的 affinity；
2. 实际节点标签与继承得到的 affinity 不匹配；
3. 队列间存在循环依赖。

**解决思路：**

1. 检查队列继承链：

   ```bash
   kubectl get queue <queue-name> -o yaml
   ```

2. 必要时覆盖继承的亲和性：

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

#### 问题：亲和性行为与预期不符

**排查步骤：**

1. 查看调度器日志：

   ```bash
   kubectl logs -n volcano-system volcano-scheduler-xxx --tail=100 | grep -i nodegroup
   ```

2. 检查队列层级与权重：

   ```bash
   kubectl get queues -o custom-columns=NAME:.metadata.name,PARENT:.spec.parent,WEIGHT:.spec.weight
   ```

#### 问题：队列间存在循环依赖

**症状：**

- 队列的继承关系无法正确构建；
- 日志中出现循环检测（cycle detection）的警告。

**解决方案：**

1. 检查 parent 字段：

   ```bash
   kubectl get queues -o custom-columns=NAME:.metadata.name,PARENT:.spec.parent
   ```

2. 通过更新 parent 字段打破循环：

   ```yaml
   apiVersion: scheduling.volcano.sh/v1beta1
   kind: Queue
   metadata:
     name: problematic-queue
   spec:
     parent: "" # 移除循环引用
     weight: 1
   ```

