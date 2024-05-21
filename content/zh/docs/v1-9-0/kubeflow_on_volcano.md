+++
title =  "Kubeflow on Volcano"

date = 2024-05-21
lastmod = 2024-05-21

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Kubeflow"
[menu.v1-9-0]
  parent = "zoology"
  weight = 3

+++





### Kubeflow简介

Kubernetes已经成为云原生应用编排、管理的事实标准， 越来越多的应用选择向Kubernetes迁移。人工智能和机器学习领域天然的包含大量的计算密集型任务，开发者非常愿意基于Kubernetes构建AI平台，充分利用Kubernetes提供的资源管理、应用编排、运维监控能力。然而基于Kubernetes构建一个端到端的AI计算平台是非常复杂和繁琐的过程，它需要处理很多个环节。除了我们熟知的模型训练环节之外还包括数据收集、预处理、资源管理、特性提取、数据验证、模型的管理、模型发布、监控等环节。对于一个AI算法工程师来讲，他要做模型训练，就不得不搭建一套AI计算平台，这个过程耗时费力，而且需要很多的知识积累[1]。

{{<figure library="1" src="kubeflow1.png" title="模型训练工作流">}}

Kubeflow诞生于2017年，Kubeflow项目是基于容器和Kubernetes构建，旨在为数据科学家、机器学习工程师、系统运维人员提供面向机器学习业务的敏捷部署、开发、训练、发布和管理平台。它利用了云原生技术的优势，让用户更快速、方便的部署、使用和管理当前最流行的机器学习软件。

什么场景我们可以使用kubeflow：

- 希望训练tensorflow模型且可以使用模型接口发布应用服务在k8s环境中(eg.local,prem,cloud)
- 希望使用Jupyter notebooks来调试代码，多用户的notebook server
- 在训练的Job中，需要对的CPU或者GPU资源进行调度编排
- 希望Tensorflow和其他组件进行组合来发布服务



### Kubeflow on volcano

Volcano是一款构建于Kubernetes之上的增强型高性能计算任务批量处理系统。作为一个面向高性能计算场景的平台，它弥补了kubernetes在机器学习、深度学习、HPC、大数据计算等场景下的基本能力缺失，其中包括gang-schedule的调度能力、计算任务队列管理、task-topology和GPU亲和性调度。另外，Volcano在原生kubernetes能力基础上对计算任务的批量创建及生命周期管理、fair-share、binpack调度等方面做了增强。Volcano充分解决了上文提到的Kubeflow分布式训练面临的问题。

#### 下载kfctl

首先需要下载kfctl，可以根据系统来选择合适的压缩包文件[1]。

```
$ tar -xvf kfctl_v1.0.2-0-ga476281_linux.tar.gz
$ sudo mv ./kfctl /usr/local/bin/kfctl
```



#### 配置环境变量

```
$ export PATH= $PATH:"<path-to-kfctl>"
$ export KF_NAME=<your choice of name for the Kubeflow deployment>
$ export BASE_DIR=<path to a base directory>
$ export KF_DIR=${BASE_DIR}/${KF_NAME}
$ export CONFIG_URI="https://raw.githubusercontent.com/kubeflow/manifests/v1.0-branch/kfdef/kfctl_k8s_istio.v1.0.2.yaml"
```



#### 安装kubeflow

```
$ mkdir -p ${KF_DIR}
$ cd ${KF_DIR}
$ Kfctl apply -V -f ${CONFIG_URI}
```

通过如下指令确认安装结果

```
$ kubectl -n kubeflow get all 
```



#### 部署Mnist示例

首先下载kubuflow官方提供的测试集。

```
git clone https://github.com/kubeflow/examples.git
```



```
pip3 install jupyter notebook
jupyter notebook --allow-root ##启动jupyter
```



#### 启动使用notebook

提供对外接口服务，这里需要将集群下的节点绑定公网IP。如果没有安装notebook请先使用pip3安装。

```
$ pip3 install jupyter notebook
$ jupyter notebook --allow-root
[W 09:08:03.572 NotebookApp] WARNING: The notebook server is listening on all IP addresses and not using encryption. This is not recommended.
[I 09:08:03.575 NotebookApp] Serving notebooks from local directory: /root/examples
[I 09:08:03.575 NotebookApp] Jupyter Notebook 6.3.0 is running at:
[I 09:08:03.575 NotebookApp] http://mytest-87034:30200/
[I 09:08:03.575 NotebookApp] Use Control-C to stop this server and shut down all kernels (twice to skip confirmation).
```

