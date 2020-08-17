#### 定义
volcano job，简称vcjob，是volcano自定义的job资源类型。区别于kubernetes job，vcjob提供了更多高级功能，如可指定调度器、支持最小运行pod数、
支持task、支持生命周期管理、支持指定队列、支持优先级调度等。volcano job更加适用于机器学习、大数据、科学计算等高性能计算场景          
#### 样例
```
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: test-job
spec:
  minAvailable: 3
  schedulerName: volcano
  priorityClassName: high-priority
  policies:
    - event: PodEvicted
      action: RestartJob
  plugins:
    ssh: []
    env: []
    svc: []
  maxRetry: 5
  queue: default
  volumes:
    - mountPath: "/myinput"
    - mountPath: "/myoutput"
      volumeClaimName: "testvolumeclaimname"
      volumeClaim:
        accessModes: [ "ReadWriteOnce" ]
        storageClassName: "my-storage-class"
        resources:
          requests:
            storage: 1Gi
  tasks:
    - replicas: 6
      name: "default-nginx"
      template:
        metadata:
          name: web
        spec:
          containers:
            - image: nginx
              imagePullPolicy: IfNotPresent
              name: nginx
              resources:
                requests:
                  cpu: "1"
          restartPolicy: OnFailure
```
#### 关键字段
* schedulerName
schedulerName表示该job的pod所使用的调度器，默认值为volcano，也可指定为default。它也是tasks.template.spec.schedulerName的默认值
* minAvailable
minAvailable表示运行该pod所要运行的**最少**pod数量。若集群资源等因素限制使得当前环境能运行的pod数小于minAvailable，则不调度该job中的pod，
job处于pending状态，直到环境满足要求
* volumes
volumes表示该job的挂卷配置。volumes配置遵从kubernetes volumes配置要求
* tasks.replicas
tasks.replicas表示某个task pod的副本数
* tasks.template
tasks.template表示某个task pod的具体配置定义
* tasks.policies
tasks.policies表示某个task的生命周期策略
* policies
policies表示job中所有task的默认生命周期策略，在tasks.policies不配置时使用该策略
* plugins
plugins表示该job在调度过程中使用的插件
* queue
queue表示该job所属的队列
* priorityClassName
priorityClassName表示该job优先级，在抢占调度和优先级排序中生效
* maxRetry
maxRetry表示当该job可以进行的最大重启次数
#### 资源状态
* pending
pending表示job还在等待调度中，处于排队的状态
* aborting
aborting表示job因为某种外界原因正处于中止状态，即将进入aborted状态
* aborted
aborted表示job因为某种外界原因已处于中止状态
* running
running表示job中至少有minAvailable个pod正在运行状态
* restarting
restarting表示job正处于重启状态，正在中止当前的job实例并重新创建新的实例
* completing
completing表示job中至少有minAvailable个数的task已经完成，该job正在进行最后的清理工作
* completed
completing表示job中至少有minAvailable个数的task已经完成，该job已经完成了最后的清理工作
* terminating
terminating表示job因为某种内部原因正处于终止状态，正在等到pod或task释放资源
* terminated
terminated表示job因为某种内部原因已经处于终止状态，job没有达到预期就结束了
* failed
failed表示job经过了maxRetry次重启，依然没有正常启动
#### 使用场景
#### 说明事项