---
title: "Volcano Job Time to Live 用户指南"
---

## 背景

与标准 `Job` 资源类似，Volcano Job 可在执行结束（Complete 或 Failed）后自动进行垃圾回收。通过设置 `spec.ttlSecondsAfterFinished` 可限制 Job 的生命周期。

## 要点

`ttlSecondsAfterFinished` 是 Volcano Job 上的可选字段，默认为 `nil`。其值必须为正整数，表示 Job 执行结束（Complete 或 Failed）后经过多少秒才符合垃圾回收条件。

- 未设置或设为 `nil`：Job 将一直保留。
- 设为 `0`：Job 完成后立即符合垃圾回收条件。
- 设为正整数 `N`：Job 完成后 `N` 秒符合垃圾回收条件。

## 延伸阅读

此处使用自定义垃圾回收器，行为与标准 `batch.v1.Job` 的 `ttlSecondsAfterFinished` 几乎一致。[Kubernetes 官方文档](https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/)介绍了如何通过 Mutating Webhook 更好地利用 `ttlSecondsAfterFinished`。

## 示例

以下清单创建的 Job 在完成或失败后 10 分钟（600 秒）即符合垃圾回收条件。

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  generateName: test-job-
spec:
  minAvailable: 1
  schedulerName: volcano
  queue: testing
  ttlSecondsAfterFinished: 600
  policies:
    - event: PodEvicted
      action: RestartJob
  tasks:
    - replicas: 1
      name: sleeper
      policies:
        - event: TaskCompleted
          action: CompleteJob
      template:
        spec:
          restartPolicy: Never
          imagePullPolicy: IfNotPresent
          containers:
            - name: sleeper
              image: debian:buster
              command:
                - /bin/bash
                - -c
                - |
                  for i in {0..5}; do
                      echo "sleeping"
                      sleep 1
                  done
```
