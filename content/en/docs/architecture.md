+++
title =  "Architecture"


date = 2019-01-28
lastmod = 2020-08-28

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Architecture"
[menu.docs]
  parent = "home"
  weight = 2
+++

## Overview

{{<figure library="1" src="arch_3.jpg" title="Application scenarios of Volcano">}}

Volcano is naturally compatible with Kubernetes, following its design philosophy and style while extending Kubernetes' native capabilities to provide comprehensive support for high-performance workloads such as machine learning, big data applications, scientific computing, and special effects rendering. Its architectural design fully considers scalability, high performance, and ease of use, built upon years of experience running various high-performance workloads at scale and incorporating best practices from the open-source community.

{{<figure library="1" src="arch_2.PNG" title="Volcano System Architecture">}}

The core architecture consists of four main components: The Scheduler, as the system core, implements advanced features such as Gang scheduling and heterogeneous device scheduling through pluggable Actions and Plugins, providing fine-grained resource allocation for batch jobs; the ControllerManager is responsible for managing CRD resource lifecycles, containing three controllers—Queue, PodGroup, and VCJob—that respectively manage queue resources, Pod groups, and Volcano Jobs; the Admission component validates CRD API resources to ensure job configurations meet system requirements; while Vcctl serves as a command-line client tool, providing a friendly interface for managing and monitoring resources and jobs.

Volcano's layered architectural design enables it to seamlessly connect with mainstream computing frameworks such as Spark, TensorFlow, PyTorch, and Flink, while providing unified scheduling capabilities. Its modular design allows users to extend functionality according to their needs by adding custom scheduling strategies and resource management capabilities. Through this architectural design, Volcano achieves efficient resource utilization, precise job scheduling, and reliable system operation, providing solid infrastructure support for high-performance computing and large-scale batch processing.

## Component Introduction

Volcano consists of the following components:

- **Scheduler**: Schedules jobs and matches the most suitable nodes through a series of actions and plugins. Unlike the Kubernetes native scheduler, it supports various job-specific scheduling algorithms.
- **Controller**: Manages the lifecycle of CRD resources, composed of multiple controllers.
- **Admission**: Responsible for validating CRD API resources.
- **Vcctl**: Volcano's command-line client tool.
- **Agent**: A component running on nodes responsible for resource monitoring and oversubscription management. It improves cluster resource utilization by identifying idle resources and allowing reasonable overcommitment.
- **Network-qos**: Manages network bandwidth allocation between online and offline workloads, ensuring network quality for online services while maximizing cluster bandwidth utilization.

### Scheduler

#### Introduction

The Volcano scheduler is a highly configurable and extensible Kubernetes scheduler designed specifically for handling complex workloads and special scheduling requirements. It provides advanced scheduling capabilities beyond the default Kubernetes scheduler, making it particularly suitable for high-performance computing, machine learning, and big data workloads.

The scheduler operates by processing Pods whose `.spec.schedulerName` matches the configured scheduler name (default is "volcano"). It works in scheduling cycles, evaluating unscheduled Pods and finding the optimal node placement according to various scheduling policies and plugins.

The Volcano scheduler supports custom plugin extensions, allows defining scheduling strategies through configuration files, and provides rich metrics and health check functionalities to ensure the reliability and observability of the scheduling system.

#### Parameters

##### Kubernetes Parameters

| Parameter Name   | Description                              | Default | Example                                   |
| ---------------- | ---------------------------------------- | ------- | ----------------------------------------- |
| `master`         | Kubernetes API server address            | -       | `--master=https://kubernetes.default.svc` |
| `kubeconfig`     | Path to kubeconfig file                  | -       | `--kubeconfig=/etc/kubernetes/admin.conf` |
| `kube-api-qps`   | QPS limit for communication with K8s API | 2000.0  | `--kube-api-qps=1000`                     |
| `kube-api-burst` | Burst limit for K8s API communication    | 2000    | `--kube-api-burst=1000`                   |

##### TLS Certificate Parameters

