+++
title =  "argo on volcano"

date = 2021-06-29
lastmod = 2021-06-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "argo"
[menu.docs]
  parent = "ecosystem"
  weight = 9

+++



### What is Argo Workflow

Argo Workflows is an open source container native workflow engine used to coordinate running jobs on Kubernetes. Argo Workflows is implemented based on Kubernetes CRD.

The following functions are supported:

- Define a workflow where each step in the workflow is a container.
- Model a multi-step workflow as a series of tasks, or use a directed acyclic graph (DAG) to capture dependencies between tasks.
- Argo Workflows on Kubernetes can easily perform a large number of computationally intensive jobs in a short period of time.
- CI/CD can be run in kubernetes native environment without having to configure complex software development products.

### Deployment of Argo

1.Download the `install.yaml`

```
# curl -OL https://raw.githubusercontent.com/argoproj/argo-workflows/stable/manifests/quick-start-postgres.yaml
```

2.The deployment of argo

```
# kubectl create ns argo
# kubectl apply -n argo -f .
```

3.View the corresponding pod. The following four pods are generated.

```
# kubectl get po -n argo
NAME                                   READY   STATUS      RESTARTS   AGE
argo-server-574ddc66b-62rjc            1/1     Running     4          4h25m
minio                                  1/1     Running     0          4h25m
postgres-56fd897cf4-k8fwd              1/1     Running     0          4h25m
workflow-controller-77658c77cc-p25ll   1/1     Running     4          4h25m
```

Argo-server is the Argo server, Mino is the work-in-progress warehouse, Postgres is the database, and Workflow controller is the process controller.

### Argo workflow on volcano

1.Configuring Resource Rights

```
# kubectl edit role argo-role -n argo
Enter the edit mode, add the following configuration at the end, save the configuration, and exit.

- apiGroups:
  - batch.volcano.sh
  resources:
  - "*"
  verbs:
  - "*"
```



2.Deploy the Argo Workflow workload

```
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: volcano-step-job-
spec:
  entrypoint: volcano-step-job
  serviceAccountName: argo
  templates:
  - name: volcano-step-job
    steps:
    - - name: hello-1
        template: hello-tmpl
        arguments:
          parameters: [{name: message, value: hello1}, {name: task, value: hello1}]
    - - name: hello-2a
        template: hello-tmpl
        arguments:
          parameters: [{name: message, value: hello2a}, {name: task, value: hello2a}]
      - name: hello-2b
        template: hello-tmpl
        arguments:
          parameters: [{name: message, value: hello2b}, {name: task, value: hello2b}]
  - name: hello-tmpl
    inputs:
      parameters:
      - name: message
      - name: task
    resource:
      action: create
      successCondition: status.state.phase = Completed
      failureCondition: status.state.phase = Failed
      manifest: |
        apiVersion: batch.volcano.sh/v1alpha1
        kind: Job
        metadata:
          generateName: step-job-{{inputs.parameters.task}}-
          ownerReferences:
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
          maxRetry: 1
          queue: default
          tasks:
          - replicas: 2
            name: "default-hello"
            template:
              metadata:
                name: helloworld
              spec:
                containers:
                - image: docker/whalesay
                  imagePullPolicy: IfNotPresent
                  command: [cowsay]
                  args: ["{{inputs.parameters.message}}"]
                  name: hello
                  resources:
                    requests:
                      cpu: "100m"
                restartPolicy: OnFailure
```

3. Query pod running status.

```
#kubectl get po -n argo
step-job-hello1-k6m9r-default-hello-0    0/1     Completed   0          2d16h
step-job-hello1-k6m9r-default-hello-1    0/1     Completed   0          2d16h
step-job-hello2a-cxmfw-default-hello-0   0/1     Completed   0          2d16h
step-job-hello2a-cxmfw-default-hello-1   0/1     Completed   0          2d16h
step-job-hello2b-28tfl-default-hello-0   0/1     Completed   0          2d16h
step-job-hello2b-28tfl-default-hello-1   0/1     Completed   0          2d16h
volcano-step-job-9lw4x-4266206267        0/1     Completed   0          2d16h
volcano-step-job-9lw4x-834989871         0/1     Completed   0          2d16h
volcano-step-job-9lw4x-851767490         0/1     Completed   0          2d16h
```

4.For details about Argo Workflow features, see the Argo Workflow [samples](https://github.com/argoproj/argo-workflows/tree/master/examples#argo-cli).



