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



### Horovod简介

Horovod 是一个适用于 PyTorch、TensorFlow、Keras 和 Apache MXNet 的分布式深度学习训练框架。使用 Horovod，现有的训练脚本只需几行 Python 代码即可扩展至在数百个 GPU 上运行。能在大规模GPU集群上获得接近线性的性能提升。

### Horovod on volcano

Volcano 作为云原生批处理系统，提供了对 Horovod 分布式训练作业的原生支持。通过 Volcano 的调度能力，用户可以轻松地在 Kubernetes 集群上部署和管理 Horovod 训练任务。

以下是一个 Horovod 在 Volcano 上运行的示例配置：

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

在这个配置中，我们定义了一个 Horovod 分布式训练作业，包含以下关键内容：

1. 任务结构：由1个master节点和3个worker节点组成，总共4个Pod
2. 通信机制：利用Volcano的SSH插件实现节点间通信
3. 资源分配：master节点分配较少资源(500m CPU/1Gi内存)，worker节点分配更多资源(1000m CPU/2Gi内存)
4. 容错机制：当Pod被驱逐时，整个作业会重启
5. 作业完成策略：当master任务完成时，整个作业被标记为完成
