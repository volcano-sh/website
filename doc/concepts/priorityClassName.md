#### 定义
PriorityClassName是podgroup或podgroup的属性之一，用于抢占场景下对pod或podgroup进行排序和比较。该概念沿用了Kubernetes中的原定义。
#### 样例
```
apiVersion: scheduling.k8s.io/v1beta1
kind: PriorityClass
metadata:
 name: high-priority
value: 100
globalDefault: false
description: "high priority"
```
#### 关键字段
* name
name表示该priorityClass的名称。使用该priorityClass给pod或podgroup声明优先级时使用该名称，而非直接使用优先级的数值。**system-node-critical**和**system-cluster-critical**是2个预留的值，表示最高优先级。
* value
value表示该priorityClass的优先级权重，取值范围为 **[-2147483648, 1000000000]**。取值越大，表示优先级越高。
* globalDefault
golbalDefault表示该priorityClass是否作为全局默认优先级，取值为**true**或**false**。一旦设置为true，该priorityClass将作为未设置priorityClass的资源的默认优先级。priorityClass是cluster级别的设置，不受namespace限制。
#### 使用场景
* 为pod设置优先级
```
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    env: test
spec:
  containers:
  - name: nginx
    image: nginx
    imagePullPolicy: IfNotPresent
  priorityClassName: high-priority
```
* 为podgroup设置优先级
```
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
#### 说明事项
* 默认值
若没有自定义默认priorityClass，将使用系统默认priorityClass，取值为0
* 生效周期
若修改已创建的priorityClass，那些设置该priorityClass的资源的优先级级别将**不会**产生影响。修改仅对后续使用该priorityClass的资源产生影响。
