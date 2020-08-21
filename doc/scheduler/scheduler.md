#### 简介
volcano scheduler负责pod的调度工作。它由一系列actions和plugins构成，其中actions规定了调度各环节需要执行的动作，plugins根据不同场景给出了
actions执行动作的算法细节。volcano scheduler具有高度扩展性，可根据需要自行规定和实现actions和plugins。
#### 工作流
![volcano scheduler工作流](./scheduler.PNG)
volcano scheduler工作流程大概如下：
1. 客户端新提交的任务被scheduler watch到后纳入cache
2. 周期性开启session，开始一次完整的调度过程
3. 将cache中尚未调度的任务纳入session的待调度任务队列
4. 遍历所有的待调度任务。针对每个任务，依次执行enqueue、allocate、preempt、reclaim、backfill等action，为任务找到一个最合适的node并执行
绑定操作。action中执行的具体算法逻辑取决于注册的plugins中的各函数的实现
5. 关闭本次session
#### Actions
##### enqueue
enqueue action负责通过一系列过滤算法，筛选出符合要求的待调度任务，并将去送入队列中。通过该action后任务的状态由pending变为inqueue
##### allocate
allocate action负责通过预算算法和优选算法为待调度任务寻找一个最合适的node
##### preempt
preempt action负责根据优先级规则，对同一个queue中高优先级的任务进行抢占调度
##### reclaim
reclaim action负责当有新任务进入queue而集群资源不能满足当前queue的需要时，基于queue weight对集群应得资源进行回收操作
#### backfill
backfill action负责将处于pending状态的任务回填到集群node中，以尽量提高node的资源使用率 
#### Plugins
##### gang
gang plugin认为未处于ready状态的任务具有较高优先级。它会通过检查回收队列应得资源等手段后是否能满足任务运行minAvailable个pod所需资源来决定是否
调度任务
##### conformance
conformance plugin认为处于kube-system命名空间下的任务具有更高的优先级，这些任务不会被抢占调度
##### DRF
DRF plugin认为申请资源较少的任务具有更高的优先级。它会尝试计算抢占者和被抢占者已经被分配的资源总量，当抢占者占有的资源分量更少时触发抢占行为
##### nodeorder
nodeorder plugin通过一系列维度的打分算法后，返回所有node针对某个任务的得分。得分最高的node被认为是最适合该任务的node
##### predicates
predicates plugin通过一系列维度的评估算法，决定某个task是否被绑定到某个node
##### priority
priority plugin用于比较两个任务的优先级高低。针对两个不同的job，通过比较job.spec.priorityClassName决定谁的优先级更高；针对两个不同的task，
通过依次比较task.podSpec.taskPriority决定优先级更高
#### 配置
volcano scheduler的组合模式设计决定了它具有高度的可扩展性。用户可以根据个人需求决定使用哪些action和plugin进行工作，也可以基于接口实现自定义
action或plugin。scheduler的配置位于名为volcano-scheduler-configmap的configmap中，该configmap以volume的挂载在scheduler容器的
/volcano.scheduler路径下。
获取volcano scheduler配置过程如下：
* 获取名为volcano-scheduler-configmap的configmap
```
[root@ECS ~]# kubectl get configmap -nvolcano-system
NAME                          DATA   AGE
volcano-scheduler-configmap   1      6d2h
```
* 查看configmap内配置详情,data部分为配置详情
```
[root@ECS ~]# kubectl get configmap volcano-scheduler-configmap -nvolcano-system -oyaml
apiVersion: v1
data:
  volcano-scheduler.conf: |
    actions: "enqueue, allocate, backfill"
    tiers:
    - plugins:
      - name: priority
      - name: gang
      - name: conformance
    - plugins:
      - name: drf
      - name: predicates
      - name: proportion
      - name: nodeorder
      - name: binpack
kind: ConfigMap
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"v1","data":{"volcano-scheduler.conf":"actions: \"enqueue, allocate, backfill\"\ntiers:\n- plugins:\n  - name: priority\n  - name: gang\n  - name: conformance\n- plugins:\n  - name: drf\n  - name: predicates\n  - name: proportion\n  - name: nodeorder\n  - name: binpack\n"},"kind":"ConfigMap","metadata":{"annotations":{},"name":"volcano-scheduler-configmap","namespace":"volcano-system"}}
  creationTimestamp: "2020-08-15T04:01:02Z"
  name: volcano-scheduler-configmap
  namespace: volcano-system
  resourceVersion: "266"
  selfLink: /api/v1/namespaces/volcano-system/configmaps/volcano-scheduler-configmap
  uid: 1effe4d6-126c-42d6-a3a4-b811075c30f5
```
在volcano-scheduler.conf中，包括actions和tiers两部分。actions中以逗号作为分隔符配置scheduler需要执行的action，需要注意的是配置的顺序即
为scheduler执行的顺序，volcano本身不会对顺序的合理性进行检查。tiers中配置的plugins列表为向scheduler注册的plugins，plugins中定义的具体算法
实现将会在actions中被调用