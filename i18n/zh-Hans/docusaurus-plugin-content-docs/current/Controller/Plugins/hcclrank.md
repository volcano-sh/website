---
title: HCCLRank
---

## 介绍

在分布式人工智能训练中，特别是在使用Ascend NPU（神经处理单元）或MindSpore框架时，计算节点需要确定性的排名或索引才能通过HCCL（华为集体通信库）进行通信。

**HCCLRank 插件** 是一个 Volcano 作业插件，它会自动将 `hccl/rankIndex` 注释注入到 Volcano 作业的 Pod 中。它根据每个 Pod 的任务类型（“master”或“worker”）及其副本索引计算其唯一排名。

## 机制

在 Pod 创建阶段 (`OnPodCreate`)，HCCLRank 插件会拦截 pod 并向其添加 `hccl/rankIndex` 注释。

计算如下：
- **主角色**：排名 = Pod 指数
- **工作者角色**：排名=（主副本总数）+ Pod 索引

如果 Pod 的容器规范中已经定义了“RANK”环境变量，则插件将使用该值，并将其简单地映射到“hccl/rankIndex”注释。

## 配置

要启用 HCCLRank 插件，请在 Volcano 作业控制器的配置中对其进行配置，或将其添加到“VolcanoJob”规范的“plugins”字段中。

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: ascend-distributed-training
spec:
  minAvailable: 3
  schedulerName: volcano
  plugins:
    hcclrank:
      - --master=master
      - --worker=worker
  tasks:
    - replicas: 1
      name: master
      template:
        spec:
          containers:
            - name: master
              image: my-ascend-image
    - replicas: 2
      name: worker
      template:
        spec:
          containers:
            - name: worker
              image: my-ascend-image
```

### 参数

HCCLRank 插件支持覆盖用于识别主角色和辅助角色的默认任务名称：

- **`--master`**：作业规范中主角色任务的名称。默认为“master”。
- **`--worker`**：作业规范中辅助角色任务的名称。默认是“工人”。