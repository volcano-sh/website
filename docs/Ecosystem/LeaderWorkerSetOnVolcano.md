---
title: "LeaderWorkerSet on Volcano"
sidebar_position: 11
---

### LeaderWorkerSet introduction

[LeaderWorkerSet (LWS)](https://lws.sigs.k8s.io/) is a Kubernetes API that deploys groups of pods as a unit of replication. Each replica is a group made of one leader pod and `size - 1` worker pods. LWS is used for multi-host AI/ML inference, where one model instance spans several pods and nodes.

With the Volcano provider, LWS creates one Volcano `PodGroup` for each replica, so the pods of a replica are admitted as one gang.

> **Tested versions:** LeaderWorkerSet v1.0.0 (Helm chart `lws`) with Volcano v1.16.0 on a kind cluster running Kubernetes v1.37. The commands, YAML, and outputs on this page were run against this combination.

### Prerequisites

- Volcano installed. Follow the [Volcano quick start guide](https://github.com/volcano-sh/volcano#quick-start-guide).
- LeaderWorkerSet installed. Follow the [LeaderWorkerSet installation guide](https://lws.sigs.k8s.io/docs/installation/).

### Enable the Volcano provider

Set `gangSchedulingManagement.schedulerProvider` to `volcano` when you install the LWS chart. The chart then grants the controller access to Volcano `PodGroup` resources:

```bash
$ helm install lws oci://registry.k8s.io/lws/charts/lws --version=1.0.0 \
    --namespace lws-system --create-namespace \
    --set gangSchedulingManagement.schedulerProvider=volcano \
    --wait --timeout 300s
```

When the controller starts with the Volcano provider, its log shows `Gang scheduling enabled` with `provider: volcano`.

LWS does not set the scheduler for your pods. Set `schedulerName: volcano` in both the `leaderTemplate` and the `workerTemplate`.

### Per-replica gang semantics

For each replica, LWS creates one PodGroup named `<lws-name>-<group-index>-<revision>`. Its `spec.minMember` depends on the `startupPolicy` of the LeaderWorkerSet:

- **`LeaderCreated`** (the default): `minMember` is the group `size`. Volcano admits the leader and all of its workers together, or none of them.
- **`LeaderReady`**: `minMember` is 1, so Volcano admits the leader first. Workers are created only after the leader is ready. `minResources` still covers the whole group, so Volcano checks that the full replica can fit.

Each pod gets the annotation `scheduling.k8s.io/group-name` with the name of its PodGroup. The PodGroup is owned by the leader pod. Because each replica has its own PodGroup, Volcano admits each gang on its own.

### Queue and network topology annotations

- **Queue:** set the `scheduling.volcano.sh/queue-name` annotation on the LeaderWorkerSet. LWS copies it to the PodGroup `spec.queue`.
- **Network topology:** the `volcano.sh/` annotations on the LeaderWorkerSet, including `volcano.sh/network-topology-mode` and `volcano.sh/network-topology-highest-tier-allowed`, are copied to the PodGroup **annotations**. The provider does not set the PodGroup `spec.networkTopology` field. In our run, a LeaderWorkerSet annotated with `hard` mode and `highestTierAllowed: "1"` had its two pods placed on two different worker nodes, so the annotations did not constrain placement. Do not rely on these annotations for topology-aware placement. For what the topology fields mean in Volcano, see [Network Topology Aware Scheduling](/docs/KeyFeatures/NetworkTopologyAware).

### Example: two replicas of size 2

This example creates a Volcano queue and a LeaderWorkerSet with two replicas of two pods each. The pods request only CPU and memory and use `busybox`, so the example runs on a laptop. Save it as `lws-volcano.yaml`:

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: lws-demo
spec:
  weight: 1
---
apiVersion: leaderworkerset.x-k8s.io/v1
kind: LeaderWorkerSet
metadata:
  name: lws-volcano
  annotations:
    scheduling.volcano.sh/queue-name: lws-demo
spec:
  replicas: 2
  leaderWorkerTemplate:
    size: 2
    leaderTemplate:
      spec:
        schedulerName: volcano
        containers:
        - name: leader
          image: busybox:1.36
          command: ["sh", "-c", "sleep 3600"]
          resources:
            requests:
              cpu: 100m
              memory: 32Mi
    workerTemplate:
      spec:
        schedulerName: volcano
        containers:
        - name: worker
          image: busybox:1.36
          command: ["sh", "-c", "sleep 3600"]
          resources:
            requests:
              cpu: 100m
              memory: 32Mi
```

Apply it and check the pods and PodGroups:

```bash
$ kubectl apply -f lws-volcano.yaml
$ kubectl get pods -o wide -l leaderworkerset.sigs.k8s.io/name=lws-volcano

# Example output from a kind cluster, with node names replaced by placeholders.
# Expected output:
# NAME              READY   STATUS    RESTARTS   AGE   IP            NODE
# lws-volcano-0     1/1     Running   0          40s   10.244.1.17   <node-1>
# lws-volcano-0-1   1/1     Running   0          40s   10.244.2.33   <node-2>
# lws-volcano-1     1/1     Running   0          40s   10.244.2.34   <node-2>
# lws-volcano-1-1   1/1     Running   0          40s   10.244.1.16   <node-1>

$ kubectl get podgroup
# Expected output:
# NAME                       STATUS    MINMEMBER   RUNNINGS   AGE
# lws-volcano-0-7b9ccbccb9   Running   2           2          40s
# lws-volcano-1-7b9ccbccb9   Running   2           2          40s

$ kubectl get podgroup lws-volcano-0-7b9ccbccb9 -o yaml
# spec:
#   minMember: 2
#   minResources:
#     cpu: 200m
#     memory: 64Mi
#   queue: lws-demo
```

Each replica has its own PodGroup with `minMember: 2`. The `7b9ccbccb9` suffix is the revision hash of the pod template, so it changes when the template changes.

### Current support and planned work

| Capability | Volcano provider in LWS v1.0.0 |
|------------|--------------------------------|
| Gang per replica (`startupPolicy: LeaderCreated`) | Supported. This page covers it. |
| `startupPolicy: LeaderReady` | Supported. `minMember` is 1. |
| Queue (`scheduling.volcano.sh/queue-name`) | Supported. |
| Network topology annotations (`volcano.sh/*`) | Copied to the PodGroup annotations only. They do not set `spec.networkTopology` and did not constrain placement in our run. |
| Typed scheduling API (`spec.scheduling`) | Alpha. Requires the `WorkloadAwareScheduling` feature gate. Only replica-level gang is accepted with Volcano. |
| Whole-LeaderWorkerSet or role-level gang | Rejected. The Volcano provider accepts only replica-level gang in the typed API. |
| Basic policy, typed scheduling constraints, disruption mode | Rejected by the [admission webhook](https://github.com/kubernetes-sigs/lws/blob/v1.0.0/pkg/webhooks/leaderworkerset_webhook.go). The controller also reports a reconcile error (`ReasonUnsupportedProviderCapability`) for these fields, from the [Volcano provider](https://github.com/kubernetes-sigs/lws/blob/v1.0.0/pkg/schedulerprovider/volcano_provider.go). |
| Shared resource claims (`resourceClaims` on the leader or worker) | Rejected by the [admission webhook](https://github.com/kubernetes-sigs/lws/blob/v1.0.0/pkg/webhooks/leaderworkerset_webhook.go). |
| Nested LeaderWorkerSet / replica / role hierarchy (nested groups of gangs) | Not supported. The [KEP-666 capability table](https://github.com/kubernetes-sigs/lws/blob/v1.0.0/keps/666-gang-scheduling-in-lws/README.md) lists it as Rejected for the Volcano provider. |

Gang scheduling for LeaderWorkerSet is being developed in [KEP-666](https://github.com/kubernetes-sigs/lws/tree/v1.0.0/keps/666-gang-scheduling-in-lws). The KEP keeps the current Volcano behavior when `spec.scheduling` is absent, and it lists the Volcano provider's capabilities alongside the native Kubernetes provider. Richer role-level and whole-LeaderWorkerSet gang support is available only through the native Kubernetes path described below.

### Learn more

- [LeaderWorkerSet native gang scheduling](https://lws.sigs.k8s.io/docs/concepts/leaderworkerset/gang-scheduling/). This is the alpha path that uses Kubernetes Workload-Aware Scheduling APIs instead of Volcano. It supports replica, role, and whole-LeaderWorkerSet levels.
- [LeaderWorkerSet gang scheduling example](https://lws.sigs.k8s.io/docs/examples/leaderworkerset/gang-scheduling/)
- [Volcano provider source code](https://github.com/kubernetes-sigs/lws/blob/v1.0.0/pkg/schedulerprovider/volcano_provider.go) for the exact PodGroup fields that LWS sets