| Parameter Name         | Description                                  | Default | Example                                       |
| ---------------------- | -------------------------------------------- | ------- | --------------------------------------------- |
| `ca-cert-file`         | x509 certificate file for HTTPS              | -       | `--ca-cert-file=/etc/volcano/ca.crt`          |
| `tls-cert-file`        | Default x509 certificate file for HTTPS      | -       | `--tls-cert-file=/etc/volcano/tls.crt`        |
| `tls-private-key-file` | x509 private key file matching tls-cert-file | -       | `--tls-private-key-file=/etc/volcano/tls.key` |

##### Scheduler Configuration Parameters

| Parameter Name    | Description                                         | Default   | Example                                        |
| ----------------- | --------------------------------------------------- | --------- | ---------------------------------------------- |
| `scheduler-name`  | .spec.SchedulerName for Pods handled by Volcano     | "volcano" | `--scheduler-name=volcano-scheduler`           |
| `scheduler-conf`  | Absolute path to scheduler configuration file       | -         | `--scheduler-conf=/etc/volcano/scheduler.conf` |
| `schedule-period` | Time interval between scheduling cycles             | 1s        | `--schedule-period=2s`                         |
| `default-queue`   | Default queue name for jobs                         | "default" | `--default-queue=system`                       |
| `priority-class`  | Enable PriorityClass for pod group level preemption | true      | `--priority-class=false`                       |

##### Node Selection and Scoring Parameters

| Parameter Name                     | Description                                                  | Default | Example                                                      |
| ---------------------------------- | ------------------------------------------------------------ | ------- | ------------------------------------------------------------ |
| `minimum-feasible-nodes`           | Minimum number of feasible nodes to find and score           | 100     | `--minimum-feasible-nodes=50`                                |
| `minimum-percentage-nodes-to-find` | Minimum percentage of nodes to find and score                | 5       | `--minimum-percentage-nodes-to-find=10`                      |
| `percentage-nodes-to-find`         | Percentage of nodes to score in each cycle; if <=0, adaptive percentage based on cluster size | 0       | `--percentage-nodes-to-find=20`                              |
| `node-selector`                    | Volcano only processes nodes with specified labels           | -       | `--node-selector=volcano.sh/role:train --node-selector=volcano.sh/role:serving` |
| `node-worker-threads`              | Number of threads for synchronizing node operations          | 20      | `--node-worker-threads=30`                                   |

##### Plugin and Storage Parameters

| Parameter Name         | Description                                                  | Default | Example                                                      |
| ---------------------- | ------------------------------------------------------------ | ------- | ------------------------------------------------------------ |
| `plugins-dir`          | Directory of custom plugins to load (but not activate)       | ""      | `--plugins-dir=/etc/volcano/plugins`                         |
| `csi-storage`          | Enable tracking available storage capacity provided by CSI drivers | false   | `--csi-storage=true`                                         |
| `ignored-provisioners` | List of storage provisioners to ignore during pod PVC request and preemption calculations | -       | `--ignored-provisioners=rancher.io/local-path --ignored-provisioners=hostpath.csi.k8s.io` |

##### Monitoring and Health Check Parameters

| Parameter Name    | Description                            | Default  | Example                    |
| ----------------- | -------------------------------------- | -------- | -------------------------- |
| `enable-healthz`  | Enable health check                    | false    | `--enable-healthz=true`    |
| `healthz-address` | Listen address for health check server | ":11251" | `--healthz-address=:11252` |
| `enable-metrics`  | Enable metrics functionality           | false    | `--enable-metrics=true`    |
| `listen-address`  | Listen address for HTTP requests       | ":8080"  | `--listen-address=:8081`   |

##### Cache and Debug Parameters

| Parameter Name   | Description                                     | Default | Example                             |
| ---------------- | ----------------------------------------------- | ------- | ----------------------------------- |
| `cache-dumper`   | Enable cache dumper                             | true    | `--cache-dumper=false`              |
| `cache-dump-dir` | Target directory for dumping cache info to JSON | "/tmp"  | `--cache-dump-dir=/var/log/volcano` |
| `version`        | Display version and exit                        | false   | `--version`                         |

