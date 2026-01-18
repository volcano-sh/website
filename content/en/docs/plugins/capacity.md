+++
title = "Capacity Plugin"

date = 2025-01-21
lastmod = 2025-01-21

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Capacity"
[menu.docs]
  parent = "plugins"
  weight = 2
+++

### Capacity

#### Overview

The Capacity plugin manages queue resource allocation using a capacity-based model. It enforces queue capacity limits, guarantees minimum resource allocations, and supports hierarchical queue structures. The plugin calculates each queue's deserved resources based on its capacity, guarantee, and the cluster's total available resources.

#### Features

- **Queue Capacity Management**: Enforces queue capacity limits based on configured capability
- **Resource Guarantees**: Supports minimum resource guarantees for queues
- **Hierarchical Queues**: Supports hierarchical queue structures with parent-child relationships
- **Dynamic Resource Allocation**: Calculates deserved resources dynamically based on queue configuration
- **Resource Reclamation**: Supports resource reclamation from queues exceeding their capacity
- **Job Enqueue Control**: Validates resource availability before allowing jobs to be enqueued

#### Configuration

The Capacity plugin is configured through Queue resources. Here's an example:

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: queue-capacity-example
spec:
  weight: 1
  capability:
    cpu: "100"
    memory: "100Gi"
  guarantee:
    resource:
      cpu: "20"
      memory: "20Gi"
  deserved:
    cpu: "50"
    memory: "50Gi"
```

##### Queue Configuration Fields

- **capability**: Maximum resources the queue can consume
- **guarantee**: Minimum resources guaranteed to the queue
- **deserved**: Desired resource allocation for the queue (calculated automatically if not specified)
- **parent**: Parent queue name for hierarchical queue structures

##### Hierarchical Queue Configuration

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: root-queue
spec:
  weight: 1
  capability:
    cpu: "1000"
    memory: "1000Gi"
---
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: child-queue
spec:
  parent: root-queue
  weight: 1
  capability:
    cpu: "500"
    memory: "500Gi"
  guarantee:
    resource:
      cpu: "100"
      memory: "100Gi"
```

#### How It Works

1. **Capacity Calculation**: The plugin calculates each queue's real capacity by considering the total cluster resources, total guarantees, and the queue's own guarantee and capability.
2. **Deserved Resources**: Deserved resources are calculated based on the queue's real capacity and configured deserved values.
3. **Job Enqueue**: Before a job is enqueued, the plugin validates that the queue has sufficient capacity to accommodate the job's minimum resource requirements.
4. **Resource Allocation**: During scheduling, the plugin ensures that queues don't exceed their allocated capacity.
5. **Reclamation**: Queues that exceed their deserved resources can have tasks reclaimed to make room for other queues.

#### Scenario

The Capacity plugin is suitable for:

- **Resource Quota Management**: Enforcing resource limits per queue or department
- **Multi-tenant Clusters**: Isolating resources between different tenants or teams
- **Resource Reservations**: Guaranteeing minimum resources for critical workloads
- **Hierarchical Organizations**: Organizations with nested resource allocation structures

#### Examples

##### Example 1: Basic Capacity Management

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: team-a
spec:
  weight: 1
  capability:
    cpu: "200"
    memory: "200Gi"
    nvidia.com/gpu: "8"
  guarantee:
    resource:
      cpu: "50"
      memory: "50Gi"
      nvidia.com/gpu: "2"
```

##### Example 2: Hierarchical Capacity

```yaml
# Root queue
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: root
spec:
  weight: 1
  capability:
    cpu: "1000"
    memory: "1000Gi"

---
# Development queue
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: dev
spec:
  parent: root
  weight: 1
  capability:
    cpu: "300"
    memory: "300Gi"

---
# Production queue
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: prod
spec:
  parent: root
  weight: 1
  capability:
    cpu: "500"
    memory: "500Gi"
  guarantee:
    resource:
      cpu: "200"
      memory: "200Gi"
```

#### Notes

- When hierarchical queues are enabled, only leaf queues can allocate tasks
- Queues without a capacity configuration are treated as best-effort queues
- The plugin automatically calculates real capacity considering parent queue constraints
- Resource guarantees cannot exceed queue capabilities
