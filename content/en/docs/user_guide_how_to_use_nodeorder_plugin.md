+++
title = "NodeOrder Plugin User Guide"
date = 2024-05-10
type = "docs"
weight = 50
url = "/en/docs/user-guide/how_to_use_nodeorder_plugin/"
[menu.docs]
  parent = "user-guide"
+++

## Introduction

The NodeOrder plugin is responsible for scoring nodes during the scheduling process to find the absolute best node for a pod. Rather than just finding *any* node that fits the pod's requirements, NodeOrder ranks the nodes based on configurable scoring dimensions, such as affinity rules or resource availability.

## Environment setup

### Update scheduler configmap

The `nodeorder` plugin must be enabled in the scheduler configuration.

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: volcano-scheduler-configmap
  namespace: volcano-system
data:
  volcano-scheduler.conf: |
    actions: "enqueue, allocate, backfill"
    tiers:
    - plugins:
      - name: priority
      - name: nodeorder
      - name: gang
```

## How to use NodeOrder Plugin

The NodeOrder plugin scores nodes automatically based on built-in Kubernetes concepts like `NodeAffinity`, `PodAffinity`, and `PodAntiAffinity`. 

### Example YAML

Create a file named `nodeorder-job.yaml`:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: nodeorder-job
spec:
  minAvailable: 1
  schedulerName: volcano
  tasks:
    - replicas: 3
      name: worker
      template:
        spec:
          affinity:
            nodeAffinity:
              preferredDuringSchedulingIgnoredDuringExecution:
              - weight: 100
                preference:
                  matchExpressions:
                  - key: disktype
                    operator: In
                    values:
                    - ssd
          containers:
            - image: nginx
              name: nginx
              resources:
                requests:
                  cpu: "1"
          restartPolicy: OnFailure
```

In this example, the `nodeAffinity` specifies a `preferredDuringSchedulingIgnoredDuringExecution` rule. The NodeOrder plugin takes this preference into account. It will give a higher score (boosted by the weight of 100) to any node that has the label `disktype=ssd`.

## Verification

1. Label one of your nodes with `disktype=ssd`:
   ```bash
   kubectl label nodes <your-node-name> disktype=ssd
   ```

2. Apply the job:
   ```bash
   kubectl apply -f nodeorder-job.yaml
   ```

3. Check where the pods were scheduled:
   ```bash
   kubectl get pods -o wide | grep nodeorder-job
   ```

4. You will observe that the Volcano scheduler strongly prefers to place the pods on the node labeled with `disktype=ssd` due to the high score calculated by the NodeOrder plugin.