##### Leader Election Parameters

| Parameter Name          | Description                                                  | Default          | Example                               |
| ----------------------- | ------------------------------------------------------------ | ---------------- | ------------------------------------- |
| `lock-object-namespace` | Namespace of lock object (deprecated, use --leader-elect-resource-namespace) | "volcano-system" | `--lock-object-namespace=kube-system` |

### Controller

#### Introduction

Volcano Controller is a core component of Volcano, responsible for managing and coordinating batch jobs and resources in Kubernetes clusters. It adopts a multi-controller architecture, including job controller, queue controller, PodGroup controller, garbage collection controller, and other specialized modules that collectively handle different types of resource objects and business logic.

Compared to traditional Kubernetes controllers, Volcano Controller provides richer batch job management capabilities, supporting job lifecycle management, resource queue maintenance, PodGroup coordination, and other advanced features, making it particularly suitable for high-performance computing and machine learning scenarios. Its framework-based design achieves good extensibility, allowing users to enable or disable specific controllers according to their needs.

Volcano Controller deeply integrates with Kubernetes, using leader election mechanisms to ensure high availability, while providing health check and metric collection functions for system monitoring. Its flexible configuration options allow users to adjust parameters such as the number of worker threads, QPS limits, and resource management strategies.

#### Parameters

##### Kubernetes Parameters

| Parameter Name   | Description                              | Default | Example                                   |
| ---------------- | ---------------------------------------- | ------- | ----------------------------------------- |
| `master`         | Kubernetes API server address            | -       | `--master=https://kubernetes.default.svc` |
| `kubeconfig`     | Path to kubeconfig file                  | -       | `--kubeconfig=/etc/kubernetes/admin.conf` |
| `kube-api-qps`   | QPS limit for communication with K8s API | 50.0    | `--kube-api-qps=100`                      |
| `kube-api-burst` | Burst limit for K8s API communication    | 100     | `--kube-api-burst=200`                    |

##### TLS Certificate Parameters

| Parameter Name         | Description                                  | Default | Example                                       |
| ---------------------- | -------------------------------------------- | ------- | --------------------------------------------- |
| `ca-cert-file`         | x509 certificate file for HTTPS              | -       | `--ca-cert-file=/etc/volcano/ca.crt`          |
| `tls-cert-file`        | Default x509 certificate file for HTTPS      | -       | `--tls-cert-file=/etc/volcano/tls.crt`        |
| `tls-private-key-file` | x509 private key file matching tls-cert-file | -       | `--tls-private-key-file=/etc/volcano/tls.key` |

##### Scheduler Configuration Parameters

| Parameter Name              | Description                                                  | Default   | Example                              |
| --------------------------- | ------------------------------------------------------------ | --------- | ------------------------------------ |
| `scheduler-name`            | .spec.SchedulerName for Pods handled by Volcano              | "volcano" | `--scheduler-name=volcano-scheduler` |
| `worker-threads`            | Number of threads for concurrent job operations              | 3         | `--worker-threads=5`                 |
| `max-requeue-num`           | Maximum number of requeues for jobs, queues, or commands     | 15        | `--max-requeue-num=20`               |
| `inherit-owner-annotations` | Whether to inherit owner's annotations when creating PodGroup | true      | `--inherit-owner-annotations=false`  |

##### Dedicated Thread Parameters

| Parameter Name                | Description                                  | Default | Example                            |
| ----------------------------- | -------------------------------------------- | ------- | ---------------------------------- |
| `worker-threads-for-podgroup` | Number of threads for PodGroup operations    | 5       | `--worker-threads-for-podgroup=10` |
| `worker-threads-for-queue`    | Number of threads for queue operations       | 5       | `--worker-threads-for-queue=10`    |
| `worker-threads-for-gc`       | Number of threads for job garbage collection | 1       | `--worker-threads-for-gc=2`        |

##### Health Check and Monitoring Parameters

