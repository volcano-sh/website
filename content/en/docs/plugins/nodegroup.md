+++
title = "Node Group Plugin"

date = 2025-01-21
lastmod = 2025-01-21

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Node Group"
[menu.plugins]
  weight = 5
+++

### Node Group

#### Overview

The Node Group plugin provides queue-level node group affinity and anti-affinity capabilities. It allows queues to specify which node groups their jobs should run on, enabling better resource isolation and workload distribution. The plugin supports both required and preferred node group affinity/anti-affinity rules, and can inherit affinity rules from parent queues in hierarchical queue structures.

#### Features

- **Queue-level Affinity**: Define node group affinity rules at the queue level
- **Required and Preferred Rules**: Support for both required (hard) and preferred (soft) affinity constraints
- **Anti-affinity Support**: Support for both affinity and anti-affinity rules
- **Hierarchical Inheritance**: Inherit affinity rules from parent queues when hierarchical queues are enabled
- **Node Group Labeling**: Uses node labels to identify node groups
- **Strict Mode**: Configurable strict mode for affinity enforcement

#### Configuration

The Node Group plugin can be configured with the following arguments:

```yaml
actions: "reclaim, allocate, backfill, preempt"
tiers:
- plugins:
  - name: nodegroup
    arguments:
      strict: true
```

##### Configuration Parameters

- **strict** (bool): Enable strict mode. In strict mode, nodes without node group labels are rejected if the queue has affinity rules, and nodes with node group labels are rejected if the queue has no affinity rules. Default is `true`.

#### Node Group Labeling

Nodes must be labeled with the node group name using the `volcano.sh/nodegroup-name` label:

```yaml
apiVersion: v1
kind: Node
metadata:
  name: node-1
  labels:
    volcano.sh/nodegroup-name: "group-a"
spec:
  # node spec
```

#### Queue Configuration

Queues can specify node group affinity rules in their spec:

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: queue-example
spec:
  weight: 1
  affinity:
    nodeGroupAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - "group-a"
      - "group-b"
      preferredDuringSchedulingIgnoredDuringExecution:
      - "group-c"
    nodeGroupAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - "group-d"
      preferredDuringSchedulingIgnoredDuringExecution:
      - "group-e"
```

##### Queue Affinity Fields

- **nodeGroupAffinity.requiredDuringSchedulingIgnoredDuringExecution**: Required node groups. Tasks must be scheduled on nodes in one of these groups.
- **nodeGroupAffinity.preferredDuringSchedulingIgnoredDuringExecution**: Preferred node groups. Tasks prefer to be scheduled on nodes in these groups.
- **nodeGroupAntiAffinity.requiredDuringSchedulingIgnoredDuringExecution**: Required anti-affinity groups. Tasks must not be scheduled on nodes in these groups.
- **nodeGroupAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution**: Preferred anti-affinity groups. Tasks prefer not to be scheduled on nodes in these groups.

#### Hierarchical Queue Support

When hierarchical queues are enabled, queues without explicit affinity rules inherit affinity rules from their nearest ancestor queue that has affinity rules defined:

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: parent-queue
spec:
  weight: 1
  affinity:
    nodeGroupAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - "group-a"
---
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: child-queue
spec:
  parent: parent-queue
  weight: 1
  # Child queue inherits affinity rules from parent-queue
```

#### Scoring

The plugin provides node scoring based on affinity rules:

- **Required Affinity**: +100 points
- **Preferred Affinity**: +50 points
- **Preferred Anti-affinity**: -1 points

#### Scenario

The Node Group plugin is suitable for:

- **Resource Isolation**: Isolating workloads to specific node groups for security or compliance reasons
- **Workload Distribution**: Distributing workloads across different node groups
- **Hardware-specific Scheduling**: Scheduling workloads on nodes with specific hardware characteristics
- **Multi-tenant Isolation**: Ensuring tenant workloads run on designated node groups
- **Geographic Distribution**: Scheduling workloads based on geographic location of node groups

#### Examples

##### Example 1: Required Affinity

Configure a queue to require nodes from specific groups:

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: gpu-queue
spec:
  weight: 1
  affinity:
    nodeGroupAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - "gpu-group-1"
      - "gpu-group-2"
```

##### Example 2: Preferred Affinity

Configure a queue to prefer nodes from specific groups:

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: cpu-queue
spec:
  weight: 1
  affinity:
    nodeGroupAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - "cpu-group-1"
      - "cpu-group-2"
```

##### Example 3: Anti-affinity

Configure a queue to avoid certain node groups:

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: production-queue
spec:
  weight: 1
  affinity:
    nodeGroupAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - "development-group"
      preferredDuringSchedulingIgnoredDuringExecution:
      - "test-group"
```

##### Example 4: Combined Affinity and Anti-affinity

Configure a queue with both affinity and anti-affinity rules:

```yaml
apiVersion: scheduling.volcano.sh/v1beta1
kind: Queue
metadata:
  name: mixed-queue
spec:
  weight: 1
  affinity:
    nodeGroupAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - "group-a"
      preferredDuringSchedulingIgnoredDuringExecution:
      - "group-b"
    nodeGroupAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - "group-c"
      preferredDuringSchedulingIgnoredDuringExecution:
      - "group-d"
```

##### Example 5: Non-strict Mode

Configure the plugin in non-strict mode:

```yaml
- name: nodegroup
  arguments:
    strict: false
```

In non-strict mode, nodes without node group labels are allowed if the queue has no affinity rules.

#### Notes

- Nodes must be labeled with `volcano.sh/nodegroup-name` to participate in node group scheduling
- Required affinity rules are hard constraints and must be satisfied for scheduling
- Preferred affinity rules are soft constraints and affect scoring
- Anti-affinity rules take precedence over affinity rules
- In hierarchical queues, child queues inherit affinity rules from their nearest ancestor with affinity rules
- When hierarchical queues are enabled, set `enableHierarchy: true` in the plugin configuration
