---
title: "NamespaceQueue 用户指南"

---

## 简介

`NamespaceQueue` 是命名空间级别的队列。租户可以在自己的 namespace 中创建和管理队列，而不需要创建集群级 `Queue` 的权限。

它与 `Queue` 使用一致的资源语义（`capability`、`deserved`、`guarantee`、`reclaimable`、`priority`），并支持层级结构。每棵 NamespaceQueue 树都挂载在一个已经为该 namespace 授权的集群 `Queue` 之下。

NamespaceQueue 是 Alpha 特性，默认关闭。

## 启用 NamespaceQueue

### 使用 Helm 安装

```shell
helm upgrade --install volcano volcano-sh/volcano \
  --namespace volcano-system --create-namespace \
  --set custom.namespace_queue_enable=true
```

该参数会为 scheduler、controller manager 和 admission 开启 `NamespaceQueue` Feature Gate，注册 NamespaceQueue 校验 Webhook，并使用带有 `capacity` 插件的调度器配置（设置了 `custom.scheduler_config_override` 时除外）。

### 使用 YAML 文件安装

为 `volcano-scheduler`、`volcano-controllers` 和 `volcano-admission` 三个 Deployment 添加 Feature Gate：

```shell
--feature-gates=NamespaceQueue=true
```

NamespaceQueue 依赖支持层级的 `capacity` 插件。请确认调度器配置中包含该插件，并且没有同时启用 `proportion`：

```yaml
actions: "enqueue, allocate, backfill"
tiers:
- plugins:
  - name: priority
  - name: gang
- plugins:
  - name: predicates
  - name: capacity
    enableHierarchy: true
  - name: nodeorder
```

集群 Queue 之下默认最多允许 5 层 NamespaceQueue。如需调整，请同时在 controller manager 和 admission 上设置 `--max-namespacequeue-depth`。

## 使用方法

### 1. 在集群 Queue 上授权 namespace

集群管理员在父 `Queue` 中列出允许使用的 namespace：

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: research
spec:
  weight: 1
  allowedNamespaces:
    - team-a
```

`allowedNamespaces: ["*"]` 表示允许所有 namespace。该字段为空时，任何 NamespaceQueue 都无法挂载到该 Queue。

### 2. 授予租户权限

仅允许租户管理自己 namespace 下的 NamespaceQueue：

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: namespacequeue-admin
  namespace: team-a
rules:
- apiGroups: ["scheduling.volcano.sh"]
  resources: ["namespacequeues"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: namespacequeue-admin
  namespace: team-a
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: namespacequeue-admin
subjects:
- kind: User
  name: team-a-user
```

### 3. 创建 NamespaceQueue

`parent` 使用 `cluster/<name>` 指向集群 Queue，使用不带前缀的名称指向同 namespace 下的另一个 NamespaceQueue。省略时默认为 `cluster/default`。

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
```

对于每一种资源，取值需要满足 `guarantee <= deserved <= capability`。

### 4. 提交作业

使用 `namespace/<name>` 作为队列引用。系统会自动使用作业所在的 namespace，因此不支持跨 namespace 引用。

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
          command: ["sh", "-c", "sleep 300"]
          resources:
            requests:
              cpu: "1"
        restartPolicy: Never
```

`PodGroup.spec.queue` 和 `scheduling.volcano.sh/queue-name` 注解同样支持 `namespace/<name>`。不带前缀的值（例如 `research`）仍然指向集群 Queue。

### 5. 查看状态

```shell
kubectl get nq -n team-a
kubectl describe nq training -n team-a
```

`status` 中包含生命周期 `state`、PodGroup 计数（`pending`、`inqueue`、`running`、`completed`）以及已分配资源 `allocated`。只有 `Ready` 条件为 `True` 时，Job 和 PodGroup 才会被接收。`Authorized` 条件表示父 Queue 是否允许该 namespace。

## 典型场景

### 场景一：把团队配额拆分为子队列

团队 A 拥有上面的 `training` 队列，现在希望划出一部分给在线推理。创建一个指向 `training` 的子 NamespaceQueue：

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: NamespaceQueue
metadata:
  name: inference
  namespace: team-a
spec:
  parent: training
  capability:
    cpu: "40"
  deserved:
    cpu: "20"
  guarantee:
    resource:
      cpu: "10"
```

子队列受所有祖先队列 `capability` 的限制，且所有子队列的 `guarantee` 之和不能超过父队列。推理作业使用 `queue: namespace/inference` 提交。

### 场景二：不同团队使用同名队列

NamespaceQueue 是命名空间级资源，`team-a` 和 `team-b` 可以各自拥有名为 `training` 的队列，二者互相隔离，并分别挂载到授权了各自 namespace 的集群 Queue 上。监控指标使用 `<namespace>/<name>` 作为 `queue_name` 标签，例如 `team-a/training`。

### 场景三：从集群 Queue 迁移到 NamespaceQueue

1. 将 namespace 加入集群 Queue 的 `allowedNamespaces`。
2. 创建 `parent: cluster/<queue-name>` 的 NamespaceQueue，并等待 `Ready` 变为 `True`。
3. 将作业的队列改为 `namespace/<name>`。

如需回滚，把队列引用改回集群 Queue 即可。使用不带前缀队列名的已有作业不受影响。

## 删除 NamespaceQueue

NamespaceQueue 仍有作业、预留资源或子队列时无法删除。请先删除作业和子队列，再删除该队列：

```shell
kubectl delete nq inference training -n team-a
```

如果删除时提示 `must be drained before deletion`，请等待 `status.allocated` 清空后重试。集群 Queue 同样如此：存在已挂载的 NamespaceQueue 时无法删除。

## 常见问题排查

| 现象 | 排查方向 |
| --- | --- |
| `Authorized` 为 `False`（`NamespaceNotAllowed`） | 父 Queue 的 `allowedNamespaces` 中缺少该 namespace |
| `Ready` 为 `False`（`ParentNotFound`、`ParentNotReady`） | `parent` 名称是否正确，以及父队列自身的状态 |
| `Ready` 为 `False`（`ParentConstraintViolation`） | `guarantee <= deserved <= capability` 以及父队列的限制 |
| `Ready` 为 `False`（`HierarchyDepthExceeded`、`HierarchyCycle`） | 层级深度限制和父队列链 |
| Job 或 PodGroup 被拒绝 | 队列是否 `Ready=True`，引用是否为 `namespace/<name>` |
| Pod 一直 `Pending` | 调度器是否使用 `enableHierarchy: true` 的 `capacity` 插件，队列的 `capability` 是否足够 |

更多细节请参考 [NamespaceQueue 设计文档](https://github.com/volcano-sh/volcano/blob/master/docs/design/namespace-queue.md)。
