---
title: "NamespaceQueue 用户指南"
---

## 简介

`NamespaceQueue` 是 Volcano 提供的命名空间级队列资源。用户可以在自己的 namespace 中管理队列，而不需要创建或修改集群级 `Queue` 的权限。

NamespaceQueue 与 `Queue` 使用一致的资源管理语义，包括 `capability`、`deserved`、`guarantee`、`reclaimable`、优先级和层级调度。NamespaceQueue 是 Alpha 特性，默认关闭。

## 启用 NamespaceQueue

### 使用 Helm 安装

设置 `custom.namespace_queue_enable`，即可在 Volcano 组件中启用该特性。默认允许在集群 Queue 下创建 5 层 NamespaceQueue。

```shell
helm upgrade --install volcano volcano-sh/volcano \
  --namespace volcano-system \
  --create-namespace \
  --set custom.namespace_queue_enable=true \
  --set custom.namespace_queue_max_depth=5
```

### 使用 YAML 文件安装

在 scheduler、controller manager 和 admission service 中添加以下 Feature Gate：

```shell
--feature-gates=NamespaceQueue=true
```

如果已有 `--feature-gates` 配置，请在原配置后追加 `NamespaceQueue=true`。同时在 admission service 和 controller manager 中设置相同的层级深度：

```shell
--max-namespacequeue-depth=5
```

如果启用了 agent scheduler，也需要在其中启用该 Feature Gate。

## 配置队列调度插件

NamespaceQueue 会被转换为与集群级 Queue 相同的内部 `QueueInfo` 模型。消费这一公共模型的插件可以沿用相同的调度路径，包括 `priority`、`gang`、`predicates`、`nodeorder`、`binpack`、`nodegroup` 和 `extender`。这种兼容不会为插件增加 NamespaceQueue 专用字段，插件自身的配置和字段要求仍然适用。

资源份额插件对 NamespaceQueue 的字段语义有所不同：

- `capacity` 直接使用 NamespaceQueue 的 `capability`、`deserved` 和 `guarantee` 字段，并支持层级资源限制。如果需要为每个 NamespaceQueue 显式配置资源值，请使用该插件。详细信息请参考 [Capacity 插件用户指南](./user_guide_how_to_use_capacity_plugin.md)。
- 在当前实现中，`proportion` 也可以通过公共队列模型接收 NamespaceQueue。NamespaceQueue 没有独立的 `weight` 字段，因此规范化后的 weight 为 `1`，不能按 NamespaceQueue 单独配置。这与为集群级 Queue 配置不同 weight 并不等价；只有在可以接受这一默认 weight 行为，并且已针对当前 scheduler 配置验证结果时，才建议使用 `proportion`。

当前官方验证的 NamespaceQueue 资源份额路径是 `capacity`。其他插件在消费公共 `QueueInfo` 模型中已有字段时可以保持兼容，但如果插件依赖 NamespaceQueue 专用字段或行为，则不会因为使用了公共模型而自动获得支持。

`capacity` 和 `proportion` 与集群级 Queue 一样不能同时启用。其他插件可以根据 scheduler 配置及其所需字段启用。

```yaml
actions: "enqueue, allocate, backfill, reclaim"
tiers:
- plugins:
  - name: priority
  - name: gang
- plugins:
  - name: predicates
  - name: capacity
  - name: nodeorder
```

## 配置集群级 Queue

集群管理员需要先授权 namespace，NamespaceQueue 才能将集群级 Queue 作为父队列。在 Queue 的 `spec.allowedNamespaces` 中添加 namespace：

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: research
spec:
  parent: root
  allowedNamespaces:
    - team-a
```

通配符 `"*"` 表示允许所有 namespace，并且必须是列表中的唯一值。省略或设置为空列表表示不允许 NamespaceQueue 挂载。

启用 NamespaceQueue 后，如果集群级 `default` Queue 是新创建的，Volcano 会将其初始化为 `allowedNamespaces: ["*"]`。已有的非空 `allowedNamespaces` 配置会被保留，因此使用 default 作为父队列前请先检查它的配置。

## 配置 Namespace 权限

在租户 namespace 中绑定 Volcano 提供的 editor role。虽然该 role 是 ClusterRole，但 RoleBinding 会使权限保持在指定 namespace 内：

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: namespacequeue-editor
  namespace: team-a
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: namespacequeue-editor-role
subjects:
- kind: User
  name: team-a-user
```

只需要查看权限时，可以绑定 `namespacequeue-viewer-role`。

## 创建 NamespaceQueue

租户可以在自己的 namespace 中创建 NamespaceQueue。下面的 `cluster/research` 指向前面配置的集群级 Queue：

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: NamespaceQueue
metadata:
  name: training
  namespace: team-a
spec:
  parent: cluster/research
  capability:
    cpu: "100"
    memory: 200Gi
  deserved:
    cpu: "60"
    memory: 120Gi
  guarantee:
    resource:
      cpu: "20"
      memory: 40Gi
  reclaimable: true
  priority: 10
  dequeueStrategy: traverse
  state: Open
```

```shell
kubectl apply -f namespacequeue.yaml
kubectl get namespacequeue -n team-a
kubectl describe namespacequeue training -n team-a
```

每个资源维度应满足：

```text
guarantee <= deserved <= capability
```

子 NamespaceQueue 可以通过同 namespace 中的队列名称引用父队列：

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: NamespaceQueue
metadata:
  name: inference
  namespace: team-a
spec:
  parent: training
  deserved:
    cpu: "20"
  state: Open
```

