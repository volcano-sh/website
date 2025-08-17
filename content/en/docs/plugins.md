+++
title =  "Plugins"

date = 2021-05-13
lastmod = 2021-05-13

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Plugins"
[menu.docs]
  parent = "scheduler"
  weight = 3
+++

### Env

#### Introduction

The Env plugin is a crucial component of Volcano Job, specifically designed for scenarios where Pods need to be aware of their index position within a task. When creating a Volcano Job, these indices are automatically registered as environment variables, enabling each Pod to understand its position within the task group. This is particularly important for distributed computing frameworks such as MPI, TensorFlow, and PyTorch, which require coordination among multiple nodes to complete computational tasks.

#### Use Cases

The Env plugin is particularly suitable for the following scenarios:

1. **Distributed Machine Learning**: In distributed training with frameworks like TensorFlow and PyTorch, each worker node needs to know its role (such as parameter server or worker) and its index position within the work group.
2. **Data Parallel Processing**: When multiple Pods need to process different data shards, each Pod can obtain its index through environment variables to determine which data range it should process.
3. **MPI Parallel Computing**: In high-performance computing scenarios, MPI tasks require each process to know its rank for proper inter-process communication.

#### Key Features

- Automatically registers `VK_TASK_INDEX` and `VC_TASK_INDEX` environment variables for each Pod
- Index values range from 0 to the number of replicas minus 1, indicating the Pod's position in the task
- No additional configuration required; simply register the plugin in the Job definition
- Seamlessly integrates with other Volcano plugins (such as Gang, SVC, etc.) to enhance distributed task coordination capabilities

#### Usage

Adding the Env plugin to a Volcano Job definition is straightforward:

```yaml
yamlspec:
  plugins:
    env: []   # Register the Env plugin, no values needed in the array
```

For more information about the Env plugin, please refer to the [Volcano Env Plugin Guide](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_env_plugin.md).

### SSH

#### Introduction

The SSH plugin is designed to provide password-free login capabilities between Pods in a Volcano Job, which is essential for workloads like MPI. It is typically used in conjunction with the SVC plugin to enable efficient communication between nodes in a distributed computing environment.

#### Use Cases

The SSH plugin is particularly suitable for the following scenarios:

1. **MPI Parallel Computing**: MPI frameworks require unobstructed communication between nodes, and password-free SSH login is a key part of their infrastructure.
2. **Distributed Machine Learning**: During distributed training, the master node may need to connect to worker nodes via SSH to execute commands or monitor status.
3. **Cluster Management**: When administrative operations need to be performed across multiple Pods in a job, password-free SSH simplifies the operational workflow.
4. **High-Performance Computing**: HPC workloads typically require efficient communication and coordination between nodes, which the SSH plugin provides.

#### Key Features

- Automatically configures password-free SSH login for all Pods in the Job
- Creates a Secret containing `authorized_keys`, `id_rsa`, `config`, and `id_rsa.pub`
- Mounts SSH configuration files to specified paths in all containers within the Job
- Provides a `/root/.ssh/config` file containing hostname and subdomain mappings for all Pods in the Job
- Supports customization of SSH keys and configuration paths

#### Configuration Parameters

| Parameter           | Type   | Default Value | Required | Description                                  |
| ------------------- | ------ | ------------- | -------- | -------------------------------------------- |
| `ssh-key-file-path` | String | `/root/.ssh`  | No       | Path for storing SSH private and public keys |
| `ssh-private-key`   | String | Default key   | No       | Input string for private key                 |
| `ssh-public-key`    | String | Default key   | No       | Input string for public key                  |

#### Usage

Adding the SSH plugin to a Volcano Job definition is straightforward:

```yaml
yamlspec:
  plugins:
    ssh: []   # Register the SSH plugin, no additional parameters needed in most cases
    svc: []   # Typically used with the SVC plugin
```

#### Important Notes

