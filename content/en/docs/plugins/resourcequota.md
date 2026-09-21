+++
title = "Resource Quota Plugin"

date = 2025-01-21
lastmod = 2025-01-21

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Resource Quota"
[menu.plugins]
  weight = 7
+++

### Resource Quota

#### Overview

The Resource Quota plugin enforces Kubernetes ResourceQuota constraints during job enqueue. It ensures that jobs can only be enqueued if their minimum resource requirements do not exceed the available quota in their namespace. The plugin integrates with Kubernetes ResourceQuota objects to provide namespace-level resource limits and isolation.

#### Features

- **ResourceQuota Enforcement**: Enforces Kubernetes ResourceQuota constraints during job enqueue
- **Namespace-level Isolation**: Provides resource isolation at the namespace level
- **Pending Resource Tracking**: Tracks pending resources to prevent over-allocation
- **Event Recording**: Records PodGroup events when quota limits are exceeded
- **MinResources Validation**: Validates jobs against their minimum resource requirements

#### Configuration

The Resource Quota plugin requires no special configuration. It automatically works with existing Kubernetes ResourceQuota objects:

```yaml
actions: "enqueue, allocate, backfill"
tiers:
- plugins:
  - name: resourcequota
```

#### How It Works

1. **Job Enqueue**: When a job is enqueued, the plugin checks if the job's minimum resource requirements fit within the namespace's ResourceQuota.
2. **Quota Validation**: For each ResourceQuota in the namespace, the plugin:
   - Checks if the job's minimum resources plus already used resources plus pending resources exceed the quota hard limits
   - If quota is exceeded, the job is rejected from enqueue
3. **Pending Resource Tracking**: The plugin tracks pending resources (jobs that have been accepted for enqueue but not yet allocated) to prevent over-allocation.
4. **Event Recording**: When a job is rejected due to quota limits, the plugin records a PodGroup event with details about the insufficient resources.

#### ResourceQuota Configuration

ResourceQuota objects must be created in the target namespace:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: default
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 200Gi
    requests.nvidia.com/gpu: "8"
    limits.cpu: "200"
    limits.memory: 400Gi
    limits.nvidia.com/gpu: "16"
    pods: "50"
```

#### Job Configuration

Jobs must specify minimum resources for the quota check to work:

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: example-job
  namespace: default
spec:
  minAvailable: 3
  schedulerName: volcano
  queue: default
  minResources:
    requests:
      cpu: "6"
      memory: 12Gi
      nvidia.com/gpu: "1"
  tasks:
    - replicas: 3
      name: "task"
      template:
        spec:
          containers:
          - name: container
            resources:
              requests:
                cpu: "2"
                memory: 4Gi
                nvidia.com/gpu: "1"
              limits:
                cpu: "4"
                memory: 8Gi
                nvidia.com/gpu: "1"
```

#### Scenario

The Resource Quota plugin is suitable for:

- **Multi-tenant Clusters**: Enforcing resource limits per namespace/tenant
- **Resource Isolation**: Preventing one namespace from consuming all cluster resources
- **Cost Control**: Limiting resource consumption to control costs
- **Capacity Planning**: Ensuring resource allocation stays within planned capacity
- **Fair Resource Sharing**: Ensuring fair distribution of resources across namespaces

#### Examples

##### Example 1: Basic ResourceQuota

Create a ResourceQuota to limit CPU and memory:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-a-quota
  namespace: team-a
spec:
  hard:
    requests.cpu: "50"
    requests.memory: 100Gi
    limits.cpu: "100"
    limits.memory: 200Gi
    pods: "20"
```

##### Example 2: GPU ResourceQuota

Create a ResourceQuota with GPU limits:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-quota
  namespace: ml-team
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 200Gi
    requests.nvidia.com/gpu: "16"
    limits.cpu: "200"
    limits.memory: 400Gi
    limits.nvidia.com/gpu: "32"
```

##### Example 3: Multiple ResourceQuotas

A namespace can have multiple ResourceQuotas:

```yaml
# CPU and memory quota
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: default
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 200Gi

---
# GPU quota
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-quota
  namespace: default
spec:
  hard:
    requests.nvidia.com/gpu: "8"
```

##### Example 4: Pod Limits

Create a ResourceQuota that limits the number of pods:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: pod-limit-quota
  namespace: default
spec:
  hard:
    pods: "100"
```

#### Notes

- ResourceQuota objects must exist in the namespace before jobs are enqueued
- Jobs must specify `minResources` for the quota check to work
- The plugin checks quota during job enqueue, not during task allocation
- Pending resources are tracked to prevent over-allocation
- If a namespace has no ResourceQuota, jobs can be enqueued without quota checks
- The plugin supports all resource types supported by Kubernetes ResourceQuota
- ResourceQuota scope constraints are not currently supported
- The plugin integrates with Volcano's job enqueue mechanism to provide early quota validation