不支持使用 `cluster/root` 或跨 namespace 的 NamespaceQueue 作为父队列。同一个 namespace 只能有一个 NamespaceQueue 子树直接挂载到同一个集群级 Queue。

## 提交工作负载

### Volcano Job

在 Job 的 `spec.queue` 中使用 `namespace/<name>`，即可引用 Job 所在 namespace 中的 NamespaceQueue：

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: training-job
  namespace: team-a
spec:
  schedulerName: volcano
  queue: namespace/training
  minAvailable: 1
  tasks:
  - name: worker
    replicas: 1
    template:
      spec:
        containers:
        - name: worker
          image: busybox
          command: ["sh", "-c", "sleep 30"]
          resources:
            requests:
              cpu: "1"
        restartPolicy: Never
```

### PodGroup

PodGroup 使用相同的队列引用方式：

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: PodGroup
metadata:
  name: training-podgroup
  namespace: team-a
spec:
  minMember: 1
  queue: namespace/training
```

### Queue annotation

原有 annotation 也支持 `namespace/` 前缀：

```yaml
metadata:
  annotations:
    scheduling.volcano.sh/queue-name: namespace/training
```

不带前缀的 `default` 或 `research` 仍然表示集群级 Queue。引用 NamespaceQueue 时必须使用 `namespace/` 前缀。系统会自动使用工作负载所在的 namespace，不支持跨 namespace 引用。

## 查看状态和事件

```shell
kubectl get nq -n team-a
kubectl get nq training -n team-a -o yaml
kubectl describe nq training -n team-a
kubectl get events -n team-a \
  --field-selector=involvedObject.kind=NamespaceQueue,involvedObject.name=training
```

`status.state` 表示 NamespaceQueue 的实际生命周期状态：`Open`、`Closing`、`Closed` 或 `Unknown`。status 还包括 PodGroup 计数（`pending`、`inqueue`、`running`、`unknown`、`completed`）、scheduler 管理的 `allocated` 资源以及 `reservation` 信息。

`Authorized` condition 表示 namespace 是否被集群父 Queue 授权。`Ready` condition 表示父队列链、层级约束、资源约束和生命周期是否允许调度。只有期望状态和实际状态都是 `Open`，并且当前 generation 的 `Ready=True` 时，NamespaceQueue 才可以参与调度。

常见的失败原因包括 `NamespaceNotAllowed`、`ParentNotFound`、`ParentNotReady`、`ParentConstraintViolation`、`HierarchyCycle`、`QueueClosing` 和 `QueueClosed`。

队列资源指标使用队列 identity 作为 `queue_name` label。NamespaceQueue 使用 `<namespace>/<name>`，例如：

```text
volcano_queue_allocated_milli_cpu{queue_name="team-a/training"}
```

## 关闭和删除 NamespaceQueue

修改父队列或删除资源前，需要先将期望状态设置为 `Closed`：

```shell
kubectl patch nq training -n team-a --type=merge \
  -p '{"spec":{"state":"Closed"}}'
```

队列会先进入 `Closing`。当活跃 PodGroup 以及 scheduler 管理的资源完成释放后，队列变为 `Closed`。队列处于 Closing 或 Closed 时，不会接收新的工作负载；正在运行的工作负载不会被强制驱逐。

删除父 NamespaceQueue 前，需要先删除子 NamespaceQueue。存在活跃工作负载、reservation 或子队列时，NamespaceQueue finalizer 会阻止删除，直到队列关闭并完成 drain。

## 从集群级 Queue 迁移

已有工作负载继续使用集群级 Queue，因为不带前缀的 queue 引用保持原有语义。可以按以下步骤逐步迁移：

1. 在现有集群级 Queue 中授权租户 namespace。
2. 创建 `parent: cluster/<queue-name>` 的 NamespaceQueue。
3. 等待 `Authorized=True` 和 `Ready=True`。
4. 将选定的 Job、PodGroup 或 annotation 改为 `namespace/<namespacequeue-name>`。

需要回滚时，将 queue 引用恢复为原来的集群级 Queue 名称。在所有 NamespaceQueue 已迁移或关闭并 drain 前，不要从 `allowedNamespaces` 中移除 namespace。

## 常见问题

- 如果提示 NamespaceQueue feature disabled，请在 admission service、controller manager 和 scheduler 中启用 `NamespaceQueue=true`。
- 如果 NamespaceQueue 未授权，请检查父 Queue 的 `allowedNamespaces`。
- 如果 NamespaceQueue 未 Ready，请检查父队列状态、层级深度以及 `guarantee <= deserved <= capability` 关系。
- 如果工作负载没有被调度，请确认使用了 `namespace/<name>`、目标队列为 `Ready=True`，并且配置的资源份额插件支持 NamespaceQueue 字段。

实现细节请参考 [NamespaceQueue 设计文档](https://github.com/volcano-sh/volcano/blob/master/docs/design/namespace-queue.md) 和 [NamespaceQueue E2E 测试](https://github.com/volcano-sh/volcano/blob/master/test/e2e/namespacequeue/namespacequeue_test.go)。