- If `ssh-key-file-path` is configured, ensure the target directory contains private and public keys. In most cases, it's recommended to keep the default value.
- If `ssh-private-key` or `ssh-public-key` is configured, ensure the values are correct. In most cases, it's recommended to use the default keys.
- Once the SSH plugin is configured, a Secret named "job-name-ssh" will be created containing the required SSH configuration files.
- Ensure the `sshd` service is available in all containers, otherwise the SSH login functionality will not work properly.

For more information about the SSH plugin, please refer to the [Volcano SSH Plugin Guide](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_ssh_plugin.md).

### SVC

#### Introduction

The SVC plugin is designed to provide communication capabilities between Pods in a Volcano Job, which is essential for workloads like TensorFlow and MPI. For example, TensorFlow jobs require communication between parameter servers (PS) and worker nodes. Volcano's SVC plugin enables Pods within a Job to access each other via domain names, greatly simplifying the deployment of distributed applications.

#### Use Cases

The SVC plugin is particularly suitable for the following scenarios:

1. **Distributed Machine Learning**: Frameworks like TensorFlow and PyTorch require efficient communication between worker nodes and parameter servers.
2. **Big Data Processing**: Frameworks like Spark require communication between Drivers and Executors.
3. **High-Performance Computing**: Parallel computing frameworks like MPI require low-latency communication between nodes.
4. **Microservice Architecture**: When a job contains multiple interdependent service components.

#### Key Features

- Automatically sets `hostname` (Pod name) and `subdomain` (Job name) for all Pods
- Registers environment variables `VC_%s_NUM` (number of task replicas) and `VC_%s_HOSTS` (domain names of all Pods under the task) for all containers
- Creates a ConfigMap containing the number of all task replicas and Pod domain names, mounted to the `/etc/volcano/` directory
- Creates a headless service with the same name as the Job
- Optionally creates NetworkPolicy objects to control communication between Pods

#### Configuration Parameters

| Parameter                     | Type    | Default | Description                                              |
| ----------------------------- | ------- | ------- | -------------------------------------------------------- |
| `publish-not-ready-addresses` | Boolean | `false` | Whether to publish addresses when Pods are not ready     |
| `disable-network-policy`      | Boolean | `false` | Whether to disable creating network policies for the Job |

#### Usage

Adding the SVC plugin to a Volcano Job definition:

```yaml
yamlspec:
  plugins:
    svc: []   # Use default configuration
    # Or customize configuration
    # svc: ["--publish-not-ready-addresses=true", "--disable-network-policy=true"]
```

#### Important Notes

- Your Kubernetes cluster requires a DNS plugin (such as CoreDNS)
- Kubernetes version should be >= v1.14
- Resources created by the SVC plugin (ConfigMap, Service, NetworkPolicy) are automatically managed with the Job
- Pod domain information can be accessed via environment variables or mounted configuration files

For more information about the SVC plugin, please refer to the [Volcano SVC Plugin Guide](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_ssh_plugin.md).

### Gang

{{<figure library="1" src="gang.png" title="gang plugin">}}

#### Overview

The Gang scheduling strategy is one of the core scheduling algorithms of the Volcano-Scheduler. It meets the scheduling requirements of "All or nothing" in the scheduling process and avoids the waste of cluster resources caused by arbitrary scheduling of Pod. The Gang scheduler algorithm is to observe whether the scheduled number of Pods under Job meets the minimum number of runs. When the minimum number of runs of Job is satisfied, the scheduling action is executed for all Pods under Job; otherwise, it is not executed.

#### Scenario

The Gang scheduling algorithm based on the container group concept is well suited for scenarios that require multi-process collaboration. AI scenes often contain complex processes. Data Ingestion, Data Analysts, Data Splitting, trainers, Serving, Logging, etc., which require a group of containers to work together, are suitable for container-based Gang scheduling strategies. Multi-thread parallel computing communication scenarios under MPI computing framework are also suitable for Gang scheduling because master and slave processes need to work together. Containers under the container group are highly correlated, and there may be resource contention. The overall scheduling allocation can effectively solve the deadlock.

In the case of insufficient cluster resources, the scheduling strategy of Gang can significantly improve the utilization of cluster resources.

