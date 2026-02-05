++
title = "Extender 用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_extender/"
[menu.docs]
  parent = "user-guide"
++

### 安装 Volcano

#### 1. 从源码安装

参考 [安装指南](https://github.com/volcano-sh/volcano/blob/master/installer/README.md) 安装 Volcano。

#### 2. 部署 Extender

在 Kubernetes 集群中部署 Extender。Extender 需要对外暴露可访问的域名或 IP 地址，并提供一组可被调用的 HTTP 动作（verbs）。

#### 3. 更新 Volcano 配置

```shell
kubectl edit cm -n volcano-system volcano-scheduler-configmap
```

用户可以通过 [设计文档](https://github.com/volcano-sh/volcano/blob/master/docs/design/extender.md) 了解各参数的具体含义。

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

### 校验 Extender 是否生效

在调度器日志中可以看到类似如下内容，即表示 Extender 插件已按配置正确初始化：

> `Initialize extender plugin with configuration : {your configuration}`

