+++
title = "Running Distributed TensorFlow Training"
linktitle = "Distributed TensorFlow"
date = 2026-02-11
publishdate = 2026-02-11
lastmod = 2026-02-11
draft = false
toc = true
type = "docs"

[menu.docs]
  parent = "tutorial-series"
  weight = 10
+++

This tutorial demonstrates how to run a distributed TensorFlow training job on Volcano using the Parameter Server (PS) and Worker model.

## Background

Distributed training is essential for large scale deep learning models that cannot fit or run efficiently on a single node. However, running distributed workloads like TensorFlow on standard Kubernetes presents several challenges:

- **Gang Scheduling**: Distributed training requires all components (Parameter Servers and Workers) to start together. If only a subset is scheduled, the job may hang indefinitely, wasting cluster resources.
- **Service Discovery**: Parameter Servers and Workers need a way to find each other to synchronize gradients and parameters.
- **Lifecycle Management**: The job should be able to recover from worker failures or preemptions without manual intervention.

Volcano addresses these issues by providing native gang scheduling, service discovery via its `svc` plugin, and flexible lifecycle policies.

## Scenario

A common distributed training pattern is the **Parameter Server (PS) and Worker model**. The PS performs model-related services (storing and updating parameters), while Workers train the model, calculate gradients, and send updates to the PS.

In this tutorial, you will deploy a distributed MNIST training job using 1 Parameter Server and 2 Workers. Volcano ensures that all 3 pods are scheduled as a single unit or not at all.

## Prerequisites

Before you begin, ensure you have:
- A Kubernetes cluster with Volcano installed.
- `kubectl` configured to access your cluster.

## Deployment Step-by-Step

### 1. Create the Job Manifest

Create a file named `tensorflow-dist.yaml` with the following content:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tf-dist-mnist
spec:
  minAvailable: 3 # Total pods required: 1 PS + 2 Workers
  schedulerName: volcano
  plugins:
    env: []
    svc: [] # Enables service discovery between PS and Workers
  policies:
    - event: PodEvicted
      action: RestartJob # Ensures job resilience
  queue: default
  tasks:
    - replicas: 1
      name: ps
      template:
        spec:
          containers:
            - command:
                - sh
                - -c
                - |
                  PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' | tr "\n" "," | sed 's/,$//'`;
                  WORKER_HOST=`cat /etc/volcano/worker.host | sed 's/$/&:2222/g' | tr "\n" "," | sed 's/,$//'`;
                  export TF_CONFIG="{\"cluster\":{\"ps\":[${PS_HOST}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"ps\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"}";
                  python /var/tf_dist_mnist/dist_mnist.py
              image: volcanosh/dist-mnist-tf-example:0.0.1
              name: tensorflow
              ports:
                - containerPort: 2222
                  name: tfjob-port
          restartPolicy: Never
    - replicas: 2
      name: worker
      policies:
        - event: TaskCompleted
          action: CompleteJob # Marked as completed once workers finish
      template:
        spec:
          containers:
            - command:
                - sh
                - -c
                - |
                  PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' | tr "\n" "," | sed 's/,$//'`;
                  WORKER_HOST=`cat /etc/volcano/worker.host | sed 's/$/&:2222/g' | tr "\n" "," | sed 's/,$//'`;
                  export TF_CONFIG="{\"cluster\":{\"ps\":[${PS_HOST}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"worker\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"}";
                  python /var/tf_dist_mnist/dist_mnist.py
              image: volcanosh/dist-mnist-tf-example:0.0.1
              name: tensorflow
              ports:
                - containerPort: 2222
                  name: tfjob-port
          restartPolicy: Never
```

### 2. Apply the Manifest

Run the following command to deploy the job:

```bash
kubectl apply -f tensorflow-dist.yaml
```

## Verification

### Check Job and Pod Status

You can monitor the status of your Volcano Job and its associated pods:

```bash
kubectl get pods -l volcano.sh/job-name=tf-dist-mnist
```

Expected output showing all 3 pods running:
```text
NAME                     READY   STATUS    RESTARTS   AGE
tf-dist-mnist-ps-0       1/1     Running   0          30s
tf-dist-mnist-worker-0   1/1     Running   0          30s
tf-dist-mnist-worker-1   1/1     Running   0          30s
```

### View Training Logs

Check the logs of a worker to see the training progress:

```bash
kubectl logs tf-dist-mnist-worker-0
```

## Notes

- **Gang Scheduling**: If pods remain in `Pending` state, it usually means the cluster lacks enough resources to start the **entire** gang (3 pods).
- **Service Discovery**: The `svc` plugin is critical. It generates hostnames in `/etc/volcano/` which the PS and Workers use to communicate.
- **Failover**: If a pod is evicted, the defined policy `RestartJob` will ensure the training resumes properly.

## Tutorial Series

- **[Apache Spark](/en/docs/tutorial-spark/)**: Prevent resource starvation in big data processing pipelines.
- **[GPU Resource Management](/en/docs/tutorial-gpu-scheduling/)**: Maximize hardware efficiency through fractional sharing (vGPU) and isolation.
- **[Multi-tenancy](/en/docs/tutorial-multi-tenancy/)**: Configure fair share scheduling and hierarchical queues for different teams.
- **[Argo Workflows](/en/docs/tutorial-argo-workflows/)**: Integrate Volcano's advanced scheduling into your CI/CD and data pipelines.

Back to basics? Check out our **[Quick Start](/en/docs/tutorials/)** 