### Binpack

#### Overview

The goal of the BinPack scheduling algorithm is to fill as many existing nodes as possible (try not to allocate blank nodes). In the concrete implementation, BinPack scheduling algorithm scores the nodes that can be delivered, and the higher the score, the higher the resource utilization rate of nodes. Binpack algorithm can fill up the nodes as much as possible to close the application load to some nodes, which is very conducive to the automatic expansion capacity function of K8s cluster nodes.

The BinPack algorithm is injected into the Volcano-Scheduler process as a plug-in and will be applied during the Pod stage of node selection. When calculating the Binpack algorithm, the Volcano-Scheduler considers the various resources requested by Pod and averages them according to the weights configured for each resource. The weight of each resource in the node score calculation is different, depending on the weight value configured by the administrator for each resource. Different plug-ins also need to assign different weights when calculating node scores, and the Scheduler also sets the score weights for BinPack plugins.

#### Scenario

The BinPack algorithm is good for small jobs that can fill as many nodes as possible. For example, the single query job in the big data scene, the order generation in the e-commerce seckill scene, the single identification job in the AI scene, and the high concurrency service scene on the Internet, etc. This scheduling algorithm can reduce the fragmentation in the node as much as possible, and reserve enough resource space on the idle machine for Pod which has applied for more resource requests, so as to maximize the utilization of idle resources under the cluster.



### Priority

{{<figure library="1" src="fair-share.png" title="fair-share调度">}}

#### Overview

The Priority Plugin provides the implementation of job, Task sorting, and PreempTablefn, a function that calculates sacrifice jobs. Job sorting according to priorityClassName, the task of sorting by priorityClassName, createTime, id in turn.

#### Scenario

When the cluster runs multiple jobs but is low on resources, and each Job has a different number of Pods waiting to be scheduled, if you use the Kubernetes default scheduler, the Job with more Pods will eventually get more of the cluster's resources. In this case, the Volcano-Scheduler provides algorithms that enable different jobs to share cluster resources in a fair-share.

The Priority Plugin enables users to customize their job and task priorities, and to customize scheduling policies at different levels according to their own needs. Priority is arranged according to Job's PriorityClassName at the application level. For example, there are financial scenarios, Internet of Things monitoring scenarios and other applications requiring high real-time performance in the cluster, and the Priority Plugin can ensure that they are scheduled in Priority.



### DRF

{{<figure library="1" src="drfjob.png" title="Drf plugin">}}

#### Overview

The full name of DRF scheduling algorithm is Dominant Resource Fairness, which is a scheduling algorithm based on the container group Dominant Resource. Dominant Resource is the largest percentage of all required resources for a container group. The DRF algorithm selects the Dominant Resource that is the smallest in a series of container groups for priority scheduling. This can meet more job, not because a fat business, starve a large number of small business. DRF scheduling algorithm can ensure that many types of resources coexist in the environment, as far as possible to meet the fair principle of allocation.

#### Scenario

The DRF scheduling algorithm gives priority to the throughput of the business in the cluster and is suitable for batch small business scenarios such as a single AI training, a single big data calculation and a query.



### Proportion

#### Overview

Proportion scheduling algorithm uses the concept of queue to control the Proportion of total resources allocated in the cluster. Each queue allocates a certain proportion of cluster resources. For example, there are three teams that share A pool of resources on A cluster: Team A uses up to 40% of the total cluster, Team B uses up to 30%, and Team C uses up to 30%. If the amount of work delivered exceeds the team's maximum available resources, there is a queue.

#### Scenario

Proportion scheduling algorithm improves the flexibility and elasticity of cluster scheduling. The most typical scenario is that when multiple development teams in a company share a cluster, this scheduling algorithm can handle the requirements of shared resource matching and isolation between different departments very well. In multi-service mixed scenarios, such as computation-intensive AI business, network IO-intensive MPI and HPC business, and storage-intensive big data business, Proportion scheduling algorithm can allocate shared resources according to demand through matching.



### Task-topology

#### Overview

