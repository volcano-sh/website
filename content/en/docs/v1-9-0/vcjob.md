+++
title = "VolcanoJob"

date = 2024-05-21
lastmod = 2024-05-21

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "VolcanoJob"
[menu.v1-9-0]
  parent = "concepts"
  weight = 3
+++

## Introduction
VolcanoJob, referred to as vcjob, is a CRD object for Volcano. Different from a Kubernetes job, it provides more advanced features such as specified scheduler, minimum number of members, task definition, lifecycle management, specific queue, and specific priority. VolcanoJob is ideal for high performance computing scenarios such as machine learning, big data applications, and scientific computing.

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
## Key Fields
### schedulerName
`schedulerName` indicates the scheduler that will schedule the job. Currently, the value can be `volcano` or `default-scheduler, with `volcano` selected by default.

### minAvailable
`minAvailable` represents the minimum number of running pods required to run the job. Only when the number of running pods is not less than `minAvailable` can the job be considered as `running`. 

### volumes
`volumes` indicates the configuration of the volume to which the job is mounted. It complies with the volume configuration requirements in Kubernetes.

### tasks.replicas
`tasks.replicas` indicates the number of pod replicas in a task.

### tasks.template
`tasks.template` defines the pod configuration of a task. It is the same as a pod template in Kubernetes.

### tasks.policies
`tasks.policies` defines the lifecycle policy of a task.

### policies
`policies` defines the default lifecycle policy for all tasks when `tasks.policies` is not set.
  
### plugins
`plugins` indicates the plugins used by Volcano when the job is scheduled.

### queue
`queue` indicates the queue to which the job belongs. 

### priorityClassName
`priorityClassName` indicates the priority of the job. It is used in preemptive scheduling.

### maxRetry
`maxRetry` indicates the maximum number of retries allowed by the job.

## Status
### pending
`pending` indicates that the job is waiting to be scheduled.

### aborting
`aborting` indicates that the job is being aborted because of some external factors.

### aborted
`aborted` indicates that the job has already been aborted because of some external factors.

### running
`running` indicates that there are at least `minAvailable` pods running.

### restarting
`restarting` indicates that the job is restarting.

### completing
`completing` indicates that there are at least `minAvailable` pods in the `completing` state. The job is doing cleanup. 

### completed
`completed` indicates that there are at least `minAvailable` pods in the `completed` state. The job has completed cleanup.

### terminating
`terminating` indicates that the job is being terminated because of some internal factors. The job is waiting pods to release resources.

### terminated
`terminated` indicates that the job has already been terminated because of some internal factors.

### failed
`failed` indicates that the job still cannot start after `maxRetry` tries. 

## Usage
### TensorFlow Workload
Create a TensorFlow workload with a ps and three workers.
```shell
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-dist-mnist
spec:
  minAvailable: 3   // There must be at least 3 available pods.
  schedulerName: volcano    // Scheduler specified
  plugins:
    env: []
    svc: []
  policies: 
    - event: PodEvicted // Restart the job when a pod is evicted.
      action: RestartJob
  tasks:
    - replicas: 1   // One ps pod specified
      name: ps
      template: // Definition of the ps pod
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
    - replicas: 2   // Two worker pods specified
      name: worker
      policies:
        - event: TaskCompleted  // The job will be marked as completed when two worker pods finish tasks.
          action: CompleteJob
      template: // Definition of worker pods
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
### Argo Workload
Create an argo workload with two pod replicas. The workload is considered normal when at least one pod replica works normally.
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
      manifest: |           // Definition of the VolcanoJob
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
### MindSpore Workload
Create a MindSpore workload with eight pod replicas. The workload is considered normal when at least one pod replica works normally.
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
### Supported Frameworks
Volcano supports almost all mainstream computing frameworks including:

1. [Spark](https://spark.apache.org/)
2. [TensorFlow](https://www.tensorflow.org/)
3. [PyTorch](https://pytorch.org/)
4. [Flink](https://flink.apache.org/)
5. [Argo](https://argoproj.github.io/)
6. [MindSpore](https://www.mindspore.cn/en)
7. [PaddlePaddle](https://www.paddlepaddle.org.cn/)
8. [Open MPI](https://www.open-mpi.org/)
9. [Horovod](https://horovod.readthedocs.io/)
10. [MXNet](https://mxnet.apache.org/)
11. [Kubeflow](https://www.kubeflow.org/)
12. [KubeGene](https://github.com/volcano-sh/kubegene)
13. [Cromwell](https://cromwell.readthedocs.io/)

### volcano or default-scheduler
Volcano has been enhanced in batch computing when compared with default-scheduler. It is ideal for high performance computing scenarios such as machine learning, big data applications, and scientific computing.