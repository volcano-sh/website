---
title: "Cron VolcanoJob"
date: 2025-11-19
draft: false
toc: true
parent: "concepts"
sidebar_position: 4
---


### Introduction
Cron VolcanoJob, also known as cronvcjob or cronvj, is a custom resource type in Volcano. Users can now periodically create and run Volcano Jobs based on predefined schedules, similar to Kubernetes native CronJobs, enabling scheduled execution of batch computing tasks (such as AI and big data workloads).
### Example
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
View Cron VolcanoJob
```shell
kubectl get cronvcjob
```
View created job instances
```shell
kubectl get vcjob
```
### Key Fields
* schedule

    Required. The cron schedule string for Volcano Job execution. Uses standard cron format.

* timeZone

    Optional. The time zone name for the schedule. Defaults to the local time zone of the kube-controller-manager.

* concurrencyPolicy

    Optional. Specifies how to manage concurrent executions of jobs created by the Cron VolcanoJob. Must be one of the following:
    *   Allow (default): Allow concurrent runs  
    *   Forbid: Skip new run if previous job hasn‘t completed  
    *   Replace: Cancel currently running job and start new

<!-- -->

* startingDeadlineSeconds

    Optional. Deadline in seconds for starting the job if it misses its scheduled time.

* suspend

    Optional. If set to true, all subsequent executions will be suspended.

* jobTemplate

    Required. The template for creating Volcano Jobs. Contains the complete Volcano Job specification.

* successfulJobsHistoryLimit

    Optional. Number of successful finished jobs to retain. Defaults to 3.

* failedJobsHistoryLimit

    Optional. Number of failed finished jobs to retain. Defaults to 1.

<!-- -->

### Usage
* Periodic Model Training

Automatically start distributed model training tasks daily during off-peak hours, utilizing cluster idle time for large-scale machine learning training.
```shell
apiVersion: batch.volcano.sh/v1alpha1
kind: CronJob
metadata:
  name: daily-model-training
spec:
  schedule: "0 2 * * *"  # Run daily at 2 AM
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      minAvailable: 4
      schedulerName: volcano
      tasks:
        - replicas: 1
          name: ps
          template:
            # Parameter server configuration
        - replicas: 3  
          name: worker
          template:
            # Training worker configuration
```

* Scheduled Resource Cleanup

Clean up temporary data and log files every Sunday evening to free up cluster storage space.
```shell
apiVersion: batch.volcano.sh/v1alpha1
kind: CronJob
metadata:
  name: weekly-cleanup
spec:
  schedule: "0 22 * * 0"  # Run every Sunday at 10 PM
  timeZone: "Asia/Shanghai"
  jobTemplate:
    spec:
      minAvailable: 1
      schedulerName: volcano
      tasks:
        - replicas: 1
          name: cleanup
          template:
            # Cleanup task container configuration
```