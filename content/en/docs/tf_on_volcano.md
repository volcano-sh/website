+++
title =  "Tensorflow on volcano"

date = 2021-04-07
lastmod = 2021-04-07

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "tensorflow"
[menu.docs]
  parent = "zoology"
  weight = 7

+++



### Tensorflow introduction

TensorFlow is a symbolic mathematical system based on data flow programming, which is widely used in programming and realization of various machine learning algorithms. Its predecessor is DistBelief, a neural network algorithm library of Google.

### Tensorflow on volcano

PS-worker model: Parameter Server performs model-related services, Work Server trains related services, inference calculation, gradient calculation, etc[1].

{{<figure library="1" src="ps-worker.png" title="ps-worker">}}

TensorFlow on Kubernates has many problems:

- Resource isolation.
- Lack of GPU scheduling, Gang Schuler.
- Process Legacy.
- Training log is not convenient to save.

Create `tftest.yaml`.

```
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-dist-mnist
spec:
  minAvailable: 3
  schedulerName: volcano
  plugins:
    env: []
    svc: []
  policies:
    - event: PodEvicted
      action: RestartJob
  tasks:
    - replicas: 1
      name: ps
      template:
        spec:
          containers:
            - command:
                - sh
                - "-c"
                - |
                  PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' |sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  WORKER_HOST=`cat /etc/volcano/worker.host | sed 's/$/&:2222/g' |sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  export TF_CONFIG={\"cluster\":{\"ps\":[${PS_SHOT}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"ps\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};

                  python /var/tf_dist_mnist/dist_mnist.py
              image: volcanosh/dist-mnist-tf-example:0.0.1
              name: tensorflow
              ports:
                - containerPort: 2222
                  name: tfjob-port
              resources:
                requests:
                  cpu: "200m"
          restartPolicy: Never
    - replicas: 2
      name: worker
      policies:
        - event: TaskCompleted
          action: CompleteJob
      template:
        spec:

          containers:
            - command:
                - sh
                - "-c"
                - |
                  PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' |sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  WORKER_HOST=`cat /etc/volcano/worker.host | sed 's/$/&:2222/g' |sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  export TF_CONFIG={\"cluster\":{\"ps\":[${PS_SHOT}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"ps\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};
                  python /var/tf_dist_mnist/dist_mnist.py
              image: volcanosh/dist-mnist-tf-example:0.0.1
              name: tensorflow
              ports:
                - containerPort: 2222
                  name: tfjob-port
              resources:
                requests:
                  cpu: "200m"
              
          restartPolicy: Never
```

Deploy `tftest.yaml`.

```
kubectl apply -f tftest.yaml
```

View job health.

```
kubectl get pod
```



参考资料:

[1][Practice of Volcano Operation Management Capability in AI Scenario](https://live.vhall.com/631084047?invite=)

[2][TensorFlow Huawei Cloud CCE Deployment Operation Report](https://support.huaweicloud.com/bestpractice-cce/cce_bestpractice_0119.html)

