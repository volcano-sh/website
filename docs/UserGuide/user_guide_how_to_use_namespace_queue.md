---
title: "NamespaceQueue User Guide"

---

## Introduction

`NamespaceQueue` is a namespace-scoped queue. Tenants can create and manage queues in their own namespace without permission to create the cluster-scoped `Queue`.

It supports the same resource semantics as `Queue` (`capability`, `deserved`, `guarantee`, `reclaimable`, `priority`) and can be organized as a hierarchy. Every NamespaceQueue tree is attached to a cluster `Queue` that the administrator has authorized for the namespace.

NamespaceQueue is an Alpha feature and is disabled by default.

## Enable NamespaceQueue

### Install with Helm

```shell
helm upgrade --install volcano volcano-sh/volcano \
  --namespace volcano-system --create-namespace \
  --set custom.namespace_queue_enable=true
```

This turns on the `NamespaceQueue` feature gate for the scheduler, controller manager and admission, registers the NamespaceQueue validating webhook, and uses a scheduler configuration with the `capacity` plugin (unless `custom.scheduler_config_override` is set).

### Install with YAML files

Add the feature gate to the `volcano-scheduler`, `volcano-controllers` and `volcano-admission` deployments:

```shell
--feature-gates=NamespaceQueue=true
```

NamespaceQueue relies on the hierarchical `capacity` plugin. Make sure the scheduler configuration contains it, and that `proportion` is not enabled at the same time:

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

The hierarchy allows 5 NamespaceQueue levels below a cluster Queue by default. To change it, set `--max-namespacequeue-depth` on both the controller manager and admission.

## Usage

### 1. Authorize the namespace on a cluster Queue

A cluster administrator lists the allowed namespaces in the parent `Queue`:

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

`allowedNamespaces: ["*"]` allows every namespace. If the field is empty, no NamespaceQueue can attach to the Queue.

### 2. Grant tenant permissions

Allow the tenant to manage NamespaceQueues in its own namespace only:

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

### 3. Create a NamespaceQueue

`parent` uses `cluster/<name>` for a cluster Queue, and a plain name for another NamespaceQueue in the same namespace. If omitted, it defaults to `cluster/default`.

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

For every resource, the values must satisfy `guarantee <= deserved <= capability`.

### 4. Submit a workload

Use `namespace/<name>` as the queue reference. The workload's own namespace is used, so cross-namespace references are not supported.

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

`PodGroup.spec.queue` and the `scheduling.volcano.sh/queue-name` annotation accept the same `namespace/<name>` value. An unprefixed value such as `research` still refers to a cluster Queue.

### 5. Check the status

```shell
kubectl get nq -n team-a
kubectl describe nq training -n team-a
```

`status` reports the lifecycle `state`, PodGroup counters (`pending`, `inqueue`, `running`, `completed`) and the `allocated` resources. Jobs and PodGroups are only accepted when the `Ready` condition is `True`. The `Authorized` condition tells whether the namespace is allowed by the parent.

## Typical Scenarios

### Scenario 1: Split a team quota into sub-queues

Team A owns the `training` queue above, and wants to give part of it to online inference. Create a child NamespaceQueue that points to `training`:

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

Child queues are limited by the `capability` of every ancestor, and the total `guarantee` of the children must fit in the parent. Submit inference workloads with `queue: namespace/inference`.

### Scenario 2: Same queue name in different teams

NamespaceQueues are namespaced, so `team-a` and `team-b` can both own a queue named `training`. They are isolated from each other, and each one attaches to a cluster Queue that authorizes its namespace. Metrics use `<namespace>/<name>` as the `queue_name` label, such as `team-a/training`.

### Scenario 3: Migrate a team from a cluster Queue

1. Add the namespace to `allowedNamespaces` of the cluster Queue.
2. Create a NamespaceQueue with `parent: cluster/<queue-name>` and wait until `Ready` is `True`.
3. Change the workloads' queue to `namespace/<name>`.

To roll back, change the queue reference back to the cluster Queue. Existing workloads that use unprefixed queue names are not affected.

## Delete a NamespaceQueue

A NamespaceQueue cannot be deleted while it still has workloads, reserved resources or child queues. Delete the workloads and the child queues first, then delete the queue:

```shell
kubectl delete nq inference training -n team-a
```

If the deletion is rejected with `must be drained before deletion`, wait until `status.allocated` is empty and retry. The same applies to a cluster Queue: it cannot be deleted while a NamespaceQueue is attached.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `Authorized` is `False` (`NamespaceNotAllowed`) | The namespace is missing in `allowedNamespaces` of the parent Queue |
| `Ready` is `False` (`ParentNotFound`, `ParentNotReady`) | The `parent` name, and the parent's own status |
| `Ready` is `False` (`ParentConstraintViolation`) | `guarantee <= deserved <= capability` and the parent's limits |
| `Ready` is `False` (`HierarchyDepthExceeded`, `HierarchyCycle`) | The depth limit and the parent chain |
| Job or PodGroup is rejected | The queue is `Ready=True` and the reference is `namespace/<name>` |
| Pods stay `Pending` | The scheduler uses `capacity` with `enableHierarchy: true`, and the queue has enough `capability` |

For more details, see the [NamespaceQueue design](https://github.com/volcano-sh/volcano/blob/master/docs/design/namespace-queue.md).
