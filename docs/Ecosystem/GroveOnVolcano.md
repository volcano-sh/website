---
title: "Grove on Volcano"
sidebar_position: 10
---

### Grove introduction

[Grove](https://github.com/ai-dynamo/grove) is a Kubernetes API for orchestrating multi-component AI inference workloads. It describes a whole inference service in one object and manages the startup, scaling, and scheduling of its components. Its main resources are:

- **PodClique**: a group of pods with the same configuration, such as one role of a service (for example, prefill or decode workers). It behaves like a ReplicaSet with gang termination.
- **PodCliqueScalingGroup**: PodCliques that scale together while keeping their replica ratio, for example a leader and its workers in a multi-node instance.
- **PodCliqueSet**: the top-level object that contains the PodCliques and PodCliqueScalingGroups of one service. Its replicas create complete copies of the service.
- **PodGang**: the scheduler-facing object that Grove creates for each PodCliqueSet replica. It lists the PodCliques that must be admitted together and the minimum number of pods required from each one.

Grove sends each PodGang to a scheduler backend. The Volcano backend turns each PodGang into one Volcano `PodGroup`, so Volcano admits the whole gang or none of it.

> **Tested versions:** Grove v0.2.0-beta1 (Helm chart `grove-charts`) with Volcano v1.16.0 on a kind cluster running Kubernetes v1.37. The commands, YAML, and outputs on this page were run against this combination.

### Prerequisites

- **Volcano v1.14 or newer.** The Volcano backend uses the `subGroupPolicy` field of the Volcano `PodGroup` API. If the field is missing, the Volcano backend cannot initialize. Install Volcano by following the [Volcano quick start guide](https://github.com/volcano-sh/volcano#quick-start-guide).
- **A Grove release that includes the Volcano backend.** This page uses Grove v0.2.0-beta1. Install the Grove operator by following the [Grove installation guide](https://github.com/ai-dynamo/grove/blob/v0.2.0-beta1/docs/installation.md), then apply the Volcano configuration below.

### Enable the Volcano backend

The Volcano backend is off by default. Add a `volcano` scheduler profile to the operator configuration. The chart's default profile list also enables `kai-scheduler` ([chart values](https://github.com/ai-dynamo/grove/blob/v0.2.0-beta1/operator/charts/values.yaml)). The list below replaces it with the two profiles used in this guide. Save it as `grove-values.yaml`:

```yaml
config:
  scheduler:
    profiles:
      - name: default-scheduler
      - name: volcano
```

Install or upgrade the operator with these values:

```bash
$ helm upgrade -i grove oci://ghcr.io/ai-dynamo/grove/grove-charts --version v0.2.0-beta1 \
    --namespace grove-system --create-namespace -f grove-values.yaml --wait --timeout 5m
```

Pods use the Volcano backend when their pod template sets `schedulerName: volcano`. All pods in one PodCliqueSet must resolve to the same scheduler.

### Queue selection

Set the Volcano queue for a PodCliqueSet with the `scheduling.grove.io/volcano-queue` annotation on the PodCliqueSet metadata. If the annotation is omitted, Grove uses the `default` queue.

- The queue must exist and be in the `Open` state. Grove checks this when you create the PodCliqueSet. For example, a missing queue is rejected with `volcano queue "no-such-queue" does not exist`.
- A PodClique may repeat the annotation, but the value must match the PodCliqueSet and every PodClique must resolve to the same queue.
- Grove does not create or manage queues. Create them with Volcano, for example with a `Queue` resource.

### How Grove objects map to Volcano

| Grove object | Volcano object | Details |
|--------------|----------------|---------|
| PodGang | PodGroup with the same name | The PodGroup is owned by the PodGang and gets the PodGang labels. Grove appends a generated suffix to the PodGang name, so look it up with `kubectl get podgangs.scheduler.grove.io`. |
| Minimum pod count of each PodClique in the PodGang | `spec.minMember` | Sum of the PodClique `minAvailable` values. `minAvailable` defaults to 1. |
| PodClique in the PodGang | One entry in `spec.subGroupPolicy` | `name` is the PodClique name. `labelSelector` matches the `grove.io/podclique` label. `subGroupSize` is the PodClique `minAvailable`. |
| Queue annotation | `spec.queue` | Defaults to `default`. |
| PodGang priority class | `spec.priorityClassName` | Copied from the PodGang. |
| Pod | `schedulerName: volcano` and annotation `scheduling.k8s.io/group-name` | The annotation holds the PodGroup name, which tells Volcano which gang the pod belongs to. |

### Two-role example

This example creates one PodCliqueSet with two roles, `prefill` and `decode`. Each role has two pods, and both roles must be admitted together. It uses `busybox` and small CPU and memory requests, so it runs on a laptop. Save it as `volcano-demo.yaml`:

```yaml
apiVersion: grove.io/v1beta1
kind: PodCliqueSet
metadata:
  name: volcano-demo
  annotations:
    scheduling.grove.io/volcano-queue: default
spec:
  replicas: 1
  template:
    cliques:
      - name: prefill
        spec:
          roleName: prefill
          replicas: 2
          minAvailable: 2
          podSpec:
            schedulerName: volcano
            containers:
              - name: prefill
                image: busybox:1.36
                command: ["sh", "-c", "sleep 3600"]
                resources:
                  requests:
                    cpu: 100m
                    memory: 32Mi
      - name: decode
        spec:
          roleName: decode
          replicas: 2
          minAvailable: 2
          podSpec:
            schedulerName: volcano
            containers:
              - name: decode
                image: busybox:1.36
                command: ["sh", "-c", "sleep 3600"]
                resources:
                  requests:
                    cpu: 100m
                    memory: 32Mi
```

Apply it and check the pods and the PodGroup:

```bash
$ kubectl apply -f volcano-demo.yaml
$ kubectl get pods -o wide

# Example output from a kind cluster, with node names replaced by placeholders.
# Expected output (trimmed):
# NAME                                READY   STATUS    RESTARTS   AGE   IP            NODE
# volcano-demo-0-decode-8g5dh         1/1     Running   0          34s   10.244.2.31   <node-1>
# volcano-demo-0-decode-cdvtl         1/1     Running   0          34s   10.244.2.28   <node-1>
# volcano-demo-0-prefill-jvm9k        1/1     Running   0          34s   10.244.2.30   <node-1>
# volcano-demo-0-prefill-vbbhw        1/1     Running   0          34s   10.244.2.29   <node-1>

$ kubectl get podgroup
# NAME                                 STATUS    MINMEMBER   RUNNINGS   AGE
# volcano-demo-0-1794054162987975219   Running   4           4          30s

$ kubectl get podgroup volcano-demo-0-1794054162987975219 -o yaml
# spec:
#   minMember: 4
#   queue: default
#   subGroupPolicy:
#   - labelSelector:
#       matchLabels:
#         grove.io/podclique: volcano-demo-0-prefill
#     matchLabelKeys:
#     - grove.io/podclique
#     minSubGroups: 1
#     name: volcano-demo-0-prefill
#     subGroupSize: 2
#   - labelSelector:
#       matchLabels:
#         grove.io/podclique: volcano-demo-0-decode
#     matchLabelKeys:
#     - grove.io/podclique
#     minSubGroups: 1
#     name: volcano-demo-0-decode
#     subGroupSize: 2
```

`minMember` is 4 because each role contributes its `minAvailable` of 2. Each role appears as one `subGroupPolicy` entry with `subGroupSize: 2`, which is how the Volcano `subGroupPolicy` field expresses a per-role minimum inside the same gang.

Grove does not allow `minAvailable` to change on an existing PodCliqueSet. To change the size of a gang, delete the PodCliqueSet and create it again.

### Current limitations

The Grove Volcano backend in v0.2.0-beta1 covers gang scheduling by role and queue selection. It does not yet cover the following:

- **Topology-aware placement.** A `topologyConstraint` on a PodCliqueSet, PodCliqueScalingGroup, or PodClique is rejected when the Volcano backend is used, with the error `volcano scheduler backend does not support topologyConstraint on PodCliqueSet`. Grove does not create Volcano `networkTopology` or HyperNode settings. For how Volcano itself handles network topology, see [Network Topology Aware Scheduling](/docs/KeyFeatures/NetworkTopologyAware).
- **Queue lifecycle.** Grove validates that the queue exists and is open, but it does not create or delete queues.
- **Status.** Grove does not copy the Volcano PodGroup status into its own status fields.

Grove's design proposal lists topology translation and subgroup-level topology as future work.

### Learn more

- [Grove user guide](https://github.com/ai-dynamo/grove/tree/v0.2.0-beta1/docs/user-guide), including core concepts and naming conventions
- [Volcano scheduler backend proposal (376)](https://github.com/ai-dynamo/grove/tree/v0.2.0-beta1/docs/proposals/376-volcano-scheduler-backend), which describes the PodGang to PodGroup mapping and the scope of the backend