The task-topology algorithm is an algorithm that computes the priority of tasks and nodes based on the affinity and anti-affinity configuration between tasks within a Job. By configuring the affinity and anti-affinity policies between tasks within the Job and using the Task-Topology algorithm, tasks with affinity configurations can be scheduled to the same node first, and PODs with anti-affinity configurations to different nodes.

#### Scenario

node affinity：

- Task-topology is important for improving computational efficiency in deep learning computing scenarios. Using the TensorFlow calculation as an example, configure the affinity between "ps" and "worker". Task-topology algorithm enables "ps" and "worker" to be scheduled to the same node as far as possible, so as to improve the efficiency of network and data interaction between "ps" and "worker", thus improving the computing efficiency.
- Tasks in HPC and MPI scenarios are highly synchronized and need high-speed network IO.

Anti-affinity：

- Take the TensorFlow calculation as an example, the anti-affinity between "ps" and "ps"

- Master and slave backup of e-commerce service scene, data disaster tolerant, to ensure that there are spare jobs to continue to provide service after a job fails.

  

### Predicates   

#### Overview

The Predicate Plugin calls the PredicateGPU with pod and nodeInfo as parameters to evaluate and pre-select jobs based on the results.

#### Scenario

In AI scenarios where GPU resources are required, the Predicate Plugin can quickly filter out those that require the GPU for centralized scheduling.
    

### Nodeorder                                                                                                                                                                                                                                                                           

#### Overview

The NodeOrder Plugin is a scheduling optimization strategy that scores nodes from various dimensions through simulated assignments to find the node that is best suited for the current job. The scoring parameters are configured by the user. The parameter contains the Affinity、reqResource、LeastReqResource、MostResource、balanceReqResouce.

#### Scenario

NodeOrder Plugin provides scoring criteria of multiple dimensions for scheduling, and the combination of different dimensions enables users to flexibly configure appropriate scheduling policies according to their own needs.



### SLA

#### Overview

When users apply jobs to Volcano, they may need adding some particular constraints to job, for example, longest Pending time aiming to prevent job from starving. And these constraints can be regarded as Service Level Agreement (SLA) which are agreed between volcano and user. So sla plugin is provided to receive and realize SLA settings for both individual job and whole cluster.

#### Scenario

Users can customize SLA related parameters in their own cluster according to business needs. For example, for clusters with high real-time service requirements, JobWaitingTime can be set as small as possible. For clusters with bulk computing jobs, JobWaitingTime can be set to larger. The parameters of a specific SLA and the optimization of the parameters need to be combined with the specific business and related performance measurement results.

### TDM

#### Overview

The full name of TDM is Time Division Multiplexing. In a co-located environment, some nodes are in both Kubernetes cluster and Yarn cluster. For these nodes, Kubernetes and Yarn cluster can use these resource by time-sharing multiplexing.The TDM Plugin marks these nodes as `revocable nodes`. TDM plugin will try to dispatch `preemptable task` to `revocable node` in node revocable time and evict the `preemptable task` from `revocable node` out of revocable time.. TDM Plugin improves the time-division multiplexing ability of node resources in the scheduling process of Volcano.

#### Scenario

In ToB business, cloud vendors provide cloud-based resources for merchants, and different merchants adopt different container arrangement frameworks (Kubernetes/YARN, etc.). TDM Plugin improves the time-sharing efficiency of common node resources and further improves the utilization rate of resources.



### Numa-aware

#### Overview

When the node runs many CPU-bound pods, the workload can move to different CPU cores depending on whether the pod is throttled and which CPU cores are available at scheduling time. Many workloads are not sensitive to this migration and thus work fine without any intervention. However, in workloads where CPU cache affinity and scheduling latency significantly affect workload performance, the kubelet allows alternative CPU management policies to determine some placement preferences on the node.

The CPU Manager and the Topology Manager are all Kubelet components, However There is the following limitation:

- The scheduler is not topology-aware. so it is possible to be scheduled on a node and then fail on the node due to the Topology Manager. this is unacceptable for TensorFlow job. If any worker or ps failed on node, the job will fail.
- The managers are node-level that results in an inability to match the best node for NUMA topology in the whole cluster.

