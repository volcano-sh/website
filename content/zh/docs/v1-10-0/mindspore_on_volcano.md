+++
title =  "MindSpore on volcano"

date = 2024-09-29
lastmod = 2024-09-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "MindSpore"
[menu.v1-10-0]
  parent = "zoology"
  weight = 4

+++



### Mindspore简介

MindSpore是华为公司推出的新一代深度学习框架，是源于全产业的最佳实践，最佳匹配昇腾处理器算力，支持终端、边缘、云全场景灵活部署，开创全新的AI编程范式，降低AI开发门槛。

### MindSpore on volcano

在集群中新建mindspore-cpu.yaml如下

```
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: mindspore-cpu
spec:
  minAvailable: 1
  schedulerName: volcano
  policies:
    - event: PodEvicted
      action: RestartJob
  plugins:
    ssh: []
    env: []
    svc: []
  maxRetry: 5
  queue: default
  tasks:
    - replicas: 8
      name: "pod"
      template:
        spec:
          containers:
            - command: ["/bin/bash", "-c", "python /tmp/lenet.py"]
              image: lyd911/mindspore-cpu-example:0.2.0
              imagePullPolicy: IfNotPresent
              name: mindspore-cpu-job
              resources:
                limits:
                  cpu: "1"
                requests:
                  cpu: "1"
          restartPolicy: OnFailure
```

进行部署。

```
kubectl apply -f mindspore-cpu.yaml
```

查询集群下作业运行情况。

```
kubectl get pods
```



