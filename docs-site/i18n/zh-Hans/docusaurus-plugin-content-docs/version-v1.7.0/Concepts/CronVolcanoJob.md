---
title: "Cron VolcanoJob"
sidebar_position: 4
---

### 简介
Cron VolcanoJob，也称为 cronvcjob 或 cronvj，是 Volcano 中的一种自定义资源类型。用户现在可以基于预定义的计划定期创建和运行 Volcano Job，类似于 Kubernetes 原生的 CronJob，从而实现批量计算任务（如 AI 和大数据工作负载）的定时执行。

### 示例
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
查看已创建的作业实例
```shell
kubectl get vcjob
```
### 关键字段
* schedule

    必填。Volcano Job 执行的 cron 计划字符串。使用标准 cron 格式。

* timeZone

    选填。计划的时区名称。默认为 kube-controller-manager 的本地时区。

* concurrencyPolicy

    选填。指定如何管理 Cron VolcanoJob 创建的作业的并发执行。必须是以下之一：
    *   Allow（默认）：允许并发运行  
    *   Forbid：如果前一个作业未完成，则跳过新作业  
    *   Replace：取消当前正在运行的作业并启动新作业

<!-- -->

* startingDeadlineSeconds

    选填。如果作业错过了计划时间，启动作业的截止时间（秒）。

* suspend

    选填。如果设置为 true，所有后续执行将被挂起。

* jobTemplate

    必填。用于创建 Volcano Job 的模板。包含完整的 Volcano Job 规范。

* successfulJobsHistoryLimit

    选填。保留的成功完成作业的数量。默认为 3。

* failedJobsHistoryLimit

    选填。保留的失败完成作业的数量。默认为 1。

<!-- -->

### 用法
* 定期模型训练

在非高峰时段每天自动启动分布式模型训练任务，利用集群空闲时间进行大规模机器学习训练。
```shell
apiVersion: batch.volcano.sh/v1alpha1
kind: CronJob
metadata:
  name: daily-model-training
spec:
  schedule: "0 2 * * *"  # 每天凌晨 2 点运行
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
            # 训练 worker 配置
```

* 定时资源清理

每周日晚上清理临时数据和日志文件，以释放集群存储空间。
```shell
apiVersion: batch.volcano.sh/v1alpha1
kind: CronJob
metadata:
  name: weekly-cleanup
spec:
  schedule: "0 22 * * 0"  # 每周日晚上 10 点运行
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