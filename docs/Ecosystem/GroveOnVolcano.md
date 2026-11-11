---
title: "Grove on Volcano"
sidebar_position: 10
---

### Grove introduction

[Grove](https://github.com/ai-dynamo/grove) is a Kubernetes API for orchestrating multi-component AI inference workloads. It describes a whole inference service in one object and manages the startup, scaling, and scheduling of its components. Its main resources are:

- **PodClique**: a group of pods with the same configuration, such as one role of a service (for example, prefill or decode workers). It behaves like a ReplicaSet with gang termination.
- **PodCliqueScalingGroup**: PodCliques that scale together while keeping their replica ratio, for example a leader and its workers in a multi-node instance.
- **PodCliqueSet**: the top-level object that contains the PodCliques and PodCliqueScalingGroups of one service. Its replicas create complete copies of the service.
- **PodGang**: the scheduler-facing object that Grove creates for a PodCliqueSet replica. It lists the pods that must be admitted together and the minimum number of pods required from each PodClique. Each PodCliqueSet replica has one base PodGang, and can have more PodGangs for PodCliqueScalingGroup replicas (see [How Grove objects map to Volcano](#how-grove-objects-map-to-volcano)).

Grove sends each PodGang to a scheduler backend. The Volcano backend turns each PodGang into one Volcano `PodGroup`, so Volcano admits each gang as a whole or not at all.

### Prerequisites

- **Volcano v1.14 or newer.** The Volcano backend uses the `subGroupPolicy` field of the Volcano `PodGroup` API. If the field is missing, the Volcano backend cannot initialize. Install Volcano by following the [Volcano quick start guide](https://github.com/volcano-sh/volcano#quick-start-guide).
- **Grove v0.2.0-beta1 or newer.** The examples use the `grove.io/v1beta1` API. You do not need to install Grove before you start: [New installation](#new-installation) installs it with the Volcano backend enabled, and [Existing installation](#existing-installation) enables the backend on a release that is already running.

### Enable the Volcano backend

To use Volcano with Grove, save the following configuration as `grove-values.yaml`:

```yaml title="grove-values.yaml"
config:
  scheduler:
    profiles:
      - name: default-scheduler
      - name: volcano
```

Pods use the Volcano backend when their pod template sets `schedulerName: volcano`. All pods in one PodCliqueSet must resolve to the same scheduler.

#### New installation

If Grove is not installed yet, install the operator with these values:

```bash
$ helm upgrade -i grove oci://ghcr.io/ai-dynamo/grove/grove-charts --version v0.2.0-beta1 \
    --namespace grove-system --create-namespace -f grove-values.yaml --wait --timeout 5m
```

#### Existing installation

If Grove is already installed, upgrade the existing release in place. Keep its release name and namespace. The [Grove installation guide](https://github.com/ai-dynamo/grove/blob/v0.2.0-beta1/docs/installation.md) installs a release named `grove` in the current namespace, which is usually `default`. List the release to find its name and namespace, then upgrade it:

```bash
$ helm list --all-namespaces --filter grove
$ helm upgrade <release-name> oci://ghcr.io/ai-dynamo/grove/grove-charts --version v0.2.0-beta1 \
    --namespace <release-namespace> --reuse-values -f grove-values.yaml --wait --timeout 5m
```

The `profiles` list in `grove-values.yaml` replaces the list in the release. If the release uses other scheduler profiles that are still in use, add them to `grove-values.yaml` before you upgrade. If the release runs a Grove version older than v0.2.0-beta1, read the [upgrade notes](https://github.com/ai-dynamo/grove/blob/v0.2.0-beta1/docs/installation.md#upgrade-notes) first. The upgrade restarts the operator with the new configuration.

### Queue selection

Set the Volcano queue for a PodCliqueSet with the `scheduling.grove.io/volcano-queue` annotation on the PodCliqueSet metadata. If the annotation is omitted, Grove uses the `default` queue.

- The queue must exist and be in the `Open` state. Grove checks this when you create the PodCliqueSet. For example, a missing queue is rejected with `volcano queue "no-such-queue" does not exist`.
- A PodClique may repeat the annotation, but the value must match the PodCliqueSet and every PodClique must resolve to the same queue.
- Grove does not create or manage queues. Create them with Volcano, for example with a `Queue` resource.

### How Grove objects map to Volcano

Each PodCliqueSet replica gets one or more PodGangs:

- **Base PodGang** (label `grove.io/podgang-role: Anchor`): the standalone PodCliques of the replica (PodCliques that are not in a PodCliqueScalingGroup) and the first `minAvailable` replicas of each PodCliqueScalingGroup.
- **One PodGang for each additional PodCliqueScalingGroup replica** (label `grove.io/podgang-role: Tail`, or `ScaleOut` for replicas added later by scaling out): each PodCliqueScalingGroup replica above `minAvailable` gets a PodGang of its own. Grove keeps the pods of these PodGangs gated until the base PodGang is scheduled.

For example, one PodCliqueSet replica with a PodCliqueScalingGroup of `replicas: 2` and `minAvailable: 1` gets two PodGangs: the base PodGang, which holds scaling group replica 0, and a PodGang for scaling group replica 1. Volcano gets one PodGroup for each, and admits each one on its own. A PodCliqueSet without PodCliqueScalingGroups, like the example below, has one PodGang per replica.

| Grove object | Volcano object | Details |
|--------------|----------------|---------|
| PodGang | PodGroup with the same name | The PodGroup is owned by the PodGang and gets the PodGang labels. Base PodGangs are named `<pcs-name>-<replica-index>-<epoch>`. PodGangs for additional scaling group replicas add `-<pcsg-name>-<pcsg-replica-index>`. List them with `kubectl get podgangs.scheduler.grove.io -l app.kubernetes.io/part-of=<pcs-name>`. |
| Minimum pod count of each PodClique in the PodGang | `spec.minMember` | Sum of the `minAvailable` values of the PodCliques in that PodGang. `minAvailable` defaults to 1. |
| PodClique in the PodGang | One entry in `spec.subGroupPolicy` | `name` is the PodClique name. `labelSelector` matches the `grove.io/podclique` label. `subGroupSize` is the PodClique `minAvailable`. |
| Queue annotation | `spec.queue` | Defaults to `default`. |
| PodGang priority class | `spec.priorityClassName` | Copied from the PodGang. |
| Pod | `schedulerName: volcano` and annotation `scheduling.k8s.io/group-name` | The annotation holds the PodGroup name, which tells Volcano which gang the pod belongs to. |

### Two-role example

This example creates one PodCliqueSet with two roles, `prefill` and `decode`. Each role has two pods, and both roles must be admitted together. It uses `busybox` and small CPU and memory requests, so it runs on a laptop. Save it as `volcano-demo.yaml`:

```yaml title="volcano-demo.yaml"
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

# Example output (trimmed), with node names replaced by placeholders:
# NAME                                READY   STATUS    RESTARTS   AGE   IP            NODE
# volcano-demo-0-decode-8g5dh         1/1     Running   0          34s   10.244.2.31   <node-1>
# volcano-demo-0-decode-cdvtl         1/1     Running   0          34s   10.244.2.28   <node-1>
# volcano-demo-0-prefill-jvm9k        1/1     Running   0          34s   10.244.2.30   <node-1>
# volcano-demo-0-prefill-vbbhw        1/1     Running   0          34s   10.244.2.29   <node-1>

$ kubectl get podgroup
# NAME                                 STATUS    MINMEMBER   RUNNINGS   AGE
# volcano-demo-0-1794054162987975219   Running   4           4          30s

$ kubectl get podgroup <podgroup-name> -o yaml
# Replace <podgroup-name> with the NAME from the previous command.
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
