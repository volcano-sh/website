+++
title = "VolcanoJob"


date = 2019-01-28
lastmod = 2020-08-31

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "VolcanoJob"
[menu.docs]
  parent = "concepts"
  weight = 3
+++

## Introduction
Volcano job, referred to as vcjob, is a CRD type for Volcano. Different from Kubernetes Job, it provides more advanced
features such as specified scheduler / minimum member number / task definition / lifecycle management / specified queue
/ specified priority. Volcano job is designed for high performance computing such as machine learning / Big Data
application / scientific computing.

## Example
```shell
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: test-job
spec:
  minAvailable: 3
  schedulerName: volcano
  priorityClassName: high-priority
  policies:
    - event: PodEvicted
      action: RestartJob
  plugins:
    ssh: []
    env: []
    svc: []
  maxRetry: 5
  queue: default
  volumes:
    - mountPath: "/myinput"
    - mountPath: "/myoutput"
      volumeClaimName: "testvolumeclaimname"
      volumeClaim:
        accessModes: [ "ReadWriteOnce" ]
        storageClassName: "my-storage-class"
        resources:
          requests:
            storage: 1Gi
  tasks:
    - replicas: 6
      name: "default-nginx"
      template:
        metadata:
          name: web
        spec:
          containers:
            - image: nginx
              imagePullPolicy: IfNotPresent
              name: nginx
              resources:
                requests:
                  cpu: "1"
          restartPolicy: OnFailure
```
## Key Field
### schedulerName
schedulerName means which scheduler will schedule the job. The default value is Volcano. Current optional values are
"volcano" and "default".

### minAvailable
minAvailable represents the minimum number of running Pods to run the job. Only when the number of running Pods is not
less than minAvailable can the job be considered as running.

### tasks.replicas
tasks.replicas indicates the replicas number of the task.

### tasks.template
tasks.template defines the configuration of a task replicas, it's same as Pod template in Kubernetes.

### tasks.policies
tasks.policies defines the lifecycle strategy of the task.

### policies
policies is the default lifecycle strategy for all tasks when tasks.policies is not set.

### plugins
plugins indicates the plugins used by Volcano when scheduling the job.

### queue
queue means the queue the job belongs to.

### priorityClassName
priorityClassName indicates the priority of the job which is used in preemption scheduling.

### maxRetry
maxRetry indicates the max retries of the job if fails.

## Status
### pending
pending means the job is waiting for to be scheduled.

### aborting
aborting means the job is being aborted because of some outer factor.

### aborted
aborting means the job has already been aborted because of some outer factor.

### running
running indicates there are at least "minAvailable" Pods running.

### restarting
restarting means the job is restarting.

### completing
completing means there are at least "minAvailable" Pods in completing status. Job is doing some cleanup.

### completing
completing means there are at least "minAvailable" Pods in completed status. Job has finished cleaning up.

### terminating
terminating means job is in exiting process because of some internal factor. Job is waiting pods releasing resources.

### terminated
terminated means job has already exited because of some internal factor.

### failed
failed means job still cannot start after maxRetry tries.

## Usage
### tensorflow workload
Create a tensorflow workload with a ps and three workers.
```shell
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-dist-mnist
spec:
  minAvailable: 3   // there must be at least 3 pods available
  schedulerName: volcano    // scheduler specified
  plugins:
    env: []
    svc: []
  policies:
    - event: PodEvicted // restart job when pod is evicted
      action: RestartJob
  tasks:
    - replicas: 1   // replicas number specified
      name: ps
      template: // definition of ps pod
        spec:
          containers:
            - command:
                - sh
                - -c
                - |
                  PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' | sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  WORKER_HOST=`cat /etc/volcano/worker.host | sed 's/$/&:2222/g' | sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  export TF_CONFIG={\"cluster\":{\"ps\":[${PS_HOST}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"ps\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};
                  python /var/tf_dist_mnist/dist_mnist.py
              image: volcanosh/dist-mnist-tf-example:0.0.1
              name: tensorflow
              ports:
                - containerPort: 2222
                  name: tfjob-port
              resources: {}
          restartPolicy: Never
    - replicas: 2   // definition of worker pod
      name: worker
      policies:
        - event: TaskCompleted  // when tasks complete, job finishes
          action: CompleteJob
      template: // definition of worker pod
        spec:
          containers:
            - command:
                - sh
                - -c
                - |
                  PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' | sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  WORKER_HOST=`cat /etc/volcano/worker.host | sed 's/$/&:2222/g' | sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  export TF_CONFIG={\"cluster\":{\"ps\":[${PS_HOST}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"worker\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};
                  python /var/tf_dist_mnist/dist_mnist.py
              image: volcanosh/dist-mnist-tf-example:0.0.1
              name: tensorflow
              ports:
                - containerPort: 2222
                  name: tfjob-port
              resources: {}
          restartPolicy: Never
```
### argo workload
Create an argo workload with two tasks and only one work well is enough.
```shell
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
      manifest: |           // definition of volcano job
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
### Mindspore workload
Create a Mindspore workload with eight replicases and only one work well is enough.
```shell
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: mindspore-cpu
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
    - replicas: 8
      name: "pod"
      template:
        spec:
          containers:
            - command: ["/bin/bash", "-c", "python /tmp/lenet.py"]
              image: lyd911/mindspore-cpu-example:0.2.0
              imagePullPolicy: IfNotPresent
              name: mindspore-cpu-job
              resources:
                limits:
                  cpu: "1"
                requests:
                  cpu: "1"
          restartPolicy: OnFailure

```
## Note
### Frameworks Supported
Volcano support almost all mainstream computing frameworks including:

1. tensorflow
2. pytorch
3. mindspore
4. PaddlePaddle
5. spark
6. flink
7. openMPI
8. horovod
9. mxnet
10. kubeflow
11. argo
12. kubeGene

### Volcano or default-scheduler
Volcano is enhanced in batch computing comparing to default-scheduler. It's more suitable for high performance computing
such as machine learning / Big Data application / scientific computing.