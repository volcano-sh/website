---
title: "Cron VolcanoJob"
sidebar_position: 4
---

### 定义
Cron VolcanoJob, 简称cronvcjob，cronvj，是Volcano自定义的资源类型。用户现在可以根据预定义的调度计划定期创建和运行Volcano Job，类似于Kubernetes原生的CronJob，以实现批量计算任务(如AI和大数据)的定期执行。
### 样例
```shell
apiVersion: batch.volcano.sh/v1alpha1
kind: CronJob
metadata:
  name: volcano-cronjob-example
spec:
  schedule: "*/5 * * * *"
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 60
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      schedulerName: volcano
      tasks:
        - replicas: 1
          name: "task-1"
          template:
            spec:
              containers:
                - name: busybox-container
                  image: busybox:latest
                  command: ["/bin/sh", "-c", "date; echo Hello from Volcano CronJob"]
              restartPolicy: OnFailure
      policies:
        - event: PodEvicted
          action: RestartJob
      minAvailable: 1
```
查看 Cron VolcanoJob
```shell
kubectl get cronvcjob
```
查看创建的 job 实例
```shell
kubectl get vcjob
```
### 关键字段
* schedule

    必需。用于volcano job 执行的 cron 计划字符串。使用标准 cron 格式。

* timeZone

    可选。调度计划的时区名称。默认为 kube-controller-manager 的本地时区。

*   concurrencyPolicy

    可选。指定如何管理 Cron VolcanoJob 创建的 job 的并发执行。为下列规则中的一种：
    *   Allow（默认）：允许并发运行
    *   Forbid：禁止并发运行，跳过新周期的执行
    *   Replace：取消当前运行的 job，并用新的 job 替换它

<!-- -->

* startingDeadlineSeconds

    可选。如果 job 错过其计划时间，启动 job 的截止时间（秒）。

* suspend

    可选。如果设置为 true，所有后续执行将被暂停。

* jobTemplate

    必需。用于创建 Volcano Job 的模板。包含完整的 Volcano Job 规范。

* successfulJobsHistoryLimit

    可选。要保留的成功完成 job 的数量。默认为 3。

* failedJobsHistoryLimit

    可选。要保留的失败完成 job 的数量。默认为 1。

<!-- -->

### 使用场景
* 定期模型训练

每天凌晨自动启动分布式模型训练任务，利用集群空闲时段进行大规模机器学习训练。
```shell
apiVersion: batch.volcano.sh/v1alpha1
kind: CronJob
metadata:
  name: daily-model-training
spec:
  schedule: "0 2 * * *"  # 每天凌晨2点运行
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      minAvailable: 4
      schedulerName: volcano
      tasks:
        - replicas: 1
          name: ps
          template:
            # 参数服务器配置
        - replicas: 3  
          name: worker
          template:
            # 训练worker配置
```

* 定时资源清理

每周日晚上清理临时数据和日志文件，释放集群存储空间。
```shell
apiVersion: batch.volcano.sh/v1alpha1
kind: CronJob
metadata:
  name: weekly-cleanup
spec:
  schedule: "0 22 * * 0"  # 每周日22点运行
  timeZone: "Asia/Shanghai"
  jobTemplate:
    spec:
      minAvailable: 1
      schedulerName: volcano
      tasks:
        - replicas: 1
          name: cleanup
          template:
            # 清理任务容器配置
```