The Numa-Aware Plugin aims to address these limitations.

- Support cpu resource topology scheduling.
- Support pod-level topology policies.

#### Scenario

Common scenarios for NUMA-Aware are computation-intensive jobs that are sensitive to CPU parameters, scheduling delays. Such as scientific calculation, video decoding, animation rendering, big data offline processing and other specific scenes.



### Capacity

#### Introduction

The Capacity plugin is responsible for managing queue resource quotas in the Volcano scheduler. It ensures that resources are allocated to various queues according to preset resource quotas and supports hierarchical queue structures. The main functions of the Capacity plugin include: tracking queue resource usage, ensuring queues do not exceed their resource limits, supporting resource preemption, and managing job enqueuing logic.

The Capacity plugin achieves precise control over resource allocation by monitoring each queue's allocated resources, requested resources, guaranteed resources, and elastic resources. It also supports hierarchical queue structures, allowing administrators to create parent-child queue relationships for implementing more complex resource management strategies.

#### Scenarios

- Multi-tenant environments: In environments where multiple teams or departments share cluster resources, queue resource quotas limit resource usage by various tenants, ensuring fair resource distribution.
- Resource guarantee requirements: When critical business operations require resource guarantees, setting queue guarantee resources ensures these operations always receive the necessary resources.
- Hierarchical resource management: In large organizations, hierarchical queue structures implement multi-level resource management for departments, teams, and projects, where higher-level queues can control resource usage of lower-level queues.

### CDP

#### Introduction

The CDP plugin is designed specifically for elastic scheduling scenarios in the Volcano scheduler. In elastic scheduling environments, preemptible pods may frequently switch between being preempted and resuming operation. Without a cooling protection mechanism, these pods might be preempted again shortly after starting, leading to decreased service stability.

The CDP plugin provides a cooling time protection for pods, ensuring they won't be preempted for a certain period after entering the Running state, thereby improving service stability. This protection mechanism is particularly important for applications that require a certain startup time before providing stable services.

##### Scenarios

- Elastic training systems: In machine learning training tasks, model training pods need stable running time to learn effectively. CDP ensures these pods won't be immediately preempted after startup, improving training efficiency.
- Elastic service systems: For applications providing online services, pods typically need to initialize and warm up before providing normal service. CDP guarantees these service pods have sufficient time to complete initialization.
- Clusters with intense resource competition: In resource-constrained clusters, high-priority tasks may frequently preempt resources from low-priority tasks. CDP provides protection for low-priority tasks that still require stable running time.
- Stateful applications: For stateful applications, frequent preemption and recovery may lead to inconsistent states or data loss. CDP reduces the occurrence of such situations.
- Applications with long startup times: Some applications may have lengthy startup times; if frequently preempted during startup, they might never provide normal service. CDP ensures these applications have at least one complete startup cycle.

### Conformance

#### Introduction

The Conformance plugin is a safety plugin in the Volcano scheduler designed to protect critical Kubernetes system pods from preemption or reclamation. This plugin ensures the stable operation of system-critical components, preventing scheduling decisions from affecting the core functionality of the cluster.

The Conformance plugin identifies critical pods by recognizing specific priority class names and namespaces. It filters out pods with system-level priorities or running in system namespaces, preventing these pods from becoming targets for preemption or resource reclamation.

#### Scenarios

- System component protection: Ensures that core Kubernetes components running in the kube-system namespace (such as kube-apiserver, kube-scheduler, kube-controller-manager, etc.) are not preempted due to user workload scheduling requirements.
- Cluster stability assurance: By preventing critical pods from being preempted, maintains the basic functionality and stability of the cluster, ensuring cluster management functions operate normally even under resource constraints.

### DeviceShare

#### Introduction

The DeviceShare plugin is a component in the Volcano scheduler specifically designed for managing and scheduling shared device resources, particularly high-value computing resources like GPUs. This plugin supports various device sharing modes, including GPU sharing (GPUShare) and virtual GPU (VGPU), enabling clusters to utilize limited device resources more efficiently.