| Parameter Name    | Description                            | Default  | Example                    |
| ----------------- | -------------------------------------- | -------- | -------------------------- |
| `healthz-address` | Listen address for health check server | ":11251" | `--healthz-address=:11252` |
| `enable-healthz`  | Enable health check                    | false    | `--enable-healthz=true`    |
| `enable-metrics`  | Enable metrics functionality           | false    | `--enable-metrics=true`    |
| `listen-address`  | Listen address for HTTP requests       | ":8081"  | `--listen-address=:8082`   |

##### Leader Election Parameters

| Parameter Name                    | Description                           | Default                 | Example                                            |
| --------------------------------- | ------------------------------------- | ----------------------- | -------------------------------------------------- |
| `lock-object-namespace`           | Namespace of lock object (deprecated) | "volcano-system"        | `--lock-object-namespace=kube-system`              |
| `leader-elect`                    | Enable leader election                | -                       | `--leader-elect=true`                              |
| `leader-elect-resource-name`      | Leader election resource name         | "vc-controller-manager" | -                                                  |
| `leader-elect-resource-namespace` | Leader election resource namespace    | -                       | `--leader-elect-resource-namespace=volcano-system` |

##### Controller Management Parameters

| Parameter Name | Description                   | Default               | Example                                           |
| -------------- | ----------------------------- | --------------------- | ------------------------------------------------- |
| `controllers`  | Specify controllers to enable | "*" (all controllers) | `--controllers=+job-controller,-queue-controller` |
| `version`      | Display version and exit      | false                 | `--version`                                       |

##### Controller List

Volcano supports the following controllers, which can be enabled or disabled via the `controllers` parameter:

- `gc-controller`: Garbage collection controller
- `job-controller`: Job controller
- `jobflow-controller`: Job flow controller
- `jobtemplate-controller`: Job template controller
- `pg-controller`: PodGroup controller
- `queue-controller`: Queue controller

Use `*` to enable all controllers, `+[controller-name]` to explicitly enable a specific controller, and `-[controller-name]` to explicitly disable a specific controller.

#### gc-controller

The Garbage Collector is a specialized controller responsible for cleaning up completed Job resources. It works by monitoring Job creation and update events, identifying those that have completed (Completed, Failed, or Terminated) and have a TTL set (via .spec.ttlSecondsAfterFinished).

The controller maintains a work queue, adding Jobs that need cleanup and processing them at appropriate times. It calculates the time elapsed since a Job's completion, and when that time reaches or exceeds the specified TTL, it deletes these Jobs through the API server. For Jobs that haven't yet expired, the controller requeues them with a timer set to process them again when their TTL expires.

This mechanism ensures that completed Jobs don't permanently occupy cluster resources, while providing a flexible resource reclamation strategy that allows users to retain Job history records for a specified period before automatic cleanup.

#### job-controller

The Job Controller is a core controller responsible for managing and coordinating the lifecycle of Job resources. It works by monitoring changes to Job, Pod, PodGroup, and other resources, handling related events, and maintaining Job states.

The controller processes Jobs according to their current state and triggered events, calling appropriate state handling functions to synchronize Job resources, including creating Pods, checking Pod status, and updating Job status.

The controller implements a work queue system, using a hashing algorithm to distribute Jobs across different work queues for parallel processing. It also includes a delayed action mechanism that allows certain operations to execute after a specific delay, such as handling Pod failures or retries. It implements error handling and retry mechanisms, requeuing requests when operations fail and terminating Jobs and releasing resources after exceeding the maximum retry count.

#### jobflow-controller

The JobFlow Controller is primarily responsible for managing and coordinating the lifecycle of JobFlow CR. It works by monitoring changes to JobFlow, JobTemplate, and Job resources, handling related events, and maintaining JobFlow states.

When a JobFlow is created or updated, the controller adds the request to a work queue and then performs appropriate state transition operations, calling corresponding handler functions to synchronize JobFlow resources, including creating dependent Jobs, checking Job status, and updating JobFlow status.

It also handles error conditions, including retrying failed requests and recording events to help users understand the JobFlow's operational status.

#### jobtemplate-controller

