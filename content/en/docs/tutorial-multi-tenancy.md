+++
title = "Multi-tenant Queue Configuration"
linktitle = "Multi-tenancy"
date = 2026-02-11
publishdate = 2026-02-11
lastmod = 2026-02-11
draft = false
toc = true
type = "docs"

[menu.docs]
  parent = "tutorial-series"
  weight = 40
+++

This tutorial demonstrates how to set up a multi-tenant environment using Volcano's hierarchical queues, enabling fair resource sharing between different teams or departments.

## Background

In multi-tenant clusters, different teams or departments share the same underlying resources. Without proper management, one team's high-volume workload can monopolize the cluster, causing "starvation" for other users.

Volcano's **Hierarchical Queues** provide a sophisticated mechanism to handle these scenarios by allowing you to:

- **Guarantees and Limits**: Set minimum resource entitlements (`deserved`) to ensure every team has access to capacity.
- **Fair Sharing**: Dynamically re-allocate unused resources between teams based on their configured weights.
- **Resource Reclamation**: Automatically reclaim resources from teams over-using their share when other teams have pending jobs.

## Scenario

Consider a "Research" department with two sub-teams: **Team A** and **Team B**. You want to ensure that even if Team A submits a massive batch of jobs, Team B is guaranteed at least 50% of the department's allocated capacity when they need it.

In this tutorial, you will build a queue hierarchy and deploy a job to verify that resources are allocated according to the team's entitlements.

## Prerequisites

Before you begin, ensure you have:
- A Kubernetes cluster with Volcano installed.
- Admin permissions to create `Queue` resources.

## Deployment Step-by-Step

### 1. Create the Queue Hierarchy

Create a file named `team-queues.yaml` to define a parent-child relationship between the department and the teams:

```yaml
# 1. Define the parent Research Queue
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: research-parent
spec:
  weight: 1
  capability:
    cpu: 10
    memory: 20Gi
---
# 2. Define Team A's Queue as a child
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: team-a-queue
spec:
  parent: research-parent
  weight: 1
  deserved: # Guaranteed capacity for Team A
    cpu: 5
    memory: 10Gi
---
# 3. Define Team B's Queue as a child
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: team-b-queue
spec:
  parent: research-parent
  weight: 1
  deserved: # Guaranteed capacity for Team B
    cpu: 5
    memory: 10Gi
```

### 2. Apply the Queues

Run the following command to establish the hierarchy:

```bash
kubectl apply -f team-queues.yaml
```

### 3. Deploy a Job to a Specific Queue

To use a queue, specify its name in the `spec.queue` field of your Volcano Job:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: team-a-job
spec:
  queue: team-a-queue # Submit specifically to Team A's pool
  tasks:
    - name: team-a-task
      replicas: 2
      template:
        spec:
          containers:
            - image: busybox
              name: worker
              command: ["sleep", "3600"]
              resources:
                requests:
                  cpu: 100m
```

## Verification

### Check Queue Status

Monitor how resources are allocated and redistributed across your hierarchy:

```bash
kubectl get queues research-parent -o yaml
kubectl get queues team-a-queue -o yaml
```

### Observe Resource Sharing

If Team B has no active jobs, Team A can "borrow" resources up to the parent's `capability` (10 CPU). However, the moment Team B submits a job, Volcano's scheduler will identify the over usage and trigger **resource reclamation** from Team A to satisfy Team B's `deserved` entitlement.

## Notes

- **Leaf Queues**: In Volcano, you should always submit jobs to **leaf queues** (the bottom level of the hierarchy).
- **Entitlement Sums**: Ensure the sum of `deserved` resources of all child queues does not exceed the `capability` of their parent.
- **Queue State**: By default, new queues are created in the `Open` state. If a queue is `Closed` (e.g., during maintenance), no new jobs will be accepted.


## Tutorial Series

- **[Distributed TensorFlow](/en/docs/tutorial-tensorflow/)**: Orchestrate high-performance ML training jobs with parameter servers and workers.
- **[Apache Spark](/en/docs/tutorial-spark/)**: Prevent resource starvation in big data processing pipelines.
- **[GPU Resource Management](/en/docs/tutorial-gpu-scheduling/)**: Maximize hardware efficiency through fractional sharing (vGPU) and isolation.
- **[Argo Workflows](/en/docs/tutorial-argo-workflows/)**: Integrate Volcano's advanced scheduling into your CI/CD and data pipelines.

Back to basics? Check out our **[Quick Start](/en/docs/tutorials/)** 