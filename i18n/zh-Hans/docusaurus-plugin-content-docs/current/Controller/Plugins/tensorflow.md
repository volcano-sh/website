---
title: TensorFlow
---

## Introduction

The **TensorFlow Plugin** is designed to simplify the deployment and configuration of distributed TensorFlow training jobs on Volcano. It automatically patches pod specifications to support the standard TensorFlow distributed training topology (Parameter Server and Worker pattern).

## How the TensorFlow Plugin Works

The TensorFlow Plugin performs the following tasks:

* **Configures TF_CONFIG environment variable**: Automatically generates and injects the `TF_CONFIG` environment variable into each pod, which TensorFlow uses to discover the cluster topology, including the list of PS (parameter server) and Worker hosts, the current task type, and task index.
* **Sets up distributed training topology**: Coordinates the PS/Worker architecture by leveraging Volcano's service discovery (via the `svc` plugin) to provide hostnames and ports for all tasks.

> **Note:**
> - The `svc` plugin is typically required alongside the `tensorflow` plugin to enable network communication between pods.
> - The `env` plugin is also commonly used to inject task index environment variables.

## Configuration

Enable the `tensorflow` plugin in your Volcano Job specification:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-dist-job
spec:
  minAvailable: 3
  schedulerName: volcano
  plugins:
    tensorflow: []
    svc: []
    env: []
  tasks:
    - replicas: 1
      name: ps
      template:
        spec:
          containers:
            - name: tensorflow
              image: tensorflow/tensorflow:latest
              ports:
                - containerPort: 2222
                  name: tfjob-port
              resources: {}
          restartPolicy: Never
    - replicas: 2
      name: worker
      policies:
        - event: TaskCompleted
          action: CompleteJob
      template:
        spec:
          containers:
            - name: tensorflow
              image: tensorflow/tensorflow:latest
              ports:
                - containerPort: 2222
                  name: tfjob-port
              resources: {}
          restartPolicy: Never
```

## Related

- For a full example of running TensorFlow on Volcano, see the [TensorFlow on Volcano](../../Ecosystem/TensorFlowOnVolcano) guide.
- The [SVC Plugin](./svc) provides the network service discovery that TensorFlow distributed training depends on.
- The [Env Plugin](./env) injects environment variables like `VK_TASK_INDEX` used by TensorFlow jobs.
