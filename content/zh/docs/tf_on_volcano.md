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
  weight = 8

+++



### Tensorflow简介

TensorFlow是一个基于数据流编程的符号数学系统，被广泛应用于各类机器学习算法的编程实现，其前身是谷歌的神经网络算法库DistBelief。

### Tensorflow on volcano

PS-worker模型：Parameter Server执行模型相关业务，Work Server训练相关业务，推理计算、梯度计算等[1]。

{{<figure library="1" src="ps-worker.png" title="ps-worker">}}

Tensorflow on kubernates存在诸多的问题

- 资源隔离
- 缺乏GPU调度、Gang schduler。
- 进程遗留问题
- 训练日志保存不方便

创建tftest.yaml

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

部署tftest.yaml

```
kubectl apply -f tftest.yaml
```

查看作业运行情况

```
kubectl get pod
```



参考资料:

[1][AI场景下volcano作业管理能力实践](https://live.vhall.com/631084047?invite=)