访问公网IP:30200，输入配置密码即可进入notebook。



#### 在notebook上运行官方实例[2]

1.打开notebook进行TFJob的部署。Open the notebook `mnist/mnist_vanilla_k8s.ipynb` ，根据指引来进行分布式Tf Job的部署。

2.添加调度器字段：在`mnist/mnist_vanilla_k8s.ipynb` 的Tarining job parameters代码块下的TFJob的配置如下所示，添加`schedulerName: volcano`字段，确保使用volcano进行调度。

```
train_spec = f"""apiVersion: kubeflow.org/v1
kind: TFJob
metadata:
  name: {train_name}  
spec:
  schedulerName: volcano
  tfReplicaSpecs:
    Ps:
      replicas: {num_ps}
      template:
        metadata:
          annotations:
            sidecar.istio.io/inject: "false"
        spec:
          serviceAccount: default-editor
          containers:
          - name: tensorflow
            command:
            - python
            - /opt/model.py
            - --tf-model-dir={model_dir}
            - --tf-export-dir={export_path}
            - --tf-train-steps={train_steps}
            - --tf-batch-size={batch_size}
            - --tf-learning-rate={learning_rate}
            env:
            - name: S3_ENDPOINT
              value: {s3_endpoint}
            - name: AWS_ENDPOINT_URL
              value: {minio_endpoint}
            - name: AWS_REGION
              value: {minio_region}
            - name: BUCKET_NAME
              value: {mnist_bucket}
            - name: S3_USE_HTTPS
              value: "0"
            - name: S3_VERIFY_SSL
              value: "0"
            - name: AWS_ACCESS_KEY_ID
              value: {minio_username}
            - name: AWS_SECRET_ACCESS_KEY
              value: {minio_key}
            image: {image}
            workingDir: /opt
          restartPolicy: OnFailure
    Chief:
      replicas: 1
      template:
        metadata:
          annotations:
            sidecar.istio.io/inject: "false"
        spec:
          serviceAccount: default-editor
          containers:
          - name: tensorflow
            command:
            - python
            - /opt/model.py
            - --tf-model-dir={model_dir}
            - --tf-export-dir={export_path}
            - --tf-train-steps={train_steps}
            - --tf-batch-size={batch_size}
            - --tf-learning-rate={learning_rate}
            env:
            - name: S3_ENDPOINT
              value: {s3_endpoint}
            - name: AWS_ENDPOINT_URL
              value: {minio_endpoint}
            - name: AWS_REGION
              value: {minio_region}
            - name: BUCKET_NAME
              value: {mnist_bucket}
            - name: S3_USE_HTTPS
              value: "0"
            - name: S3_VERIFY_SSL
              value: "0"
            - name: AWS_ACCESS_KEY_ID
              value: {minio_username}
            - name: AWS_SECRET_ACCESS_KEY
              value: {minio_key}
            image: {image}
            workingDir: /opt
          restartPolicy: OnFailure
    Worker:
      replicas: 1
      template:
        metadata:
          annotations:
            sidecar.istio.io/inject: "false"
        spec:
          serviceAccount: default-editor
          containers:
          - name: tensorflow
            command:
            - python
            - /opt/model.py
            - --tf-model-dir={model_dir}
            - --tf-export-dir={export_path}
            - --tf-train-steps={train_steps}
            - --tf-batch-size={batch_size}
            - --tf-learning-rate={learning_rate}
            env:
            - name: S3_ENDPOINT
              value: {s3_endpoint}
            - name: AWS_ENDPOINT_URL
              value: {minio_endpoint}
            - name: AWS_REGION
              value: {minio_region}
            - name: BUCKET_NAME
              value: {mnist_bucket}
            - name: S3_USE_HTTPS
              value: "0"
            - name: S3_VERIFY_SSL
              value: "0"
            - name: AWS_ACCESS_KEY_ID
              value: {minio_username}
            - name: AWS_SECRET_ACCESS_KEY
              value: {minio_key}
            image: {image}
            workingDir: /opt
          restartPolicy: OnFailure
"""
```

3.提交作业

```
kubectl apply -f mnist.yaml
```