---
title: "NamespaceQueue User Guide"
---

## Introduction

`NamespaceQueue` is a namespaced queue resource in Volcano. It allows users to manage queues in their own namespace without requiring permission to create or update a cluster-scoped `Queue`.

The resource uses the same resource management semantics as `Queue`, including `capability`, `deserved`, `guarantee`, `reclaimable`, priority, and hierarchical scheduling. `NamespaceQueue` is an Alpha feature and is disabled by default.

## Enable NamespaceQueue

### Install with Helm

Set `custom.namespace_queue_enable` to enable the feature gate on Volcano components. The default hierarchy depth is five NamespaceQueue levels below a cluster Queue.

```shell
helm upgrade --install volcano volcano-sh/volcano \
  --namespace volcano-system \
  --create-namespace \
  --set custom.namespace_queue_enable=true \
  --set custom.namespace_queue_max_depth=5
```

### Install with YAML files

Add the following feature gate to the scheduler, controller manager, and admission service:

```shell
--feature-gates=NamespaceQueue=true
```

If an existing `--feature-gates` value is configured, append `NamespaceQueue=true` to it. Set the same hierarchy depth on the admission service and controller manager:

```shell
--max-namespacequeue-depth=5
```

If an agent scheduler is enabled, enable the feature gate there as well.

## Configure Queue Scheduling Plugins

NamespaceQueue is converted to the same internal `QueueInfo` model as a cluster Queue. Plugins that consume this common model can use the same scheduling path for NamespaceQueue workloads, including `priority`, `gang`, `predicates`, `nodeorder`, `binpack`, `nodegroup`, and `extender`. This compatibility does not add NamespaceQueue-specific fields to a plugin; plugin-specific configuration and field requirements still apply.

Resource-share plugins have different NamespaceQueue semantics:

- `capacity` directly uses NamespaceQueue's `capability`, `deserved`, and `guarantee` fields, including hierarchical limits. Use it when each NamespaceQueue needs explicit resource values. See the [Capacity Plugin User Guide](./user_guide_how_to_use_capacity_plugin.md).
- In the current implementation, `proportion` can also receive NamespaceQueue through the common queue model. NamespaceQueue has no independent `weight` field, so its normalized weight is `1` and cannot be configured per NamespaceQueue. This is not equivalent to configuring a weighted cluster Queue; use `proportion` only when this default-weight behavior is acceptable and validate the result for your scheduler configuration.

The officially validated NamespaceQueue resource-share path is `capacity`. Other plugins remain compatible when they consume fields available in the common `QueueInfo` model, but a plugin that depends on a NamespaceQueue-specific field or behavior is not automatically supported.

`capacity` and `proportion` are mutually exclusive, as they are for cluster Queues. Other plugins can be enabled according to the scheduler configuration and the fields they consume.

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

## Configure a Cluster Queue

A cluster administrator must authorize a namespace before a NamespaceQueue can use a cluster Queue as its parent. Add the namespace to `spec.allowedNamespaces`:

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

The wildcard value `"*"` allows all namespaces and must be the only value in the list. An omitted or empty list does not authorize NamespaceQueue attachment.

When NamespaceQueue is enabled, Volcano initializes a newly created cluster `default` Queue with `allowedNamespaces: ["*"]`. Existing non-empty `allowedNamespaces` values are preserved, so check the existing `default` Queue before using it as a parent.

## Grant Namespace Permissions

Bind the provided editor role in the tenant namespace. A RoleBinding keeps the permission namespace-scoped even though the role is a ClusterRole:

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

Use `namespacequeue-viewer-role` when the user only needs read access.

## Create a NamespaceQueue

The tenant can create a NamespaceQueue in its own namespace. `cluster/research` refers to the cluster-scoped Queue configured above:

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

For each resource dimension, configure the values so that:

```text
guarantee <= deserved <= capability
```

A child NamespaceQueue refers to a parent in the same namespace by name:

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

`cluster/root` and cross-namespace NamespaceQueue parents are not supported. Only one NamespaceQueue subtree in a namespace can attach directly to the same cluster Queue.

