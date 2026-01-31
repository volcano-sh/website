---
title: "Ray on Volcano"
date: 2025-12-22
draft: false  # Is this a draft? true/false
toc: true  # Show table of contents? true/false
parent: "ecosystem"
sidebar_position: 9
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

1. **KubeRay Operator Approach**: Use the KubeRay operator with Volcano scheduler integration for automated deployment and management of `RayCluster`, `RayJob` and `RayService` resources
2. **Volcano Job (vcjob) Approach**: Deploy Ray clusters directly using Volcano Job with the Ray plugin

Both approaches leverage Volcano's powerful scheduling capabilities including gang scheduling and network topology-aware scheduling for optimal resource allocation.

### Method 1: Using KubeRay Operator

[KubeRay](https://docs.ray.io/en/latest/cluster/kubernetes/index.html) is an open-source Kubernetes operator that simplifies running Ray on Kubernetes. It provides automated deployment, scaling, and management of Ray clusters through Kubernetes-native tools and APIs.

#### KubeRay Integration with Volcano

Starting with KubeRay v1.5.1, all KubeRay resources (RayJob, RayCluster, and RayService) support Volcano's advanced scheduling features, including gang scheduling and network topology-aware scheduling. This integration optimizes resource allocation and enhances performance for distributed AI/ML workloads.

#### Supported Labels

To configure RayJob and RayCluster resources with Volcano scheduling, you can use the following labels in the metadata section:

| Label | Description | Required |
|-------|-------------|----------|
| `ray.io/priority-class-name` | Assigns a [Kubernetes](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/#priorityclass) priority class for pod scheduling | No |
| `volcano.sh/queue-name` | Specifies the Volcano queue for resource submission | No |
| `volcano.sh/network-topology-mode` | Configures network topology-aware scheduling mode | No |
| `volcano.sh/network-topology-highest-tier-allowed` | Sets the highest network tier allowed for scheduling | No |

#### Autoscaling Behavior

KubeRay's integration with Volcano handles gang scheduling differently based on whether autoscaling is enabled:

- **When autoscaling is enabled**: `minReplicas` is used for gang scheduling
- **When autoscaling is disabled**: The desired replica count is used for gang scheduling

This ensures that the gang scheduling constraints are properly maintained while allowing for flexible scaling behaviors based on your workload requirements.

Below are setup examples with detailed explanations. For comprehensive configuration options, please refer to the [KubeRay Volcano Scheduler Documentation](https://docs.ray.io/en/latest/cluster/kubernetes/k8s-ecosystem/volcano.html#kuberay-integration-with-volcano).


#### Setup Requirements

Before deploying Ray with KubeRay, ensure you have:

- A running Kubernetes cluster with Volcano installed
- KubeRay Operator installed with Volcano batch scheduler support:

```bash
# Install KubeRay Operator with Volcano integration
$ helm install kuberay-operator kuberay/kuberay-operator --version 1.5.1 --set batchScheduler.name=volcano
```

#### Example Deployments

##### RayCluster Example

Deploy a RayCluster with Volcano scheduling:

```bash
# Download the sample RayCluster configuration with Volcano labels
$ curl -LO https://raw.githubusercontent.com/ray-project/kuberay/v1.5.1/ray-operator/config/samples/ray-cluster.volcano-scheduler.yaml

# Apply the configuration
$ kubectl apply -f ray-cluster.volcano-scheduler.yaml

# Verify the RayCluster deployment
$ kubectl get pod -l ray.io/cluster=test-cluster-0

# Expected output:
# NAME                                 READY   STATUS    RESTARTS   AGE
# test-cluster-0-head-jj9bg            1/1     Running   0          36s
```

##### RayJob Example

RayJob support with Volcano is available since KubeRay v1.5.1:

```bash
# Download the sample RayJob configuration with Volcano queue integration
$ curl -LO https://raw.githubusercontent.com/ray-project/kuberay/v1.5.1/ray-operator/config/samples/ray-job.volcano-scheduler-queue.yaml

# Apply the configuration
$ kubectl apply -f ray-job.volcano-scheduler-queue.yaml

# Monitor the job execution
$ kubectl get pod

# Expected output:
# NAME                                             READY   STATUS      RESTARTS   AGE
# rayjob-sample-0-k449j-head-rlgxj                 1/1     Running     0          93s
# rayjob-sample-0-k449j-small-group-worker-c6dt8   1/1     Running     0          93s
# rayjob-sample-0-k449j-small-group-worker-cq6xn   1/1     Running     0          93s
# rayjob-sample-0-qmm8s                            0/1     Completed   0          32s
```

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
- For Volcano Job Ray plugin details, see the [Volcano Ray Plugin Guide](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_ray_plugin.md)