#### 简介
volcano提供了兼容kubernetes风格的命令行，可以通过命令行对volcano的资源进行管理
#### queue
##### 创建queue
```
kubectl create -f FILENAME

// 定义queue的yaml文件样例
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: test
spec:
  weight: 1
  reclaimable: false
  capability:
    cpu: 2
```
##### 删除queue
```
kubectl delete queue QUEUENAME
```
##### 查看queue列表
```
kubectl get queue
```
##### 查看指定queue详情
```
kubectl get queue QUEUENAME -o yaml
```
##### 更新queue
```
kubectl edit queue QUEUENAME
```

#### podgroup
##### 创建podgroup
```
kubectl create -f FILENAME

// 定义podgroup的yaml文件样例
apiVersion: scheduling.volcano.sh/v1beta1
kind: PodGroup
metadata:
  name: test
  namespace: default
spec:
  minMember: 1
  minResources:
    cpu: "3"
    memory: "2048Mi"
  priorityClassName: high-prority
  queue: default
```
##### 删除podgroup
```
kubectl delete podgroup PODGROUPNAME
```
##### 查看podgroup列表
```
kubectl get podgroup
```
##### 查看指定podgroup详情
```
kubectl get podgroup PODGROUPNAME -o yaml
```
##### 更新podgroup
```
kubectl edit podgroup PODGROUPNAME
```

#### vcjob
##### 创建vcjob
```
kubectl create -f FILENAME

// 定义volcano job的yaml文件样例
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: job-1
spec:
  minAvailable: 1
  schedulerName: volcano
  queue: default
  policies:
    - event: PodEvicted
      action: RestartJob
  tasks:
    - replicas: 1
      name: nginx
      policies:
      - event: TaskCompleted
        action: CompleteJob
      template:
        spec:
          containers:
            - command:
              - sleep
              - 10m
              image: nginx:latest
              name: nginx
              resources:
                requests:
                  cpu: 3
                limits:
                  cpu: 3
```
##### 删除vcjob
```
kubectl delete vcjob 
```
##### 查看vcjob列表
```
kubectl get vcjob
```
##### 查看指定vcjob详情
```
kubectl get vcjob VCJOBNAME -oyaml
```
##### 更新vcjob
```
kubectl edit vcjob VCJOBNAME
```
#### 日志查看
##### 查看volcano scheduler日志
```
1. 获取volcano scheduler的pod名称
[root@ECS volcano]# kubectl get pod -nvolcano-system
NAME                            READY   STATUS      RESTARTS   AGE
volcano-admission-xxxx          1/1     Running     0          1m
volcano-admission-init-xxxx     0/1     Completed   0          1m
volcano-controllers-xxxx        1/1     Running     0          1m
volcano-scheduler-xxxx          1/1     Running     0          1m

2. 查看volcano scheduler的日志
[root@ECS volcano]# kubectl logs volcano-scheduler-xxxx -nvolcano-system
```