## Submit Workloads

### Volcano Job

Use `namespace/<name>` in a Job's `spec.queue` to select a NamespaceQueue in the Job's namespace:

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

PodGroup uses the same queue reference:

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

The existing annotation is also supported:

```yaml
metadata:
  annotations:
    scheduling.volcano.sh/queue-name: namespace/training
```

An unqualified value such as `default` or `research` continues to refer to a cluster Queue. Use the `namespace/` prefix when selecting a NamespaceQueue. The workload's namespace is used automatically; cross-namespace references are not supported.

## Check Status and Events

```shell
kubectl get nq -n team-a
kubectl get nq training -n team-a -o yaml
kubectl describe nq training -n team-a
kubectl get events -n team-a \
  --field-selector=involvedObject.kind=NamespaceQueue,involvedObject.name=training
```

`status.state` reports the observed lifecycle of the NamespaceQueue: `Open`, `Closing`, `Closed`, or `Unknown`. The status also includes PodGroup counters (`pending`, `inqueue`, `running`, `unknown`, and `completed`), scheduler-owned `allocated` resources, and `reservation` information.

The `Authorized` condition reports whether the namespace is allowed to use its cluster parent. The `Ready` condition reports whether the parent chain, hierarchy constraints, resource constraints, and lifecycle allow scheduling. A NamespaceQueue is schedulable only when its desired and observed state is `Open` and `Ready=True` for the current generation.

Common failure reasons include `NamespaceNotAllowed`, `ParentNotFound`, `ParentNotReady`, `ParentConstraintViolation`, `HierarchyCycle`, `QueueClosing`, and `QueueClosed`.

Queue resource metrics use the queue identity as the `queue_name` label. A NamespaceQueue uses `<namespace>/<name>`, for example:

```text
volcano_queue_allocated_milli_cpu{queue_name="team-a/training"}
```

## Close and Delete a NamespaceQueue

Set the desired state to `Closed` before changing the parent or deleting the resource:

```shell
kubectl patch nq training -n team-a --type=merge \
  -p '{"spec":{"state":"Closed"}}'
```

The queue first enters `Closing`. After active PodGroups and scheduler-owned resources are drained, it becomes `Closed`. Running workloads are not forcefully evicted, and new workloads are not admitted while the queue is closing or closed.

Delete child NamespaceQueues before their parent. A NamespaceQueue with active workloads, reservations, or child queues is protected by a finalizer and cannot be deleted until it is closed and drained.

## Migration from Cluster Queues

Existing workloads continue to use cluster Queues when their queue reference is unqualified. To migrate gradually:

1. Authorize the tenant namespace in the existing cluster Queue.
2. Create a NamespaceQueue with `parent: cluster/<queue-name>`.
3. Wait for `Authorized=True` and `Ready=True`.
4. Change selected Jobs, PodGroups, or annotations to `namespace/<namespacequeue-name>`.

To roll back, restore the original unqualified cluster Queue reference. Do not remove the namespace from `allowedNamespaces` until all attached NamespaceQueues have been moved or closed and drained.

## Troubleshooting

- If admission reports that the NamespaceQueue feature is disabled, enable `NamespaceQueue=true` on the admission service, controller manager, and scheduler.
- If the NamespaceQueue is not authorized, check the parent Queue's `allowedNamespaces`.
- If the NamespaceQueue is not ready, check the parent status, hierarchy depth, and the `guarantee <= deserved <= capability` relation.
- If a NamespaceQueue workload is not scheduled, make sure the workload uses `namespace/<name>`, the referenced queue is `Ready=True`, and the configured resource-share plugin supports the NamespaceQueue fields.

For implementation details, see the [NamespaceQueue design](https://github.com/volcano-sh/volcano/blob/master/docs/design/namespace-queue.md) and [NamespaceQueue E2E tests](https://github.com/volcano-sh/volcano/blob/master/test/e2e/namespacequeue/namespacequeue_test.go).
