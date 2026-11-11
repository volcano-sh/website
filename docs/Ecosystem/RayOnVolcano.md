---
title: "Ray on Volcano"
sidebar_position: 8
---



### Ray Introduction

[Ray](https://docs.ray.io/en/latest/ray-overview/getting-started.html) is a unified distributed computing framework designed for AI/ML applications. Ray provides:

- **Distributed Training**: Scale machine learning workloads from a single machine to thousands of nodes
- **Hyperparameter Tuning**: Run parallel experiments with Ray Tune for efficient model optimization
- **Distributed Data Processing**: Process large datasets with Ray Data for batch inference and data preprocessing
- **Reinforcement Learning**: Train RL models at scale with Ray RLlib
- **Serving**: Deploy and scale ML models in production with Ray Serve
- **General Purpose Distributed Computing**: Build any distributed application with Ray Core APIs

### Running Ray on Volcano

There are two approaches to deploy Ray clusters on Volcano:

1. **KubeRay Operator Approach**: Use the KubeRay operator with Volcano scheduler integration for automated deployment and management of `RayCluster` and `RayJob` resources
2. **Volcano Job (vcjob) Approach**: Deploy Ray clusters directly using Volcano Job with the Ray plugin

Both approaches leverage Volcano's powerful scheduling capabilities including gang scheduling and network topology-aware scheduling for optimal resource allocation.

### Method 1: Using KubeRay Operator

[KubeRay](https://docs.ray.io/en/latest/cluster/kubernetes/index.html) is an open-source Kubernetes operator that simplifies running Ray on Kubernetes. It provides automated deployment, scaling, and management of Ray clusters through Kubernetes-native tools and APIs.

#### KubeRay Integration with Volcano

For each RayCluster and RayJob, KubeRay creates a Volcano `PodGroup` and sets `schedulerName: volcano` on its pods, so Volcano schedules the head and worker pods as one gang. Starting with KubeRay v1.5.1, RayCluster and RayJob resources support Volcano's gang scheduling and network topology-aware scheduling. A RayService does not get a PodGroup of its own. KubeRay creates a RayCluster for it, and the RayCluster gets a PodGroup in the same way. What KubeRay does with a RayJob's PodGroup when the job finishes depends on the release (see [How KubeRay builds the PodGroup](#how-kuberay-builds-the-podgroup)).

#### Supported Labels

To configure RayJob and RayCluster resources with Volcano scheduling, you can use the following labels in the metadata section:

| Label | Description | Required |
|-------|-------------|----------|
| `ray.io/priority-class-name` | Assigns a [Kubernetes](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/#priorityclass) priority class for pod scheduling | No |
| `volcano.sh/queue-name` | Specifies the Volcano queue for resource submission. KubeRay copies it to the PodGroup `spec.queue` | No |
| `volcano.sh/network-topology-mode` | Configures network topology-aware scheduling mode (`hard` or `soft`) | No |
| `volcano.sh/network-topology-highest-tier-allowed` | Sets the highest network tier allowed for scheduling (used with `hard` mode) | No |

You do not need to set a `ray.io/scheduler-name` label. KubeRay sets `schedulerName: volcano` on the pods itself when the Volcano batch scheduler is enabled.

#### How KubeRay builds the PodGroup

KubeRay names the PodGroup `ray-<name>-pg`, where `<name>` is the RayCluster name or, for a RayJob, the RayJob name. The PodGroup `spec.minMember` and `spec.minResources` are calculated from the RayCluster spec:

- **Head pod**: Always counted. `minMember` is 1 plus the number of worker pods counted for the gang.
- **Without autoscaling** (`enableInTreeAutoscaling` unset or `false`): each worker group contributes `replicas × numOfHosts` pods.
- **With autoscaling** (`enableInTreeAutoscaling: true`): each worker group contributes `minReplicas × numOfHosts` pods, so the gang does not wait for pods that the autoscaler may never create.
- **Suspended worker groups** (`suspend: true`) contribute nothing to `minMember` or `minResources`.
- **`minResources`** is the sum of the resource requests of the head and of the pods counted in `minMember`.

For a RayJob:

- The PodGroup is built from the inline `rayClusterSpec`. Gang scheduling is not supported for a RayJob that uses `clusterSelector` to reference an existing RayCluster.
- The submitter is not counted in `minMember`, because the submitter waits for the cluster and the gang would otherwise wait for the submitter. Its resource requests are added to `minResources`, so capacity is reserved for it. Where the submitter runs depends on `spec.submissionMode`:
  - **`K8sJobMode`** (the default): the submitter is a separate pod created by a Kubernetes Job. KubeRay adds the requests of the submitter pod template to `minResources`. The default submitter requests `500m` CPU and `200Mi` memory.
  - **`SidecarMode`**: the submitter is an extra container in the head pod. KubeRay adds the requests of that container to `minResources`, and uses its limits for any resource that has no request.
  - Other submission modes add no submitter resources.
- When the job finishes, the PodGroup is handled according to the KubeRay release:
  - **KubeRay v1.5.1**: KubeRay has no completion step for the PodGroup, so it is left unchanged. `minResources` keeps the submitter's requests in every submission mode.
  - **KubeRay v1.6.0**: KubeRay deletes the PodGroup. See the [v1.6.0 source](https://github.com/ray-project/kuberay/blob/v1.6.0/ray-operator/controllers/ray/batchscheduler/volcano/volcano_scheduler.go).
  - **KubeRay v1.6.1, v1.6.2, and v1.7.2**: KubeRay recalculates the PodGroup from the live RayCluster, and suspended worker groups stay excluded. In `K8sJobMode`, the submitter pod is not part of the RayCluster, so its requests are dropped from `minResources`. In `SidecarMode`, the submitter container is part of the head pod, so its requests stay in `minResources` even after the container exits. If the RayCluster is already gone, the PodGroup is updated with `minMember: 0` and no `minResources`. See the [v1.6.1 source](https://github.com/ray-project/kuberay/blob/v1.6.1/ray-operator/controllers/ray/batchscheduler/volcano/volcano_scheduler.go) and the [v1.7.2 source](https://github.com/ray-project/kuberay/blob/v1.7.2/ray-operator/controllers/ray/batchscheduler/volcano/volcano_scheduler.go).

On KubeRay v1.7.2, the PodGroup gets these values:

| Case | Pods counted in `minMember` | `minMember` | `minResources` |
|------|-----------------------------|-------------|----------------|
| RayCluster with head only | head | 1 | `cpu: "1"`, `memory: 2Gi` |
| RayCluster, 2 workers of 1 CPU / 1Gi, no autoscaling | head + 2 workers | 3 | `cpu: "3"`, `memory: 4Gi` |
| RayCluster, autoscaling with `minReplicas: 1` and `replicas: 2` | head + 1 worker | 2 | `cpu: "2"`, `memory: 3Gi` |
| RayCluster, worker group with `numOfHosts: 2` and `replicas: 2`, plus a suspended group with `replicas: 2` | head + 4 host pods | 5 | `cpu: "2"`, `memory: 4Gi` |
| RayJob in `K8sJobMode` (the sample below: head + 2 workers + default submitter of 500m / 200Mi), while running | head + 2 workers | 3 | `cpu: 3500m`, `memory: 4296Mi` |
| The same RayJob in `K8sJobMode`, after it completes | head + 2 workers | 3 | `cpu: "3"`, `memory: 4Gi` |
| The same RayJob in `SidecarMode`, while running and after it completes | head + 2 workers | 3 | `cpu: 3500m`, `memory: 4296Mi` |

Below are setup examples with detailed explanations. For comprehensive configuration options, please refer to the [KubeRay Volcano Scheduler Documentation](https://docs.ray.io/en/latest/cluster/kubernetes/k8s-ecosystem/volcano.html#kuberay-integration-with-volcano).


#### Setup Requirements

Before deploying Ray with KubeRay, ensure you have:

- A running Kubernetes cluster with Volcano installed
- KubeRay Operator v1.5.1 or newer with the Volcano batch scheduler enabled. The commands below use KubeRay v1.7.2. You do not need to install KubeRay before you start: [New installation](#new-installation) installs it, and [Existing installation](#existing-installation) enables Volcano on a Helm release that is already running.

Add the KubeRay Helm repository:

```bash
$ helm repo add kuberay https://ray-project.github.io/kuberay-helm/
$ helm repo update
```

##### New installation

If KubeRay is not installed yet, install the operator with Volcano integration:

```bash
$ helm install kuberay-operator kuberay/kuberay-operator --version 1.7.2 --set batchScheduler.name=volcano
```

##### Existing installation

If KubeRay is already installed with Helm, upgrade the release in place and keep its other values. The commands below use the release name `kuberay-operator` in the current namespace, as in the KubeRay installation guide. If your release uses another name or namespace, replace the name and add `--namespace <namespace>`. Do not also set the deprecated `batchScheduler.enabled` value.

```bash
$ helm upgrade kuberay-operator kuberay/kuberay-operator --version 1.7.2 \
    --reuse-values --set batchScheduler.name=volcano --wait
$ kubectl rollout status deployment/kuberay-operator --timeout=300s
```

With the chart's default values, the setting is passed to the operator as a command-line flag, so the upgrade restarts the operator by itself. If the release sets `configuration.enabled=true`, the setting goes into a ConfigMap instead, and you must restart the operator with `kubectl rollout restart deployment/kuberay-operator`. If the release runs a KubeRay version older than v1.7.2, follow the [KubeRay upgrade guide](https://docs.ray.io/en/latest/cluster/kubernetes/user-guides/upgrade-guide.html) first, because `helm upgrade` does not update the CRDs.

#### Example Deployments

##### RayCluster Example

Deploy a RayCluster with Volcano scheduling:

```bash
# Download the sample RayCluster configuration with Volcano labels
$ curl -LO https://raw.githubusercontent.com/ray-project/kuberay/v1.7.2/ray-operator/config/samples/ray-cluster.volcano-scheduler.yaml

# Apply the configuration
$ kubectl apply -f ray-cluster.volcano-scheduler.yaml

# Verify the RayCluster deployment
$ kubectl get pod -l ray.io/cluster=test-cluster-0

# Expected output:
# NAME                        READY   STATUS    RESTARTS   AGE
# test-cluster-0-head-9jzv4   1/1     Running   0          19s

# Check the PodGroup that KubeRay created
$ kubectl get podgroup ray-test-cluster-0-pg -o yaml

# Expected spec (head only, so minMember is 1):
# spec:
#   minMember: 1
#   minResources:
#     cpu: "1"
#     memory: 2Gi
#   queue: default
```

##### RayJob Example

RayJob support with Volcano is available since KubeRay v1.5.1:

```bash
# Download the sample RayJob configuration with Volcano queue integration
$ curl -LO https://raw.githubusercontent.com/ray-project/kuberay/v1.7.2/ray-operator/config/samples/ray-job.volcano-scheduler-queue.yaml

# Apply the configuration
$ kubectl apply -f ray-job.volcano-scheduler-queue.yaml

# Monitor the job execution
$ kubectl get pod

# Expected output:
# NAME                                             READY   STATUS      RESTARTS   AGE
# rayjob-sample-0-tmfpx-head-wc26n                 1/1     Running     0          43s
# rayjob-sample-0-tmfpx-small-group-worker-lkxq6   1/1     Running     0          43s
# rayjob-sample-0-tmfpx-small-group-worker-t96p7   1/1     Running     0          43s
# rayjob-sample-0-vvk7h                            0/1     Completed   0          21s
```

The submitter pod is `Completed` at the end of the job. Whether its resource requests stay in `minResources` after the job finishes depends on the KubeRay release and the submission mode; see [How KubeRay builds the PodGroup](#how-kuberay-builds-the-podgroup).

##### Topology-Aware Example

Topology-aware placement needs HyperNodes that describe your network and the `network-topology-aware` plugin in the Volcano scheduler. For the HyperNode model and how to create HyperNodes automatically, see [Network Topology Aware Scheduling](/docs/KeyFeatures/NetworkTopologyAware).

The example below uses two racks, each containing one worker node, joined by a tier 2 spine. Create the HyperNodes first. Replace `<node-1>` and `<node-2>` with the names of two worker nodes in your cluster (`kubectl get nodes`). Save it as `hypernodes.yaml`:

```yaml title="hypernodes.yaml"
apiVersion: topology.volcano.sh/v1alpha1
kind: HyperNode
metadata:
  name: rack-a
spec:
  tier: 1
  members:
  - type: Node
    selector:
      exactMatch:
        name: <node-1>
---
apiVersion: topology.volcano.sh/v1alpha1
kind: HyperNode
metadata:
  name: rack-b
spec:
  tier: 1
  members:
  - type: Node
    selector:
      exactMatch:
        name: <node-2>
---
apiVersion: topology.volcano.sh/v1alpha1
kind: HyperNode
metadata:
  name: spine
spec:
  tier: 2
  members:
  - type: HyperNode
    selector:
      exactMatch:
        name: rack-a
  - type: HyperNode
    selector:
      exactMatch:
        name: rack-b
```

Enable the `network-topology-aware` plugin in the Volcano scheduler. The default `volcano-scheduler-configmap` in the Volcano v1.16.0 installer does not enable it. Add `- name: network-topology-aware` to the plugins of the second tier in `volcano-scheduler-configmap` in the `volcano-system` namespace, then restart `volcano-scheduler`:

```bash
$ kubectl -n volcano-system rollout restart deploy volcano-scheduler
```

Then create a RayCluster whose workers must all be in one HyperNode of tier 1 or lower. Save it as `raycluster-topology.yaml`:

```yaml title="raycluster-topology.yaml"
apiVersion: ray.io/v1
kind: RayCluster
metadata:
  name: topology-demo
  labels:
    volcano.sh/network-topology-mode: hard
    volcano.sh/network-topology-highest-tier-allowed: "1"
spec:
  rayVersion: "2.52.0"
  headGroupSpec:
    rayStartParams: {}
    template:
      spec:
        containers:
        - name: ray-head
          image: rayproject/ray:2.52.0
          resources:
            limits:
              cpu: "1"
              memory: "2Gi"
            requests:
              cpu: "1"
              memory: "2Gi"
  workerGroupSpecs:
  - groupName: worker
    replicas: 2
    minReplicas: 2
    maxReplicas: 2
    rayStartParams: {}
    template:
      spec:
        containers:
        - name: ray-worker
          image: rayproject/ray:2.52.0
          resources:
            limits:
              cpu: "1"
              memory: "1Gi"
            requests:
              cpu: "1"
              memory: "1Gi"
```

```bash
$ kubectl apply -f hypernodes.yaml
$ kubectl apply -f raycluster-topology.yaml
$ kubectl get pods -o wide -l ray.io/cluster=topology-demo

# Example output, with node names replaced by placeholders.
# All three pods are on <node-2>, which is in rack-b:
# NAME                                READY   STATUS    RESTARTS   AGE   IP            NODE
# topology-demo-head-thj8b            1/1     Running   0          40s   10.244.2.24   <node-2>
# topology-demo-worker-worker-fxv4h   1/1     Running   0          40s   10.244.2.23   <node-2>
# topology-demo-worker-worker-smzc5   1/1     Running   0          40s   10.244.2.25   <node-2>

$ kubectl get podgroup ray-topology-demo-pg -o yaml
# spec:
#   minMember: 3
#   minResources:
#     cpu: "3"
#     memory: 4Gi
#   networkTopology:
#     highestTierAllowed: 1
#     mode: hard
#   queue: default
```

KubeRay copies the two labels into the PodGroup `spec.networkTopology`. If the gang does not fit inside one HyperNode of the allowed tier, its pods stay Pending. A higher `volcano.sh/network-topology-highest-tier-allowed`, such as `"2"` for the spine in this example, lets the gang span the HyperNodes below that tier.

KubeRay only updates `minMember` and `minResources` on an existing PodGroup. Changing the topology labels on a running RayCluster or RayJob does not change `spec.networkTopology`, so delete and recreate the resource to apply new topology settings.

### Method 2: Using Volcano Job with Ray Plugin

Volcano provides a native Ray plugin that simplifies deploying Ray clusters directly through Volcano Jobs. This approach offers a lightweight alternative to KubeRay, allowing you to manage Ray clusters using Volcano's job management capabilities.

#### How the Ray Plugin Works

The Ray plugin automatically:

- Configures the commands for head and worker nodes in a Ray cluster
- Opens the required ports for Ray services (GCS: 6379, Dashboard: 8265, Client Server: 10001)
- Creates a Kubernetes service mapped to the Ray head node for job submission and dashboard access

#### Setup Requirements

Before deploying Ray with Volcano Job, ensure:

- Volcano is installed with the Ray plugin enabled
- The `svc` plugin is also enabled (required for service creation)

#### Example Deployment

Create a Ray cluster with one head node and two worker nodes:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: ray-cluster-job
spec:
  minAvailable: 3
  schedulerName: volcano
  plugins:
    ray: []
    svc: []
  policies:
    - event: PodEvicted
      action: RestartJob
  queue: default
  tasks:
    - replicas: 1
      name: head
      template:
        spec:
          containers:
            - name: head
              image: rayproject/ray:latest-py311-cpu
              resources: {}
          restartPolicy: OnFailure
    - replicas: 2
      name: worker
      template:
        spec:
          containers:
            - name: worker
              image: rayproject/ray:latest-py311-cpu
              resources: {}
          restartPolicy: OnFailure
```

Apply the configuration:
```bash
kubectl apply -f ray-cluster-job.yaml
```

#### Accessing the Ray Cluster

Once deployed, you can access the Ray cluster through the automatically created service:

```bash
# Check pod status
kubectl get pod
# Expected output:
# NAME                       READY   STATUS    RESTARTS   AGE
# ray-cluster-job-head-0     1/1     Running   0          106s
# ray-cluster-job-worker-0   1/1     Running   0          106s
# ray-cluster-job-worker-1   1/1     Running   0          106s

# Check service
kubectl get service
# Expected output includes:
# ray-cluster-job-head-svc   ClusterIP   10.96.184.65   <none>   6379/TCP,8265/TCP,10001/TCP

# Port-forward to access Ray Dashboard
kubectl port-forward service/ray-cluster-job-head-svc 8265:8265

# Submit a job to the cluster
ray job submit --address http://localhost:8265 -- python -c "import ray; ray.init(); print(ray.cluster_resources())"
```

### Learn More

- For KubeRay integration details, visit the [KubeRay Volcano Scheduler Documentation](https://docs.ray.io/en/latest/cluster/kubernetes/k8s-ecosystem/volcano.html#kuberay-integration-with-volcano)
- For Volcano Job Ray plugin details, see the [Volcano Ray Plugin Guide](/docs/UserGuide/user_guide_how_to_use_ray_plugin)
