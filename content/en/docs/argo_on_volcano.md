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



### Argo Introduction

Argo is an open-source Kubernetes native workflow engine that allows users to define and execute containerized workflows. The Argo project includes multiple components, with Argo Workflows being the core component used for orchestrating parallel jobs on Kubernetes, supporting DAG (Directed Acyclic Graph) and step templates.

### Argo on Volcano

By integrating Argo Workflow with Volcano, you can combine the advantages of both: Argo provides powerful workflow orchestration capabilities, while Volcano provides advanced scheduling features.

#### Integration Method

Argo resource templates allow for the creation, deletion, or updating of any type of Kubernetes resource (including CRDs). We can use resource templates to integrate Volcano Jobs into Argo Workflow, thereby adding job dependency management and DAG flow control capabilities to Volcano.

#### Configuring RBAC Permissions

Before integration, ensure that Argo Workflow has sufficient permissions to manage Volcano resources:

1. Argo Workflow needs to specify a serviceAccount, which can be specified as follows:

   ```
   argo submit --serviceaccount <name>
   ```

2. Add Volcano resource management permissions to the serviceAccount:

   ```yaml
   yaml- apiGroups:
     - batch.volcano.sh
     resources:
     - "*"
     verbs:
     - "*"
   ```

#### Example

Here is an example YAML for creating a Volcano Job using Argo Workflow:

```yaml
yamlapiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: volcano-job-
spec:
  entrypoint: nginx-tmpl
  serviceAccountName: argo        # Specify service account
  templates:
  - name: nginx-tmpl
    activeDeadlineSeconds: 120    # Limit workflow execution time
    resource:                     # Indicates this is a resource template
      action: create              # kubectl operation type
      successCondition: status.state.phase = Completed
      failureCondition: status.state.phase = Failed
      manifest: |
        apiVersion: batch.volcano.sh/v1alpha1
        kind: Job
        metadata:
          generateName: test-job-
          ownerReferences:        # Add owner references to ensure resource lifecycle management
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
                restartPolicy: OnFailure
```

For more information and advanced configurations, please check the [link](https://github.com/volcano-sh/volcano/tree/master/example/integrations/argo) to learn more.