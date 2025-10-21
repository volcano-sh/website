+++
title =  "Argo on Volcano"

date = 2025-07-20
lastmod = 2025-07-20

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Argo"
[menu.docs]
  parent = "zoology"
  weight = 3

+++



### Argo简介

Argo是一个开源的Kubernetes原生工作流引擎，它允许用户定义和执行容器化的工作流。Argo项目包含多个组件，其中Argo Workflows是核心组件，用于在Kubernetes上编排并行作业，支持DAG（有向无环图）和步骤模板。

### Argo on volcano

通过将Argo Workflow与Volcano集成，可以结合两者的优势：Argo提供强大的工作流编排能力，而Volcano提供高级调度功能。

#### 集成方式

Argo资源模板允许创建、删除或更新任何类型的Kubernetes资源（包括CRD）。我们可以使用资源模板将Volcano Jobs集成到Argo Workflow中，从而为Volcano添加作业依赖管理和DAG流程控制功能。

#### 配置RBAC权限

集成前需要确保Argo Workflow有足够的权限来管理Volcano资源：

1. Argo Workflow需要指定serviceAccount，可通过以下方式指定：

   ```
   argo submit --serviceaccount <name>
   ```

2. 为serviceAccount添加Volcano资源的管理权限：

   ```yaml
   yaml- apiGroups:
     - batch.volcano.sh
     resources:
     - "*"
     verbs:
     - "*"
   ```

#### 示例

以下是使用Argo Workflow创建Volcano Job的示例YAML：

```yaml
yamlapiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: volcano-job-
spec:
  entrypoint: nginx-tmpl
  serviceAccountName: argo        # 指定服务账户
  templates:
  - name: nginx-tmpl
    activeDeadlineSeconds: 120    # 限制工作流执行时间
    resource:                     # 表示这是一个资源模板
      action: create              # kubectl操作类型
      successCondition: status.state.phase = Completed
      failureCondition: status.state.phase = Failed
      manifest: |
        apiVersion: batch.volcano.sh/v1alpha1
        kind: Job
        metadata:
          generateName: test-job-
          ownerReferences:        # 添加所有者引用，确保资源生命周期管理
          - apiVersion: argoproj.io/v1alpha1
            blockOwnerDeletion: true
            kind: Workflow
            name: "{{workflow.name}}"
            uid: "{{workflow.uid}}"
        spec:
          minAvailable: 1
          schedulerName: volcano
          policies:
          - event: PodEvicted
            action: RestartJob
          plugins:
            ssh: []
            env: []
            svc: []
          maxRetry: 5
          queue: default
          tasks:
          - replicas: 2
            name: "default-nginx"
            template:
              metadata:
                name: web
              spec:
                containers:
                - image: nginx:latest
                  imagePullPolicy: IfNotPresent
                  name: nginx
                  resources:
                    requests:
                      cpu: "100m"
                restartPolicy: OnFailurer
```

如果要查看更多信息和高级配置，请查看[链接](https://github.com/volcano-sh/volcano/tree/master/example/integrations/argo)了解更多。