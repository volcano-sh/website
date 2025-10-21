# Ray on Volcano

date = 2025-07-20
lastmod = 2025-07-20

draft = false
toc = true
type = "docs"

linktitle = "Ray"
[menu.docs]
parent = "zoology"
weight = 6

+++

### Ray Introduction

Today, machine learning workloads are becoming increasingly compute-intensive. Single-node development environments (such as laptops) are convenient but cannot scale to meet these demands.

Ray is a unified approach to scaling Python and AI applications from laptops to clusters.

With Ray, you can seamlessly scale the same code from your laptop to a cluster. Ray is designed to be general-purpose, meaning it can efficiently run any type of workload. If your application is written in Python, you can scale it with Ray without additional infrastructure.

KubeRay is a powerful open-source Kubernetes operator that simplifies the deployment and management of Ray applications on Kubernetes.

### Ray on Volcano

KubeRay's Volcano integration enables more efficient scheduling of Ray Pods in multi-tenant Kubernetes environments.

#### Installing KubeRay Operator

To deploy the KubeRay Operator with Volcano batch scheduling support, you can use one of the following two methods:

##### Method 1: Using a values.yaml Configuration File

Set Volcano as the batch scheduler in your values.yaml file:

```yaml
yaml# values.yaml file
batchScheduler:
  name: volcano
```

Then install the Helm chart using this configuration file:

```bash
bashhelm install kuberay-operator kuberay/kuberay-operator --version 1.4.2 -f values.yaml
```

##### Method 2: Using Command Line Parameters

Specify the batch scheduler directly in the Helm installation command using the --set parameter:

```bash
bashhelm install kuberay-operator kuberay/kuberay-operator --version 1.4.2 --set batchScheduler.name=volcano
```

#### Installing RayCluster with Volcano Scheduling

To manage a RayCluster using the Volcano scheduler, follow these steps:

##### Basic Installation

1. Download the RayCluster example configuration that supports Volcano scheduling:

   ```bash
   bashcurl -LO https://raw.githubusercontent.com/ray-project/kuberay/v1.4.2/ray-operator/config/samples/ray-cluster.volcano-scheduler.yaml
   ```

2. Apply the configuration to create the RayCluster:

   ```bash
   bashkubectl apply -f ray-cluster.volcano-scheduler.yaml
   ```

3. Verify the cluster status:

   ```bash
   bashkubectl get pod -l ray.io/cluster=test-cluster-0
   ```

   After successful deployment, you should see output similar to:

   ```
   NAME                       READY   STATUS    RESTARTS   AGE
   test-cluster-0-head-jj9bg  1/1     Running   0          36s
   ```

Now you can use Volcano and KubeRay working together. For more detailed information, please check the [link](https://docs.ray.io/en/master/cluster/kubernetes/k8s-ecosystem/volcano.html).