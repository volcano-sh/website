---
title: "Extender 用户指南"
---


### 安装 Volcano

#### 1. 从源码安装

请参考[安装指南](https://github.com/volcano-sh/volcano/blob/master/installer/README.md)安装 Volcano。

#### 2. 部署 Extender

将 Extender 部署到 Kubernetes 集群。Extender 需要对外暴露域名或 IP 地址，并提供可调用的 verb。

#### 3. 更新 Volcano 配置

```shell script
kubectl edit cm -n volcano-system volcano-scheduler-configmap
```

可通过[设计文档](https://github.com/volcano-sh/volcano/blob/master/docs/design/extender.md)查看各参数含义。

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: volcano-scheduler-configmap
  namespace: volcano-system
data:
  volcano-scheduler.conf: |
    actions: "reclaim, allocate, backfill, preempt"
    tiers:
    - plugins:
      - name: priority
      - name: gang
      - name: conformance
    - plugins:
      - name: drf
      - name: predicates
      - name: extender
        arguments:
          extender.urlPrefix: http://127.0.0.1:8713
          extender.httpTimeout: 100ms
          extender.onSessionOpenVerb: onSessionOpen
          extender.onSessionCloseVerb: onSessionClose
          extender.predicateVerb: predicate
          extender.prioritizeVerb: prioritize
          extender.preemptableVerb: preemptable
          extender.reclaimableVerb: reclaimable
          extender.queueOverusedVerb: queueOverused
          extender.jobEnqueueableVerb: jobEnqueueable
          extender.ignorable: true
```

### 验证 Extender 是否生效

在日志中可看到类似：`Initialize extender plugin with configuration : {your configuration}`
