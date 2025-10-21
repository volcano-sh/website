+++
title =  "Horovod on Volcano"

date = 2025-07-20
lastmod = 2025-07-20

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Horovod"
[menu.docs]
  parent = "zoology"
  weight = 3

+++



# Horovod Introduction

Horovod is a distributed deep learning training framework compatible with PyTorch, TensorFlow, Keras, and Apache MXNet. With Horovod, existing training scripts can be scaled to run on hundreds of GPUs with just a few lines of Python code. It achieves near-linear performance improvements on large-scale GPU clusters.

## Horovod on Volcano

Volcano as a cloud-native batch system, provides native support for Horovod distributed training jobs. Through Volcano's scheduling capabilities, users can easily deploy and manage Horovod training tasks on Kubernetes clusters.

Below is an example configuration for running Horovod on Volcano:

```yaml
yamlapiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: lm-horovod-job
  labels:
    "volcano.sh/job-type": Horovod
spec:
  minAvailable: 4
  schedulerName: volcano
  plugins:
    ssh: []
    svc: []
  policies:
    - event: PodEvicted
      action: RestartJob
  tasks:
    - replicas: 1
      name: master
      policies:
        - event: TaskCompleted
          action: CompleteJob
      template:
        spec:
          containers:
            - command:
                - /bin/sh
                - -c
                - |
                  WORKER_HOST=`cat /etc/volcano/worker.host | tr "\n" ","`;
                  mkdir -p /var/run/sshd; /usr/sbin/sshd;
                  mpiexec --allow-run-as-root --host ${WORKER_HOST} -np 3 python tensorflow_mnist_lm.py;
              image: volcanosh/horovod-tf-mnist:0.5
              name: master
              ports:
                - containerPort: 22
                  name: job-port
              resources:
                requests:
                  cpu: "500m"
                  memory: "1024Mi"
                limits:
                  cpu: "500m"
                  memory: "1024Mi"
          restartPolicy: OnFailure
          imagePullSecrets:
            - name: default-secret
    - replicas: 3
      name: worker
      template:
        spec:
          containers:
            - command:
                - /bin/sh
                - -c
                - |
                  mkdir -p /var/run/sshd; /usr/sbin/sshd -D;
              image: volcanosh/horovod-tf-mnist:0.5
              name: worker
              ports:
                - containerPort: 22
                  name: job-port
              resources:
                requests:
                  cpu: "1000m"
                  memory: "2048Mi"
                limits:
                  cpu: "1000m"
                  memory: "2048Mi"
          restartPolicy: OnFailure
          imagePullSecrets:
            - name: default-secret
```

In this configuration, we define a Horovod distributed training job with the following key components:

1. Task structure: Consists of 1 master node and 3 worker nodes, totaling 4 Pods
2. Communication mechanism: Utilizes Volcano's SSH plugin for inter-node communication
3. Resource allocation: Master node is allocated fewer resources (500m CPU/1Gi memory), while worker nodes receive more resources (1000m CPU/2Gi memory)
4. Fault tolerance: When a Pod is evicted, the entire job restarts
5. Job completion policy: When the master task completes, the entire job is marked as complete