The JobTemplate Controller is responsible for managing JobTemplate resources. It works by monitoring the creation events of JobTemplate and Job resources, handling related operations, and maintaining JobTemplate states.

During initialization, the controller sets up various informers to monitor resource changes and creates work queues to process these events.

When a JobTemplate is created, the controller adds it to the work queue and then performs synchronization operations, which may include creating actual Job resources based on the template. Similarly, when a Job is created, the controller also checks whether related JobTemplate statuses need to be updated.

The controller implements error handling and retry mechanisms, requeuing requests when operations fail until reaching the maximum retry count. It also records events to help users understand the processing status of JobTemplates.

#### pg-controller

The PodGroup Controller is a specialized controller responsible for automatically creating and managing PodGroup resources for Pods using the Volcano scheduler. It works by monitoring the creation and update events of Pods and ReplicaSets, identifying those that need PodGroups but aren't yet associated with one.

The controller maintains a work queue, adding Pod requests that need processing. When it detects Pods using the Volcano scheduler without a specified PodGroup, the controller automatically creates corresponding PodGroup resources, ensuring these Pods can be correctly processed by the Volcano scheduling system.

Additionally, when the workload support feature is enabled, the controller also monitors ReplicaSet resources, creating unified PodGroups for Pods belonging to the same ReplicaSet, thereby supporting more complex workload patterns. The controller can also inherit annotations from Pod owners based on configuration, implementing more flexible resource management strategies.

#### queue-controller

The Queue Controller is a core controller responsible for managing and maintaining queue states in the Volcano scheduling system. It works by monitoring changes to Queue, PodGroup, and Command resources, coordinating queue lifecycle and state transitions.

The controller maintains two work queues: one for processing queue state change requests and another for handling queue commands. When a queue state needs to change (such as opening, closing, or synchronizing), the controller calls the appropriate state handling function to execute the state transition. The controller also maintains the mapping relationship between queues and PodGroups, ensuring correct implementation of resource allocation and scheduling policies.

When the QueueCommandSync parameter is enabled, the controller also monitors Command resources, supporting dynamic control of queue behavior through commands, such as opening or closing queues. The controller implements error handling and retry mechanisms, requeuing requests when operations fail and recording events and abandoning processing after exceeding the maximum retry count. This design ensures the consistency and reliability of queue states and is an important component of the Volcano scheduling system.

### Admission

#### Introduction

Volcano Admission is a key component of the Volcano system, responsible for validating and modifying resource objects submitted to the Kubernetes cluster. It is implemented through Kubernetes' Webhook mechanism, capable of intercepting creation, update, and deletion requests for specific resources, and validating or modifying them according to predefined rules.

Admission supports admission control for various resources, including Jobs, PodGroups, Pods, and Queues. Through configuration of different admission paths, it can flexibly control which resources need validation or modification. By default, it processes Pod resources managed by the Volcano scheduler (default name "volcano").

This component provides an HTTPS service to receive admission requests from the Kubernetes API server and supports health check functionality for monitoring its operational status.

#### Parameters

##### Kubernetes Parameters

| Parameter Name   | Description                                              | Default | Example                                   |
| ---------------- | -------------------------------------------------------- | ------- | ----------------------------------------- |
| `master`         | Kubernetes API server address (overrides kubeconfig)     | Empty   | `--master=https://kubernetes.default.svc` |
| `kubeconfig`     | Path to kubeconfig file with auth and master server info | Empty   | `--kubeconfig=/etc/kubernetes/admin.conf` |
| `kube-api-qps`   | QPS limit for communication with Kubernetes API server   | 50.0    | `--kube-api-qps=100`                      |
| `kube-api-burst` | Burst limit for communication with Kubernetes API server | 100     | `--kube-api-burst=200`                    |

##### TLS Certificate Parameters

| Parameter Name         | Description                                      | Default | Example                                       |
| ---------------------- | ------------------------------------------------ | ------- | --------------------------------------------- |
| `tls-cert-file`        | Path to x509 certificate file for HTTPS service  | Empty   | `--tls-cert-file=/etc/volcano/tls.crt`        |
| `tls-private-key-file` | Path to x509 private key file matching cert file | Empty   | `--tls-private-key-file=/etc/volcano/tls.key` |
| `ca-cert-file`         | Path to CA certificate file for HTTPS service    | Empty   | `--ca-cert-file=/etc/volcano/ca.crt`          |

