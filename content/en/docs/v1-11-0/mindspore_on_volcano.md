+++
title =  "MindSpore on Volcano"

date = 2021-06-29
lastmod = 2021-06-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "MindSpore"
[menu.v1-11-0]
  parent = "ecosystem"
  weight = 4

+++



### MindSpore introduction

MindSpore is a new generation of deep learning framework launched by Huawei. It is derived from the best practices of the whole industry, which best matches the computing power of the rise processor, supports the flexible deployment of the whole scene of terminal, edge and cloud, and creates a brand new AI programming paradigm and lowers the threshold of AI development.

### MindSpore on Volcano

Create a new `mindSpore-cpu.yaml` in the cluster as follows.

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

Deploy.

```
kubectl apply -f mindspore-cpu.yaml
```

Query the status of the jobs in the cluster.

```
kubectl get pods
```



