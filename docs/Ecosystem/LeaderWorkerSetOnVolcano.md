---
title: "LeaderWorkerSet on Volcano"
sidebar_position: 11
---

### LeaderWorkerSet introduction

[LeaderWorkerSet (LWS)](https://lws.sigs.k8s.io/) is a Kubernetes API that deploys groups of pods as a unit of replication. Each replica is a group made of one leader pod and `size - 1` worker pods. LWS is used for multi-host AI/ML inference, where one model instance spans several pods and nodes.

With the Volcano provider, LWS creates one Volcano `PodGroup` for each replica, so the pods of a replica are admitted as one gang.

### Prerequisites

- Volcano installed. Follow the [Volcano quick start guide](https://github.com/volcano-sh/volcano#quick-start-guide).
- **LeaderWorkerSet v0.7.0 or newer.** The Volcano provider is available from v0.7.0, and the commands on this page install v1.0.0. You do not need to install LWS before you start: [New installation](#new-installation) installs it, and [Existing installation](#existing-installation) enables Volcano on a Helm release that is already running.

### Enable the Volcano provider

Set `gangSchedulingManagement.schedulerProvider` to `volcano` in the LWS Helm chart. The chart then grants the controller access to Volcano `PodGroup` resources and configures the controller to use the Volcano provider.

#### New installation

If LWS is not installed yet, install it with the Volcano provider enabled:

```bash
$ helm install lws oci://registry.k8s.io/lws/charts/lws --version=1.0.0 \
    --namespace lws-system --create-namespace \
    --set gangSchedulingManagement.schedulerProvider=volcano \
    --wait --timeout 300s
```

#### Existing installation

If LWS is already installed with Helm, upgrade the release in place and keep its other values. The commands below use the release name `lws` and the namespace `lws-system` from the LWS installation guide. If your release uses other names, replace them; `kubectl -n <namespace> get deployments` shows the controller Deployment name. The controller reads its configuration only when it starts, so restart it after the upgrade:

```bash
$ helm upgrade lws oci://registry.k8s.io/lws/charts/lws --version=1.0.0 \
    --namespace lws-system --reuse-values \
    --set gangSchedulingManagement.schedulerProvider=volcano \
    --wait --timeout 300s
$ kubectl -n lws-system rollout restart deployment/lws-controller-manager
$ kubectl -n lws-system rollout status deployment/lws-controller-manager --timeout=300s
```

If the release runs an LWS version older than v1.0.0, apply the new CRDs first as described in [Upgrade by Helm](https://lws.sigs.k8s.io/docs/installation/#upgrade-by-helm), because `helm upgrade` does not update CRDs.

#### Check the controller

```bash
$ kubectl -n lws-system logs deployment/lws-controller-manager | grep "Gang scheduling enabled"
```

The output contains `Gang scheduling enabled` with `"provider": "volcano"`.

LWS does not set the scheduler for your pods. Set `schedulerName: volcano` in both the `leaderTemplate` and the `workerTemplate`.

### Per-replica gang semantics

For each replica, LWS creates one PodGroup named `<lws-name>-<group-index>-<revision>`. Its `spec.minMember` depends on the `startupPolicy` of the LeaderWorkerSet:

- **`LeaderCreated`** (the default): `minMember` is the group `size`. Volcano admits the leader and all of its workers together, or none of them.
- **`LeaderReady`**: `minMember` is 1, so Volcano admits the leader first. Workers are created only after the leader is ready. `minResources` still covers the whole group, so Volcano checks that the full replica can fit.

Each pod gets the annotation `scheduling.k8s.io/group-name` with the name of its PodGroup. The PodGroup is owned by the leader pod. Because each replica has its own PodGroup, Volcano admits each gang on its own.

### Queue and network topology annotations

- **Queue:** set the `scheduling.volcano.sh/queue-name` annotation on the LeaderWorkerSet. LWS copies it to the PodGroup `spec.queue`.
- **Network topology:** LWS copies every annotation with the `volcano.sh/` prefix from the LeaderWorkerSet to the PodGroup **metadata**, including `volcano.sh/network-topology-mode` and `volcano.sh/network-topology-highest-tier-allowed`. The Volcano provider in LWS v1.0.0 sets only `minMember`, `minResources` and `queue` in the PodGroup spec. It does not set `spec.networkTopology`, which is the field the Volcano scheduler uses for network topology-aware scheduling, so these annotations do not affect placement. For what the topology fields mean in Volcano, see [Network Topology Aware Scheduling](/docs/KeyFeatures/NetworkTopologyAware).

### Example: two replicas of size 2

This example creates a Volcano queue and a LeaderWorkerSet with two replicas of two pods each. The pods request only CPU and memory and use `busybox`, so the example runs on a laptop. Save it as `lws-volcano.yaml`:

```yaml title="lws-volcano.yaml"
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

# Example output, with node names replaced by placeholders:
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

$ kubectl get podgroup <podgroup-name> -o yaml
# Replace <podgroup-name> with a NAME from the previous command.
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
| Network topology annotations (`volcano.sh/*`) | Not supported. They are copied to the PodGroup metadata, but the provider does not set `spec.networkTopology`, so they do not affect placement. |
| Typed scheduling API (`spec.scheduling`) | Alpha. Requires the `WorkloadAwareScheduling` feature gate. Only replica-level gang is accepted with Volcano. |
| Whole-LeaderWorkerSet or role-level gang | Rejected. The Volcano provider accepts only replica-level gang in the typed API. |
| Basic policy, typed scheduling constraints, disruption mode | Rejected by the [admission webhook](https://github.com/kubernetes-sigs/lws/blob/v1.0.0/pkg/webhooks/leaderworkerset_webhook.go). The controller also reports a reconcile error (`ReasonUnsupportedProviderCapability`) for these fields, from the [Volcano provider](https://github.com/kubernetes-sigs/lws/blob/v1.0.0/pkg/schedulerprovider/volcano_provider.go). |
| Shared resource claims (`resourceClaims` on the leader or worker) | Rejected by the [admission webhook](https://github.com/kubernetes-sigs/lws/blob/v1.0.0/pkg/webhooks/leaderworkerset_webhook.go). |
| Nested LeaderWorkerSet / replica / role hierarchy (nested groups of gangs) | Not supported. The [KEP-666 capability table](https://github.com/kubernetes-sigs/lws/blob/v1.0.0/keps/666-gang-scheduling-in-lws/README.md) lists it as Rejected for the Volcano provider. |

Gang scheduling for LeaderWorkerSet is being developed in [KEP-666](https://github.com/kubernetes-sigs/lws/tree/v1.0.0/keps/666-gang-scheduling-in-lws). The KEP keeps the current Volcano behavior when `spec.scheduling` is absent, and it lists the Volcano provider's capabilities alongside the native Kubernetes provider. Richer role-level and whole-LeaderWorkerSet gang support is available only through the native Kubernetes path described below.

### Learn more

- [LeaderWorkerSet native gang scheduling](https://lws.sigs.k8s.io/docs/concepts/leaderworkerset/gang-scheduling/). This is the alpha path that uses Kubernetes Workload-Aware Scheduling APIs instead of Volcano. It supports replica, role, and whole-LeaderWorkerSet levels.
- [LeaderWorkerSet gang scheduling example](https://lws.sigs.k8s.io/docs/examples/leaderworkerset/gang-scheduling/)
- [Volcano provider source code](https://github.com/kubernetes-sigs/lws/blob/v1.0.0/pkg/schedulerprovider/volcano_provider.go#L124-L153): LWS sets only `minMember`, `minResources` and `queue` in the PodGroup spec, and copies the `volcano.sh/` annotations to the PodGroup metadata.