Through fine-grained device resource allocation mechanisms, the DeviceShare plugin allows multiple tasks to share the same physical device, thereby improving device utilization and cluster throughput. It provides device resource predicate and score functions to ensure tasks are scheduled to appropriate nodes, while also supporting node locking functionality to prevent issues caused by resource contention.

#### Scenarios

- GPU sharing environments: In machine learning and deep learning workloads, many tasks may only require partial GPU resources. Through GPU sharing, multiple tasks can share the same physical GPU, improving resource utilization.
- Mixed workloads: In clusters running both compute-intensive and non-compute-intensive tasks, DeviceShare helps allocate GPU resources more rationally, ensuring resources aren't wasted.
- Virtual GPU applications: For environments supporting virtual GPU technology, DeviceShare provides VGPU scheduling support, enabling effective management and allocation of virtualized GPU resources.

### Extender

#### Introduction

The Extender plugin is an extension mechanism for the Volcano scheduler that allows users to integrate custom scheduling logic into the Volcano scheduling system through HTTP interfaces. This plugin delegates part or all of the scheduling decision process to external systems through HTTP calls, enabling the Volcano scheduler to support more complex, domain-specific scheduling requirements.

The Extender plugin supports extensions for various scheduling phases, including session opening/closing, node predicate, node prioritization, task preemption, resource reclamation, queue overuse checking, and job enqueuing checking. Users can implement one or more of these interfaces as needed to customize scheduling behavior.

#### Scenarios

- Domain-specific scheduling requirements: When the standard Volcano scheduler cannot meet complex scheduling requirements in specific domains (such as HPC, AI training, etc.), the Extender plugin can integrate specialized scheduling logic.
- External system integration: For existing scheduling systems or resource management systems, the Extender plugin enables smooth integration with Volcano.

### NodeGroup

#### Introduction

The NodeGroup plugin is a component in the Volcano scheduler used to manage node group affinity and anti-affinity. This plugin allows users to control workload distribution based on relationships between queues and node groups, providing a higher-level resource allocation and isolation mechanism. Through the NodeGroup plugin, users can define affinity and anti-affinity rules between queues and specific node groups, which can be either required (hard) or preferred (soft) requirements.

The NodeGroup plugin identifies the node group to which nodes belong through a labeling mechanism and performs node predicate and scoring during scheduling based on queue affinity configurations. This allows administrators to more finely control how workloads from different queues are distributed across the cluster.

#### Scenarios

- Resource isolation: In multi-tenant environments, workloads from different tenants can be restricted to specific node groups, avoiding resource interference and improving security and performance stability.
- Hardware affinity: When clusters contain nodes with different hardware configurations (such as GPU nodes, high-memory nodes, etc.), NodeGroup can guide specific types of workloads to appropriate hardware nodes.
- Failure domain isolation: By distributing workloads across different node groups, the impact range of single-point failures can be reduced, improving system availability.
- Progressive upgrades: During cluster upgrades, NodeGroup can control workload distribution between new and old node groups, enabling smooth transitions.

### Overcommit

#### Introduction

The Overcommit plugin is a component in the Volcano scheduler used to implement resource overcommitting. This plugin allows clusters to accept more job enqueuing requests even when physical resources are insufficient by setting an overcommit factor, thereby improving cluster resource utilization and job throughput.

The Overcommit plugin determines whether new job requests can be enqueued by calculating the cluster's total resources, used resources, and resource requirements of already enqueued jobs, combined with the overcommit factor. The overcommit factor defines the proportion by which a cluster can exceed its physical resource capacity, with a default value of 1.2, indicating that the cluster can accept resource requests exceeding its actual capacity by 20%.

#### Scenarios

