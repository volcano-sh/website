+++
title = "Integrating with Argo Workflows"
linktitle = "Argo Workflows"
date = 2026-02-11
publishdate = 2026-02-11
lastmod = 2026-02-11
draft = false
toc = true
type = "docs"

[menu.docs]
  parent = "tutorial-series"
  weight = 50
+++

This tutorial shows how to use Volcano as the scheduler for Argo Workflows to gain advanced batch scheduling features for your CI/CD and data processing pipelines.

## Background

Argo Workflows is a popular cloud-native workflow engine for orchestrating parallel jobs on Kubernetes. While Argo excels at managing dependencies and execution flow, it often relies on the default Kubernetes scheduler for individual steps.

By integrating Volcano as the scheduler for Argo Workflows, you unlock advanced batch scheduling capabilities:

- **Bin-packing**: Optimize resource utilization by packing tasks onto the fewest number of nodes.
- **Fair Sharing**: Ensure that workflow steps across different tenants or namespaces are scheduled fairly according to configured weights.
- **Gang Scheduling**: For workflows involving multiple parallel pods that must start together, Volcano ensures they are managed as a single unit (PodGroup).

## Scenario

A common workflow scenario involves a "Main" entrypoint that triggers one or more "Task" steps. In this tutorial, you will configure a simple Argo Workflow to use Volcano for its underlying pod scheduling.

## Prerequisites

Before you begin, ensure you have:
- A Kubernetes cluster with Volcano installed.
- [Argo Workflows](https://argoproj.github.io/argo-workflows/installation/) installed in your cluster.

## Deployment Step-by-Step

### 1. Create the Workflow Manifest

You can configure Argo to use Volcano at the individual template level using the `schedulerName` field. Create a file named `volcano-workflow.yaml`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: volcano-workflow-
spec:
  entrypoint: main
  templates:
    - name: main
      steps:
        - - name: step1
            template: whalesay
    - name: whalesay
      container:
        image: docker/whalesay
        command: [cowsay]
        args: ["Hello from Argo + Volcano!"]
      schedulerName: volcano # Explicitly tell Argo to use Volcano
```

### 2. Apply the Workflow

Run the following command to submit your workflow:

```bash
argo submit volcano-workflow.yaml
```

## Advanced: Deploying VolcanoJobs from Argo

For tasks that require native Volcano features like `minAvailable` or specific `plugins`, you can submit a `VolcanoJob` directly as a resource template:

```yaml
    - name: volcano-job-step
      resource:
        action: create
        successCondition: status.state == Completed # Wait for the Job to finish
        manifest: |
          apiVersion: batch.volcano.sh/v1alpha1
          kind: Job
          metadata:
            generateName: argo-step-
          spec:
            minAvailable: 1
            schedulerName: volcano
            tasks:
              - name: task-1
                replicas: 1
                template:
                  spec:
                    containers:
                    - name: main
                      image: alpine
                      command: ["echo", "running inside volcano job"]
```

## Verification

### Check Workflow Status

Monitor the progress of your workflow using the Argo CLI:

```bash
argo get @latest
```

### Verify the Scheduler

Check the details of any pod created by the workflow to ensure it was handled by Volcano:

```bash
kubectl get pod <pod-name> -o jsonpath='{.spec.schedulerName}'
```

The output should be `volcano`.

## Notes

- **Global Configuration**: You can make Volcano the default scheduler for *all* Argo Workflows by updating the `workflow-controller-configmap` with `containerRuntimeExecutor: k8sapi` and setting the default scheduler name.
- **ServiceAccount Permissions**: If using the `resource` template to create `VolcanoJobs`, ensure the ServiceAccount used by the Argo controller has RBAC permissions to `create`, `get`, and `watch` resources in the `batch.volcano.sh` group.
- **PodGroups**: When a pod is scheduled by Volcano, a `PodGroup` is automatically created. You can inspect it with `kubectl get podgroups`.


## Tutorial Series

- **[Distributed TensorFlow](/en/docs/tutorial-tensorflow/)**: Orchestrate high-performance ML training jobs with parameter servers and workers.
- **[Apache Spark](/en/docs/tutorial-spark/)**: Prevent resource starvation in big data processing pipelines.
- **[GPU Resource Management](/en/docs/tutorial-gpu-scheduling/)**: Maximize hardware efficiency through fractional sharing (vGPU) and isolation.
- **[Multi-tenancy](/en/docs/tutorial-multi-tenancy/)**: Configure fair share scheduling and hierarchical queues for different teams.

Back to basics? Check out our **[Quick Start](/en/docs/tutorials/)** 