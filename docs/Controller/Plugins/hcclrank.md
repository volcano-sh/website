---
title: HCCLRank
---

## Introduction

In distributed AI training, particularly when using Ascend NPUs (Neural Processing Units) or MindSpore frameworks, the compute nodes need a deterministic rank or index to communicate over HCCL (Huawei Collective Communication Library).

The **HCCLRank Plugin** is a Volcano Job plugin that automatically injects a `hccl/rankIndex` annotation into the Pods of a Volcano Job. It calculates a unique rank for each pod based on its task type (`master` or `worker`) and its replica index.

## Mechanism

During the Pod creation phase (`OnPodCreate`), the HCCLRank Plugin intercepts the pod and adds the `hccl/rankIndex` annotation to it.

The calculation is as follows:
- **Master Role**: Rank = Pod Index
- **Worker Role**: Rank = (Total Master Replicas) + Pod Index

If the Pod already has a `RANK` environment variable defined in its container specifications, the plugin will use that value instead and simply map it to the `hccl/rankIndex` annotation.

## Configuration

To enable the HCCLRank plugin, configure it within the Volcano job controller's configuration or add it to the `plugins` field of your `VolcanoJob` spec.

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

### Arguments

The HCCLRank plugin supports overriding the default task names used to identify master and worker roles:

- **`--master`**: The name of the master role task in your Job spec. Default is `master`.
- **`--worker`**: The name of the worker role task in your Job spec. Default is `worker`.
