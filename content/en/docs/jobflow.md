+++
title = "JobFlow"

date = 2025-06-25
lastmod = 2025-06-25

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
toc_depth = 5
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
[menu.docs]
  parent = "features"
  weight = 8
+++

# Background

In today's cloud computing environment, the complexity and scale of batch jobs continue to grow, especially in the fields of artificial intelligence, big data, and high-performance computing (HPC). These jobs often require long running times (days or weeks) and have complex dependencies among them. Traditional job management approaches require users to manually orchestrate multiple VCJobs or rely on third-party job orchestration platforms, which not only increases management complexity but also reduces resource utilization efficiency.

Existing workflow engines, while capable of handling general workflows, are not specifically designed for batch job workloads and cannot fully understand or optimize the characteristics of VCJobs. Users often struggle to obtain detailed information about job running status, execution progress, and resource utilization, which presents challenges for managing complex workloads.

To address these issues, we propose JobFlow, a cloud-native orchestration solution specifically designed for VCJobs. JobFlow introduces two core concepts: JobTemplate and JobFlow, allowing users to define jobs in a declarative manner and orchestrate them through rich control primitives (such as sequential execution, parallel execution, conditional branching, loops, etc.). This approach not only simplifies the management of complex jobs but also improves resource utilization and accelerates workload execution.

Unlike general-purpose workflow engines, JobFlow deeply understands the internal mechanisms of VCJobs and can provide more detailed job insights, including running status, timestamps, next execution plans, and key metrics such as failure rates. This enables users to better monitor and optimize their workloads, ensuring critical tasks execute as expected.

# Features

This functionality extends support for VCJobs, introducing capabilities for sequential startup and dependency management. Users can configure VCJobs to start in a specific order, or set up a VCJob to wait for other VCJobs to complete before executing, enhancing the flexibility of workflow control.

The newly added JobFlow and JobTemplate Custom Resource Definitions (CRDs) provide more advanced job management capabilities. Users can create reusable job templates and complex job workflows through these resources, and can view the operational status of JobFlows in real-time.

# Usage

To use JobFlow's functionality, we first need to understand two key concepts: JobTemplate and JobFlow. An example of how they work together can be found at https://github.com/volcano-sh/volcano/tree/master/example/jobflow.

## JobTemplate

JobTemplate (jt) is a template definition for Volcano jobs (vcjob). It won't be directly processed or executed, but instead waits to be referenced by a JobFlow.

Here's a simple example of a JobTemplate:

```
apiVersion: flow.volcano.sh/v1alpha1
kind: JobTemplate
metadata:
  name: a
spec:
  minAvailable: 1
  schedulerName: volcano
  queue: default
  tasks:
    - replicas: 1
      name: "default-nginx"
      template:
        metadata:
          name: web
        spec:
          containers:
            - image: nginx:1.14.2
              command:
                - sh
                - -c
                - sleep 10s
              imagePullPolicy: IfNotPresent
              name: nginx
              resources:
                requests:
                  cpu: "1"
          restartPolicy: OnFailure
```

This JobTemplate defines a task template that uses the default queue, defines a task named default-nginx, uses the nginx:1.14.2 image, and executes the command `sh -c sleep 10s`.

## JobFlow

JobFlow (jf) defines the workflow and dependencies for a group of jobs. It can reference multiple JobTemplates and create and execute Volcano jobs according to specified dependencies. JobFlow supports various dependency types (such as HTTP, TCP, task status, etc.), and can modify referenced JobTemplates through a patch mechanism.

Here's a simple example of a JobFlow:

```
apiVersion: flow.volcano.sh/v1alpha1
kind: JobFlow
metadata:
  name: test
  namespace: default
spec:
  jobRetainPolicy: delete   # After jobflow runs, keep the generated job. Otherwise, delete it.
  flows:
    - name: a
    - name: b
      dependsOn:
        targets: ['a']
    - name: c
      dependsOn:
        targets: ['b']
    - name: d
      dependsOn:
        targets: ['b']
    - name: e
      dependsOn:
        targets: ['c','d']
```

This YAML file defines a JobFlow resource named `test` created in the `default` namespace in Kubernetes. This JobFlow orchestrates the execution of five jobs (a, b, c, d, e) and defines the dependencies between them.

`jobRetainPolicy: delete` indicates that when the JobFlow execution is complete, all generated Volcano jobs will be deleted and not retained in the system.

The dependencies represented in this YAML are as follows:

- Job `a` has no dependencies and will execute first
- Job `b` depends on `a` and will only start after `a` successfully completes
- Job `c` depends on `b` and needs to wait for `b` to complete
- Job `d` also depends on `b` and needs to wait for `b` to complete
- Job `e` depends on both `c` and `d` and will only execute after both `c` and `d` are complete

# Architecture

In its architectural design, JobFlow still uses the Kubernetes Operator approach with CRDs and Controllers, as shown in the diagram.

In the diagram, the blue components are part of Kubernetes itself, the orange components are existing Volcano definitions, and the red components are new JobFlow definitions.

![img](https://github.com/volcano-sh/volcano/raw/master/docs/design/images/jobflow-2.png)

## Workflow

The interaction between JobFlow and JobTemplate Controllers and resources is shown in the diagram.

![img](https://github.com/volcano-sh/volcano/raw/master/docs/design/images/jobflow-3.png)

The workflow creation process can be described as follows:

1. Users create JobFlow and JobTemplate resources.
2. JobFlowController creates corresponding VcJobs based on the JobFlow configuration, using JobTemplates as templates and following the flow dependency rules.
3. After VcJobs are created, VcJobController creates corresponding Pods and PodGroups based on the VcJob configuration.
4. When Pods and PodGroups are created, vc-scheduler retrieves Pod/PodGroup and node information from kube-apiserver.
5. After obtaining this information, vc-scheduler selects appropriate nodes for each Pod according to its configured scheduling policies.
6. After nodes are assigned to Pods, kubelet retrieves Pod configurations from kube-apiserver and starts the corresponding containers.

For more detailed information, you can refer to the controller's detailed logic in /volcano/pkg/controllers/jobflow/jobflow_controller.go