- Resource utilization optimization: In practice, many applications' resource requests often exceed their actual usage. Through resource overcommitting, more jobs can be accepted, improving overall cluster resource utilization.
- Elastic workload environments: For workloads with fluctuating resource demands, the overcommitting mechanism can temporarily accept more jobs during peak resource demand periods, enhancing system elasticity and responsiveness.
- Batch processing job clusters: In environments dominated by batch processing jobs, resource usage typically doesn't reach peak levels simultaneously. Overcommitting can increase cluster job throughput and reduce job waiting times.

### PDB

#### Introduction

PDB is a plugin in the Volcano scheduler used to protect application availability. This plugin ensures that during resource reclamation and preemption processes, the application availability constraints defined by Kubernetes PodDisruptionBudget resource objects are respected, preventing service interruptions due to scheduling decisions.

By integrating with Kubernetes PodDisruptionBudget resources, the PDB plugin checks whether each potential victim would violate PDB constraints when selecting victim tasks. If removing a pod would cause the number of application instances to fall below the minimum available instances defined by the PDB, that pod will not be selected as a victim, thereby protecting application availability.

#### Scenarios

- **High-availability service protection**: For online services requiring high availability (such as web services, database services, etc.), the PDB plugin ensures that during resource reclamation and preemption, the number of available service instances doesn't fall below the preset threshold, avoiding service interruptions.
- **Stateful application management**: For stateful applications (such as distributed databases, message queues, etc.), the PDB plugin prevents too many instances from being evicted simultaneously, reducing pressure on data replication and synchronization, and maintaining system stability.

### Rescheduling

#### Introduction

The Rescheduling plugin is a component in the Volcano scheduler used to optimize cluster resource utilization. This plugin periodically evaluates cluster status, identifies resource allocation imbalances, and proactively triggers task rescheduling to achieve better resource distribution and utilization.

The Rescheduling plugin supports multiple rescheduling strategies, with the default "lowNodeUtilization" strategy focusing on identifying low-utilization nodes and migrating tasks from low-utilization nodes to higher-utilization nodes, thereby improving overall cluster efficiency. The plugin performs rescheduling evaluations at configurable time intervals (default is 5 minutes) to ensure continuous optimization of cluster resource allocation.

#### Scenarios

- Resource utilization optimization: For long-running clusters, resource allocation may become imbalanced over time. The Rescheduling plugin can periodically rebalance resource allocation, improving overall utilization.
- Node resource fragment consolidation: When multiple low-utilization nodes exist in a cluster, Rescheduling can consolidate resource fragments through task migration, freeing up complete nodes for large tasks or node maintenance.
- Periodic maintenance: As part of cluster periodic maintenance procedures, Rescheduling can optimize resource allocation during off-peak periods in preparation for peak periods.
- Post-elastic scaling optimization: After cluster auto-scaling, resource allocation may not be optimal. Rescheduling can re-optimize task distribution after scaling operations.

### ResourceQuota

#### Introduction

The ResourceQuota plugin is a component in the Volcano scheduler used to implement namespace resource quota control. This plugin ensures that jobs comply with namespace resource limitations defined by Kubernetes ResourceQuota resource objects when enqueuing, preventing individual namespaces from consuming excessive cluster resources.

The ResourceQuota plugin determines whether a job can be enqueued by checking the job's minimum resource requirements (MinResources) against the namespace's resource quota status. When a job's resource requirements plus the namespace's already used resources exceed quota limits, the job will be rejected from enqueuing, and corresponding event information will be recorded. The plugin also maintains a tracking mechanism for pending resource usage, ensuring that multiple jobs' resource requirements within the same scheduling cycle don't exceed namespace quotas.

#### Scenarios

The ResourceQuota plugin is applicable to the following scenarios:

- Multi-tenant environments: In environments where multiple teams or projects share the same cluster, the ResourceQuota plugin ensures each tenant can only use resources allocated to their namespace, preventing resource contention and "noisy neighbor" problems.
- Resource allocation management: Administrators can implement reasonable allocation and fine-grained management of cluster resources by setting different namespace resource quotas, ensuring important business operations receive sufficient resources.
- Prevention of resource abuse: The ResourceQuota plugin can prevent excessive resource requests due to program errors or malicious behavior, protecting cluster stability.
