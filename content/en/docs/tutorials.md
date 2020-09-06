+++
title =  "Tutorials"


date = 2019-01-28
lastmod = 2020-08-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Tutorials"
[menu.docs]
  parent = "getting-started"
  weight = 2
+++

Here is a simple example how to use Volcano with CRD resources.

### Step: 1 
Create a custom Queue named "test"
```
# kubectl create -f queue.yaml
// queue.yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: test
spec:
  weight: 1
  reclaimable: false
  capability:
    cpu: 2
```

### Step: 2 
Create a Volcano job named "job-1"
```
# kubectl create -f vcjob.yaml
// vcjob.yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: job-1
spec:
  minAvailable: 1
  schedulerName: volcano
  queue: test
  policies:
    - event: PodEvicted
      action: RestartJob
  tasks:
    - replicas: 1
      name: nginx
      policies:
      - event: TaskCompleted
        action: CompleteJob
      template:
        spec:
          containers:
            - command:
              - sleep
              - 10m
              image: nginx:latest
              name: nginx
              resources:
                requests:
                  cpu: 1
                limits:
                  cpu: 1
```

### Step: 3 
Check the status of custom job
```
# kubectl get vcjob job-1 -oyaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  creationTimestamp: "2020-01-18T12:59:37Z"
  generation: 1
  managedFields:
  - apiVersion: batch.volcano.sh/v1alpha1
    fieldsType: FieldsV1
    fieldsV1:
      f:spec:
        .: {}
        f:minAvailable: {}
        f:policies: {}
        f:queue: {}
        f:schedulerName: {}
    manager: kubectl
    operation: Update
    time: "2020-08-18T12:59:37Z"
  - apiVersion: batch.volcano.sh/v1alpha1
    fieldsType: FieldsV1
    fieldsV1:
      f:spec:
        f:tasks: {}
      f:status:
        .: {}
        f:minAvailable: {}
        f:running: {}
        f:state:
          .: {}
          f:lastTransitionTime: {}
          f:phase: {}
    manager: vc-controller-manager
    operation: Update
    time: "2020-08-18T12:59:45Z"
  name: job-1
  namespace: default
  resourceVersion: "850500"
  selfLink: /apis/batch.volcano.sh/v1alpha1/namespaces/default/jobs/job-1
  uid: 215409ec-7337-4abf-8bea-e6419defd688
spec:
  minAvailable: 1
  policies:
  - action: RestartJob
    event: PodEvicted
  queue: test
  schedulerName: volcano
  tasks:
  - name: nginx
    policies:
    - action: CompleteJob
      event: TaskCompleted
    replicas: 1
    template:
      spec:
        containers:
        - command:
          - sleep
          - 10m
          image: nginx:latest
          name: nginx
          resources:
            limits:
              cpu: 1
            requests:
              cpu: 1
status:
  minAvailable: 1
  running: 1
  state:
    lastTransitionTime: "2020-08-18T12:59:45Z"
    phase: Running
```

### Step: 4 
Check the PodGroup status for "job-1"
```
# kubectl get podgroup job-1 -oyaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: PodGroup
metadata:
  creationTimestamp: "2020-08-18T12:59:37Z"
  generation: 5
  managedFields:
  - apiVersion: scheduling.volcano.sh/v1beta1
    fieldsType: FieldsV1
    fieldsV1:
      f:metadata:
        f:ownerReferences:
          .: {}
          k:{"uid":"215409ec-7337-4abf-8bea-e6419defd688"}:
            .: {}
            f:apiVersion: {}
            f:blockOwnerDeletion: {}
            f:controller: {}
            f:kind: {}
            f:name: {}
            f:uid: {}
      f:spec:
        .: {}
        f:minMember: {}
        f:minResources:
          .: {}
          f:cpu: {}
        f:queue: {}
      f:status: {}
    manager: vc-controller-manager
    operation: Update
    time: "2020-08-18T12:59:37Z"
  - apiVersion: scheduling.volcano.sh/v1beta1
    fieldsType: FieldsV1
    fieldsV1:
      f:status:
        f:conditions: {}
        f:phase: {}
        f:running: {}
    manager: vc-scheduler
    operation: Update
    time: "2020-08-18T12:59:45Z"
  name: job-1
  namespace: default
  ownerReferences:
  - apiVersion: batch.volcano.sh/v1alpha1
    blockOwnerDeletion: true
    controller: true
    kind: Job
    name: job-1
    uid: 215409ec-7337-4abf-8bea-e6419defd688
  resourceVersion: "850501"
  selfLink: /apis/scheduling.volcano.sh/v1beta1/namespaces/default/podgroups/job-1
  uid: ea5b4f87-b750-440b-a41a-5c9944a7ae43
spec:
  minMember: 1
  minResources:
    cpu: "1"
  queue: test
status:
  conditions:
  - lastTransitionTime: "2020-08-18T12:59:38Z"
    message: '1/0 tasks in gang unschedulable: pod group is not ready, 1 minAvailable.'
    reason: NotEnoughResources
    status: "True"
    transitionID: 606145d1-660f-4e01-850d-ed556cebc098
    type: Unschedulable
  - lastTransitionTime: "2020-08-18T12:59:45Z"
    reason: tasks in gang are ready to be scheduled
    status: "True"
    transitionID: 57e6ba9e-55cc-47ce-a37e-d8bddd99d54b
    type: Scheduled
  phase: Running
  running: 1
```

### Step: 5 
Check status of Queue "test"
```
# kubectl get queue test -oyaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  creationTimestamp: "2020-08-18T12:59:30Z"
  generation: 1
  managedFields:
  - apiVersion: scheduling.volcano.sh/v1beta1
    fieldsType: FieldsV1
    fieldsV1:
      f:spec:
        .: {}
        f:capability: {}
        f:reclaimable: {}
        f:weight: {}
    manager: kubectl
    operation: Update
    time: "2020-08-18T12:59:30Z"
  - apiVersion: scheduling.volcano.sh/v1beta1
    fieldsType: FieldsV1
    fieldsV1:
      f:spec:
        f:capability:
          f:cpu: {}
      f:status:
        .: {}
        f:running: {}
        f:state: {}
    manager: vc-controller-manager
    operation: Update
    time: "2020-08-18T12:59:39Z"
  name: test
  resourceVersion: "850474"
  selfLink: /apis/scheduling.volcano.sh/v1beta1/queues/test
  uid: b9c9ee54-5ef8-4784-9bec-7a665acb1fde
spec:
  capability:
    cpu: 2
  reclaimable: false
  weight: 1
status:
  running: 1
  state: Open
```