##### Service Configuration Parameters

| Parameter Name   | Description                                | Default | Example                    |
| ---------------- | ------------------------------------------ | ------- | -------------------------- |
| `listen-address` | Address for Admission Controller to listen | Empty   | `--listen-address=0.0.0.0` |
| `port`           | Port for Admission Controller to use       | 8443    | `--port=8443`              |
| `version`        | Display version information and exit       | false   | `--version`                |

##### Webhook Configuration Parameters

| Parameter Name         | Description                 | Default | Example                                                      |
| ---------------------- | --------------------------- | ------- | ------------------------------------------------------------ |
| `webhook-namespace`    | Namespace of the webhook    | Empty   | `--webhook-namespace=volcano-system`                         |
| `webhook-service-name` | Name of the webhook service | Empty   | `--webhook-service-name=volcano-admission`                   |
| `webhook-url`          | URL of the webhook          | Empty   | `--webhook-url=https://volcano-admission.volcano-system:8443` |
| `admission-conf`       | Path to webhook config file | Empty   | `--admission-conf=/etc/volcano/admission.conf`               |

##### Admission Control Parameters

| Parameter Name      | Description                                                | Default                                                      | Example                                           |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| `enabled-admission` | Enabled admission webhook paths, separated by commas       | "/jobs/mutate,/jobs/validate,/podgroups/mutate,/pods/validate,/pods/mutate,/queues/mutate,/queues/validate" | `--enabled-admission=/jobs/mutate,/pods/validate` |
| `scheduler-name`    | Volcano will handle Pods with matching .spec.SchedulerName | ["volcano"]                                                  | `--scheduler-name=volcano,custom-scheduler`       |

##### Health Check Parameters

| Parameter Name    | Description                              | Default  | Example                    |
| ----------------- | ---------------------------------------- | -------- | -------------------------- |
| `enable-healthz`  | Whether to enable health check           | false    | `--enable-healthz=true`    |
| `healthz-address` | Address and port for health check server | ":11251" | `--healthz-address=:11252` |

### Vcctl

#### Introduction

`vcctl` is a command-line tool provided by Volcano for managing and operating resources in a Volcano cluster. It offers a set of intuitive commands that enable users to easily query, create, modify, and delete Volcano resources such as Jobs, Queues, and PodGroups.

The tool supports various operations, including listing, creating, deleting, and managing Volcano jobs, controlling job lifecycles (suspend, resume, run), querying and managing queue resources, viewing PodGroup status and details, and interacting with the Volcano scheduler. Through the command-line interface, users can quickly perform common management tasks without directly manipulating Kubernetes APIs or YAML files. This makes Volcano resource management simpler and more efficient, particularly suitable for batch processing jobs and high-performance computing scenarios.

The `vcctl` tool adopts a command structure similar to `kubectl`, allowing Kubernetes users to quickly get started. It supports detailed help information, which users can access via `vcctl -h` or `vcctl [command] -h` to obtain detailed usage and option descriptions for each command. As an important component of the Volcano ecosystem, `vcctl` provides users with a convenient interface, simplifying the management and operation process for complex batch workloads.

#### Parameters

vcctl does not require any additional parameters; it can be started directly.

### Agent

#### Introduction

Agent is a component that runs on Kubernetes nodes, primarily responsible for resource monitoring and oversubscription management. It significantly improves cluster resource utilization by identifying idle resources on nodes and allowing reasonable overcommitment.

The Agent continuously monitors node resource usage, providing accurate resource information to the Volcano scheduling system to support more intelligent scheduling decisions. During resource contention, it can perform resource reclamation operations to ensure that the performance of critical workloads is not affected.

Through deep integration with the Kubernetes CGroup system, Agent implements fine-grained resource control. It is an important supporting component for Volcano's efficient batch scheduling, particularly suitable for high-performance computing and machine learning scenarios.

