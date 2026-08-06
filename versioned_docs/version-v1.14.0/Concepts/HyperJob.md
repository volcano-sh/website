---
title: "HyperJob"
sidebar_position: 5
---

## Introduction
HyperJob is a high-level orchestration abstraction built on top of Volcano Job. It is designed to compose multiple Volcano Job templates and extend distributed training capabilities beyond single-cluster boundaries. 

As large language models (LLMs) and foundational AI models scale, training requirements often exceed single-cluster resource limits. HyperJob addresses these constraints by automatically splitting, distributing, and coordinating large batch training jobs across multiple heterogeneous clusters (containing various accelerators like A100, H100, Ascend 910B/C, etc.) while maintaining complete training semantics and providing unified status aggregation.

## Example
The following is an example configuration for a large-scale training job split across heterogeneous clusters:

```yaml
apiVersion: training.volcano.sh/v1alpha1
kind: HyperJob
metadata:
  name: ascend-heterogeneous-training
spec:
  minAvailable: 2
  replicatedJobs:
  - name: trainer-910b
    replicas: 1
    clusterNames: ["cluster-ascend-910b-1", "cluster-ascend-910b-2"]
    templateSpec:
      tasks:
      - name: worker
        replicas: 64
        template:
          spec:
            affinity:
              nodeAffinity:
                requiredDuringSchedulingIgnoredDuringExecution:
                  nodeSelectorTerms:
                  - matchExpressions:
                    - key: hardware-type
                      operator: In
                      values:
                      - Ascend910B
            containers:
            - name: trainer
              image: training-image:v1
              resources:
                requests:
                  ascend910c: 1
                limits:
                  ascend910c: 1
  - name: trainer-910c
    replicas: 1
    clusterNames: ["cluster-ascend-910c-1"]
    templateSpec:
      tasks:
      - name: worker
        replicas: 64
        template:
          spec:
            affinity:
              nodeAffinity:
                requiredDuringSchedulingIgnoredDuringExecution:
                  nodeSelectorTerms:
                  - matchExpressions:
                    - key: hardware-type
                      operator: In
                      values:
                      - Ascend910C
            containers:
            - name: trainer
              image: training-image:v1
              resources:
                requests:
                  ascend910c: 1
                limits:
                  ascend910c: 1
```

## Key Fields

### HyperJob Spec
* **replicatedJobs**, *required* Defines a group of Volcano Jobs managed by the HyperJob. Each entry specifies a template that can be duplicated and distributed across target clusters.

* **minAvailable**, *optional* Specifies the minimum number of sub-jobs that must be operational for the overall HyperJob to be deemed healthy, providing partial failure tolerance.  

> **Note**: This field is reserved for future enhanced failure recovery mechanisms and is currently not utilized by the controller.

* **maxDomains**, *optional* Specifies the maximum number of clusters (domains) across which the HyperJob can be partitioned.  

> **Note**: This field is reserved for future automatic job-splitting capabilities and is currently not utilized by the controller.

* **plugins**, *optional* Specifies framework-specific configuration plugins to enable cross-cluster coordination. The map key represents the plugin name, while the value is a list of parameters.  

> **Note**: This field is currently reserved.

---

### ReplicatedJob Configuration
* **name**, *required* A unique string identifier for the replicated job within the HyperJob hierarchy, used heavily for status tracking.

* **templateSpec**, *required* The actual `v1alpha1.JobSpec` of the Volcano Job that will act as the template for individual sub-jobs spawned across target clusters.

* **replicas**, *optional* The number of distinct Volcano Job copies to spawn using the specified template. Defaults to 1.

* **clusterNames**, *optional* A list of preferred target cluster names where the controller should attempt to schedule the workloads. An empty list implies no explicit preference.

* **splitPolicy**, *optional* Configures the partitioning behaviors across clusters.  

> **Note**: This field is reserved for future automated scaling and dynamic external splitting services.

---

### SplitPolicy Configuration
* **mode**, *optional* Determines the partitioning methodology. Supported options are `static` (user-defined explicit splits) and `auto` (controller or external engine-driven dynamic splits).

* **accelerators**, *optional* The overall number of target accelerators required across the job.

* **acceleratorType**, *optional* Specifies the exact resource indicator string representing the targeted chip architecture (e.g., `nvidia.com/gpu`, `huawei.com/ascend910`).

## Status

### Conditions
Conditions indicate the final lifecycle milestones of the HyperJob and are populated only after every sub-job concludes its lifecycle.

* **Completed** Set to `True` when all underlying child Volcano Jobs have completed successfully.

* **Failed** Set to `True` when all underlying child Volcano Jobs have stopped executing, but at least one child job has encountered a failure, abortion, or abnormal termination.

> **Note**: During active execution, while child workloads are still pending or running, the `Conditions` block remains unpopulated to help distinguish active runtime from terminal states.

### Observed Metrics
* **replicatedJobsStatus**: Tracks the underlying mapping states (`JobStates`) of individual Volcano Jobs alongside aggregated real-time Pod metrics (`Pending`, `Running`, `Succeeded`, `Failed`, `Terminating`, `Unknown`).
* **splitCount**: The complete count of distinct Volcano Jobs generated out of the high-level HyperJob resource definition.
* **observedGeneration**: The configuration generation snapshot processed by the controller reconciliation loop.

## Usage
HyperJob extends, rather than replaces, standard single-cluster operations. Use HyperJob when your distributed batch or AI training topologies span multi-cluster infrastructure.

### Comparison Matrix

| Feature | Volcano Job | HyperJob |
| :--- | :--- | :--- |
| **Scope** | Single cluster | Multiple clusters |
| **Abstraction Level** | Cluster-level primitive (manages Pods) | Meta-level primitive (manages Volcano Jobs) |
| **Primary Use Case** | Batch workload scheduling | Large-scale training across heterogeneous clusters |
| **Job Composition** | Single job with multiple tasks | Composition of multiple Volcano Jobs |
| **Status Tracking** | Tracks pods within a single job | Aggregates status from multiple Volcano Jobs across clusters |

## Note

#### Multi-Cluster Infrastructure Exclusions
HyperJob explicitly offloads raw multi-cluster underlying infrastructure responsibilities to external systems. The following layers are out of scope:
* **Network Infrastructure**: Pod-to-Pod cross-cluster routing fabrics, mesh setups, and inter-cluster network configurations must be established in advance.
* **Cluster Federation**: Control plane cluster discovery, registration, and federation management engines must be supplied by external components.
* **Data Management**: File/storage synchronizations, model checkpoint shipping, and artifact state handling must be handled externally or via framework hooks.