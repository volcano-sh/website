+++
title =  "PaddlePaddle on Volcano"

date = 2021-06-29
lastmod = 2021-06-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "PaddlePaddle"
[menu.v1-12-0]
  parent = "zoology"
  weight = 6

+++



### paddlepaddle简介

飞桨(PaddlePaddle)是百度于 2016 年 9 月开源的深度学习框架，旨在提供一款安全高效、灵活易用、可扩展的深度学习平台。

2018 年 10 月，飞桨团队发布 Paddle Fluid 1.0 版本，对神经网络描述、大规模分布式训练、高性能推理引擎等核心能力进行了全面升级。以工业界应用必需的分布式训练能力为例，在最新的 Paddle Fluid 1.5.2 版本中，飞桨支持数据并行、模型并行、流水线并行等多种并行模式，参数服务器架构和点对点同步训练架构全面支持在 CPU、GPU 等硬件资源设备上的大规模训练[1]。

### paddlepaddle on valcano

在集群节点上传ctr-volcano.yaml，内容如下

```
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: ctr-volcano
spec:
  minAvailable: 4
  schedulerName: volcano
  policies:
  - event: PodEvicted
    action: RestartJob
  - event: PodFailed
    action: RestartJob
  tasks:
  - replicas: 2
    name: pserver
    template:
      metadata:
        labels:
          paddle-job-pserver: fluid-ctr
      spec:
        imagePullSecrets:
        - name: default-secret
        volumes:
        - hostPath:
            path: /home/work/
            type: ""
          name: seqdata
        containers:
        - image: volcanosh/edlctr:v1
          command:
          - paddle_k8s
          - start_fluid
          imagePullPolicy: IfNotPresent
          name: pserver
          volumeMounts:
          - mountPath: /mnt/seqdata
            name: seqdata
          resources:
            limits:
              cpu: 10
              memory: 30Gi
              ephemeral-storage: 10Gi
            requests:
              cpu: 1
              memory: 100M
              ephemeral-storage: 1Gi
          env:
          - name: GLOG_v
            value: "0"
          - name: GLOG_logtostderr
            value: "1"
          - name: TOPOLOGY
            value: ""
          - name: TRAINER_PACKAGE
            value: /workspace
          - name: NAMESPACE
            valueFrom:
              fieldRef:
                apiVersion: v1
                fieldPath: metadata.namespace
          - name: POD_IP
            valueFrom:
              fieldRef:
                apiVersion: v1
                fieldPath: status.podIP
          - name: POD_NAME
            valueFrom:
              fieldRef:
                apiVersion: v1
                fieldPath: metadata.name
          - name: PADDLE_CURRENT_IP
            valueFrom:
              fieldRef:
                apiVersion: v1
                fieldPath: status.podIP
          - name: PADDLE_JOB_NAME
            value: fluid-ctr
          - name: PADDLE_IS_LOCAL
            value: "0"
          - name: PADDLE_TRAINERS_NUM
            value: "2"
          - name: PADDLE_PSERVERS_NUM
            value: "2"
          - name: FLAGS_rpc_deadline
            value: "36000000"
          - name: ENTRY
            value: cd /workspace/ctr && python train.py --is_local 0 --cloud_train 1
          - name: PADDLE_PORT
            value: "30236"
          - name: LD_LIBRARY_PATH
            value: /usr/local/lib:/usr/local/nvidia/lib64:/usr/local/rdma/lib64:/usr/lib64/mlnx_ofed/valgrind
          - name: PADDLE_TRAINING_ROLE
            value: PSERVER
          - name: TRAINING_ROLE
            value: PSERVER
        restartPolicy: OnFailure
  - replicas: 2
    policies:
    - event: TaskCompleted
      action: CompleteJob
    name: trainer
    template:
      metadata:
        labels:
          paddle-job: fluid-ctr
      spec:
        imagePullSecrets:
        - name: default-secret
        volumes:
        - hostPath:
            path: /home/work/
            type: ""
          name: seqdata
        containers:
        - image: volcanosh/edlctr:v1
          command:
          - paddle_k8s
          - start_fluid
          imagePullPolicy: IfNotPresent
          name: trainer
          volumeMounts:
          - mountPath: /mnt/seqdata
            name: seqdata
          resources:
            limits:
              cpu: 10
              memory: 30Gi
              ephemeral-storage: 10Gi
            requests:
              cpu: 1
              memory: 100M
              ephemeral-storage: 10Gi
          env:
          - name: GLOG_v
            value: "0"
          - name: GLOG_logtostderr
            value: "1"
          - name: TOPOLOGY
          - name: TRAINER_PACKAGE
            value: /workspace
          - name: CPU_NUM
            value: "2"
          - name: NAMESPACE
            valueFrom:
              fieldRef:
                apiVersion: v1
                fieldPath: metadata.namespace
          - name: POD_IP
            valueFrom:
              fieldRef:
                apiVersion: v1
                fieldPath: status.podIP
          - name: POD_NAME
            valueFrom:
              fieldRef:
                apiVersion: v1
                fieldPath: metadata.name
          - name: PADDLE_CURRENT_IP
            valueFrom:
              fieldRef:
                apiVersion: v1
                fieldPath: status.podIP
          - name: PADDLE_JOB_NAME
            value: fluid-ctr
          - name: PADDLE_IS_LOCAL
            value: "0"
          - name: FLAGS_rpc_deadline
            value: "36000000"
          - name: PADDLE_PORT
            value: "30236"
          - name: PADDLE_PSERVERS_NUM
            value: "2"
          - name: PADDLE_TRAINERS_NUM
            value: "2"
          - name: PADDLE_TRAINING_ROLE
            value: TRAINER
          - name: TRAINING_ROLE
            value: TRAINER
          - name: LD_LIBRARY_PATH
            value: /usr/local/lib:/usr/local/nvidia/lib64:/usr/local/rdma/lib64:/usr/lib64/mlnx_ofed/valgrind
          - name: ENTRY
            value: cd /workspace/ctr && python train.py --is_local 0 --cloud_train 1
        restartPolicy: OnFailure

```

在集群终端下部署。

```
kubectl apply -f ctr-volcano.yaml
```

查看作业运行情况。如果podgroup无法满足调度条件，请检查集群下的资源是充足。

```
kubectl get podgroup
kubectl describe podgroup ctr-volcano
kubectl get pods | grep ctr-volcano
```

可以选择一个PServer任务查看日志。

```
kubectl logs ctr-volcano-pserver-0
```

选择一个Tariner任务查看日志。

```
kubectl logs ctr-volcano-trainer-0
```

通过上述的训练过程，模型被保存在/workspace/ctr/models中，获取模型的方式有如下两种方式：

1. 在 yaml 文件当中 trainer 部分的 spec 当中定义 volume，通过 docker 的 volume 映射容器路径和宿主机路径的机制，将/workspace/ctr/models 文件夹映射到宿主机的文件夹中。接下来通过 kubectl describe pod ctr-volcano-trainer-0，可以得知我们的模型所在的节点，接下来 ssh 登陆到对应的节点上，到宿主机被映射到路径下，就可以获取到训练出来到模型了。
2. 如果需要更加灵活的，自动化的模型配送流程，可以在 K8S 集群上建立 File Server 和分布式文件系统，例如 GlusterFS。将 ctr-volcano-trainer-0 容器内部的/workspace/ctr/models 文件夹映射到 GlusterFS 的 PVC（Persistent Volume Claim）上。通过 ftp 的 wget/curl 操作命令就可以实现模型的获取和配送。