#### Parameters

##### Kubernetes Parameters

| Parameter Name         | Type   | Default                  | Description                                                  |
| ---------------------- | ------ | ------------------------ | ------------------------------------------------------------ |
| `--kube-cgroup-root`   | string | `""`                     | Kubernetes cgroup root path. If CgroupsPerQOS is enabled, this is the root of the QOS cgroup hierarchy |
| `--kube-node-name`     | string | env `KUBE_NODE_NAME`     | Name of the node where the Agent is running                  |
| `--kube-pod-name`      | string | env `KUBE_POD_NAME`      | Name of the Pod where the Agent is running                   |
| `--kube-pod-namespace` | string | env `KUBE_POD_NAMESPACE` | Namespace of the Pod where the Agent is running              |

##### Health Check Parameters

| Parameter Name      | Type   | Default | Description                               |
| ------------------- | ------ | ------- | ----------------------------------------- |
| `--healthz-address` | string | `""`    | Address for health check server to listen |
| `--healthz-port`    | int    | `3300`  | Port for health check server to listen    |

##### Resource Oversubscription Parameters

| Parameter Name              | Type   | Default    | Description                                                  |
| --------------------------- | ------ | ---------- | ------------------------------------------------------------ |
| `--oversubscription-policy` | string | `"extend"` | Oversubscription policy, determining how oversubscribed resources are reported and used. Default is `extend`, meaning report as extended resources |
| `--oversubscription-ratio`  | int    | `60`       | Oversubscription ratio, determining how much idle resource can be overcommitted, in percentage |
| `--include-system-usage`    | bool   | `false`    | Whether to consider system resource usage when calculating oversubscription resources and performing evictions |

##### Feature Parameters

| Parameter Name         | Type     | Default | Description                                                  |
| ---------------------- | -------- | ------- | ------------------------------------------------------------ |
| `--supported-features` | []string | `["*"]` | List of supported features. `*` means support all features enabled by default, `foo` means support feature named `foo`, `-foo` means don't support feature named `foo` |

#### Network-qos

##### Introduction

The Network plugin is a network bandwidth management solution designed specifically for Kubernetes clusters, Used in conjunction with the Agent component,aimed at intelligently adjusting network resource allocation between different types of workloads. This plugin integrates with existing network plugins through the CNI mechanism, enabling fine-grained control over container network traffic.

Its core functionality is to distinguish between online and offline workloads, and dynamically adjust the bandwidth limits for offline jobs based on the real-time bandwidth needs of online services. When the bandwidth usage of online services exceeds a preset watermark, the system automatically reduces the available bandwidth for offline jobs, ensuring the quality of service for critical business applications. When online service bandwidth demands are low, the system allows offline jobs to use more bandwidth resources, improving overall cluster resource utilization.

The plugin is implemented based on Linux TC (Traffic Control) and eBPF technologies, providing efficient, low-overhead network traffic management capabilities. It is an important tool for ensuring service quality in hybrid deployment environments.

##### Parameters

| Parameter Name             | Description                                                  | Default | Type   |
| -------------------------- | ------------------------------------------------------------ | ------- | ------ |
| `CheckoutInterval`         | Time interval for checking and updating bandwidth limits for offline jobs | None    | string |
| `OnlineBandwidthWatermark` | Bandwidth threshold for online jobs, representing the maximum total bandwidth usage of all online Pods | None    | string |
| `OfflineLowBandwidth`      | Maximum network bandwidth that offline jobs can use when online job bandwidth usage exceeds the watermark | None    | string |
| `OfflineHighBandwidth`     | Maximum network bandwidth that offline jobs can use when online job bandwidth usage is below the watermark | None    | string |
| `EnableNetworkQoS`         | Whether to enable network QoS functionality                  | false   | bool   |

## Helm

If you need to view the complete Helm parameters, you can obtain them through [Volcano Helm](https://github.com/volcano-sh/volcano/blob/master/installer/helm/chart/volcano/values.yaml).
