+++
title = "Cloud Native Colocation"

date = 2025-01-20
lastmod = 2025-01-20

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
toc_depth = 5
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
[menu.docs]
  parent = "features"
  weight = 1
+++

## Background

With the rapid development of cloud-native technologies, more and more workloads have gradually migrated to Kubernetes, adopting cloud-native approaches for development and maintenance. This has greatly simplified application deployment, orchestration, and operations. Kubernetes has gradually become the "operating system" of the cloud-native era. However, despite the adoption of cloud-native technologies, resource utilization in data centers remains relatively low. To improve resource utilization while ensuring the Service Level Objectives (SLOs) of high-priority workloads, Volcano has introduced a cloud-native colocation solution. This solution provides end-to-end resource isolation and sharing mechanisms from the application layer to the kernel, maximizing resource utilization.

Cloud-native colocation refers to deploying online and offline workloads in the same cluster using cloud-native methods. Since online workloads exhibit significant peak and off-peak characteristics, offline workloads can utilize idle resources during off-peak periods. When online workloads reach peak usage, mechanisms such as online job priority control are used to suppress the operation of offline jobs, ensuring resource availability for online jobs. This approach improves overall cluster resource utilization while guaranteeing the SLOs of online workloads.

Typical online and offline workloads have the following characteristics:

|                      | **Online Workload**                                      | **Offline Workload**                                         |
| -------------------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| Typical Applications | Microservices, search, recommendation, advertising, etc. | Batch processing, Big data, AI training, video transcoding, etc. |
| Latency              | Sensitive                                                | Insensitive                                                  |
| SLO                  | High                                                     | Low                                                          |
| Load Model           | Time-based                                               | Continuous resource usage                                    |
| Fault Tolerance      | Low tolerance, high availability requirements            | Allows failure and retries                                   |
| Runtime              | Stable and continuous operation                          | Task-based, short runtime                                    |

## Advantages

Many companies and users in the industry have explored and practiced colocation technologies to varying degrees, providing positive and beneficial designs and practices for colocation. However, there are some shortcomings, such as the inability to fully decouple from Kubernetes, rough oversubscription resource calculation methods, inconsistent usage patterns for online and offline jobs, and poor user experience.

Based on these considerations, Volcano has further enhanced and optimized colocation technologies. Compared to industry colocation solutions, Volcano offers the following advantages:

- Volcano Scheduler natively supports offline workloads scheduling and management.
- No intrusive modifications to Kubernetes.
- Real-time dynamic calculation of oversubscribed resources, better balancing resource utilization and workload QoS requirements.
- OS-level isolation and QoS guarantees.

## Architecture

The cloud-native colocation architecture mainly includes the Volcano Scheduler, Volcano SLO Agent, and Enhanced OS.

- **Volcano Scheduler**: Responsible for unified scheduling of online and offline workloads, providing abstractions such as queues, groups, job priorities, fair scheduling, and resource reservation to meet the scheduling needs of microservices, big data, AI, and other workloads.
- **Volcano SLO Agent**: Each node in the cluster deploys a Volcano SLO Agent, which dynamically calculates the allocated but unused resources on each node and oversubscribes these resources for offline workloads. It also ensures node QoS by evicting offline workloads when CPU/memory pressure is detected, ensuring the priority of online workloads.
- **Enhanced OS**: The Volcano SLO Agent provides node-level QoS guarantees at the application layer. For more refined and mandatory isolation, the kernel also needs to distinguish QoS types and isolate resources at the CPU, memory, network, and L3 cache levels. The kernel exposes a series of cgroup interfaces, allowing the Volcano SLO Agent to set different cgroups for online and offline workloads, achieving fine-grained kernel-level isolation and enabling online jobs to suppress offline workloads.

<div style="text-align: center;"> {{<figure library="1" src="./colocation/architecture.png">}}
Architecture
</div>

## Features

### QoS-Based colocation Model

After colocating online and offline workloads in the same cluster, offline workloads, which are typically CPU or IO-intensive, can interfere with online workloads, leading to degraded QoS for online workloads. To minimize the interference of offline workloads on online workloads, it is necessary to implement QoS classification and control for online and offline workloads. By labeling online and offline workloads, a QoS model is defined, ensuring that online workload QoS is prioritized during runtime and reducing interference from offline workloads.

Based on the classification and operational characteristics of online and offline workloads, Volcano abstracts a model and defines different QoS levels. Different types of workloads can set different QoS levels, which are mapped to CPU and memory levels in the kernel. Higher levels will gain greater resource usage rights and preemption priority. During scheduling, different QoS levels corresponding to job types are distinguished, and rich scheduling policies are executed. Meanwhile, the Volcano SLO Agent calls kernel interfaces to set different QoS priorities for online and offline workloads. The QoS model is defined as follows:

|           QoS Level            |                Typical Application Scenarios                 | CPU Priority | Memory Priority |
| :----------------------------: | :----------------------------------------------------------: | :----------: | :-------------: |
|     LC (Latency Critical)      | Core online workloads with extremely high latency sensitivity, exclusive CPU usage |  Exclusive   |        0        |
| HLS (Highly Latency Sensitive) |   Online workloads with extremely high latency sensitivity   |      2       |        0        |
|     LS (Latency Sensitive)     |         Nearline workloads with latency sensitivity          |      1       |        0        |
|        BE (Best Effort)        |   Offline AI and big data workloads, tolerant to eviction    |      -1      |       -1        |

Users can set the annotation of the workload's corresponding Pod to indicate different workloads types. For example, setting `volcano.sh/qos-level="LS"` indicates that the Pod is a latency-sensitive nearline workload, while setting `volcano.sh/qos-level="BE"` indicates that the Pod is an offline workload.

### Unified Scheduling of Online and Offline workloads

When deploying online and offline workloads in the same cluster, using multiple schedulers to schedule different types of workloads can lead to concurrent resource update conflicts, as each scheduler has a global view of resources. To avoid this issue, a unified scheduler is needed to schedule both online and offline workloads.

As the industry's first cloud-native batch computing project, Volcano natively supports the scheduling and management of AI and big data workloads. It also supports multi-tenant queue management and fair scheduling, unifying support for almost all mainstream computing frameworks, including Ray, Kubeflow, Spark, Flink, PyTorch, TensorFlow, MPI, Horovod, MindSpore, PaddlePaddle, MXNet, Argo, and more. It integrates Kubernetes' default scheduling algorithms, supporting unified scheduling of batch jobs and microservices, and prioritizes scheduling based on the job's QoS model. Therefore, it supports unified scheduling of online and offline workloads.

### Dynamic Resource Oversubscription

Kubernetes' existing resource scheduling model is based on Pod requests. However, users often blindly set high request values while actual usage is low, leading to resource waste. Additionally, online jobs exhibit significant peak and off-peak characteristics, making it ideal to oversubscribe underutilized resources during off-peak periods for offline workloads, thereby improving cluster resource utilization.

The Volcano SLO Agent dynamically calculates the allocated but unused resources of Pods and oversubscribes these resources for offline workloads, increasing Pod deployment density and improving resource utilization.

<div style="text-align: center;"> {{<figure library="1" src="./colocation/oversubscription_EN.png">}}Dynamic Resource OverSubscription Diagram</div>

The increase in oversubscribed resources changes the node's original available resources, and oversubscribed resources are exclusively used by offline workloads. Therefore, different schemes are available for calculating, reporting, and using oversubscribed resources. To better decouple from Kubernetes and support user-defined oversubscribed resource representations, Volcano provides native and extend modes for oversubscribed resource calculation and reporting. The native mode reports oversubscribed resources to the node's `allocatable` field, ensuring consistent usage patterns for online and offline workloads and improving user experience. The extend mode supports reporting oversubscribed resources as extended resources, decoupling from Kubernetes. Users can flexibly choose the reporting and usage methods of oversubscribed resources based on actual needs.

### QoS Guarantees

After colocating online and offline workloads, resource competition between offline and online workloads can cause interference with online workloads. Therefore, while improving resource utilization, it is essential to ensure the QoS of online workloads and avoid interference from offline workloads.

Offline workloads typically use various types of resources, so resource isolation measures need to be implemented for each dimension. Volcano sets resource isolation for CPU, memory, and network through kernel interfaces. When resource competition occurs between online and offline workloads, the resource usage of offline workloads is suppressed to prioritize the QoS of online workloads.

- **CPU:** The OS provides five levels of CPU QoS, ranging from -2 to 2. Higher QoS levels indicate more CPU time slices and higher preemption priority. By setting the `cpu.qos_level` in the CPU subsystem's cgroup, different CPU QoS levels can be assigned to different workloads.

- **Memory:** Memory isolation ensures that offline jobs are preferentially OOM killed when the system experiences OOM. By setting the `memory.qos_level` in the memory subsystem's cgroup, different Memory QoS levels can be assigned to different workloads.

- **Network:** Network isolation ensures egress bandwidth guarantees for online jobs. It is based on the node's total bandwidth and uses cgroup, tc, and eBPF technologies to suppress the egress bandwidth of offline jobs for online workloads.

<div style="text-align: center;"> {{<figure library="1" src="./colocation/network.png">}}
Network Isolation Solution
</div>

The figure above shows the technical solution for network isolation. By injecting rate-limiting programs into the kernel using eBPF, packet forwarding is controlled to achieve rate limiting. The cgroup eBPF can label packets of online and offline workloads to distinguish their traffic. The tc eBPF sets three watermarks: online workload watermark, offline workload high watermark, and offline workload low watermark. When online workload traffic exceeds the watermark, the bandwidth of offline workloads is limited, with the upper limit set to the offline workload low watermark, yielding to online traffic. When online workload traffic is below the watermark, the bandwidth limit for offline workloads is lifted, with the upper limit set to the offline workload high watermark, improving resource utilization. Additionally, the packet sending time (EDT) can be calculated based on the bandwidth of offline traffic to implement rate limiting for offline workloads.

<div style="text-align: center;"> {{<figure library="1" src="./colocation/watermark.png">}}
Bandwidth Limitation Diagram for Online and Offline Workloads
</div>

### CPU Burst

If a container in a Pod has a CPU limit set, the container's CPU usage will be capped at the limit value, resulting in CPU throttling. Frequent CPU throttling can affect workload performance, increasing the tail latency of workload responses, especially for latency-sensitive workloads.

The CPU Burst capability of the Volcano agent provides an elastic throttling mechanism that allows brief bursts beyond the CPU limit to reduce workload tail latency. The principle is that when a workload has unused CPU quota in a CPU scheduling period, the system accumulates these unused quotas. In subsequent scheduling periods, if the workload needs to exceed the CPU limit, it can use the accumulated CPU quota to achieve a burst beyond the limit.

When CPU Burst is not enabled, the container's CPU usage is strictly limited to the CPU limit, and bursting is not possible. As shown below:

<div style="text-align: center;"> {{<figure library="1" src="./colocation/cpu-burst1-EN.png">}}
</div>

When CPU Burst is enabled, the container's CPU usage can exceed the limit, enabling bursting. As shown below:

<div style="text-align: center;"> {{<figure library="1" src="./colocation/cpu-burst2-EN.png">}}
</div>

With the CPU Burst capability provided by the Volcano agent, high-priority workloads can avoid throttling at critical moments, ensuring the stability of latency-sensitive workloads.

## Usage Guide

### Installing the Volcano Agent

Please follow this [document](https://github.com/volcano-sh/volcano?tab=readme-ov-file#quick-start-guide) to install Volcano, and then use the following command to install the Volcano agent.

```shell
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/master/installer/volcano-agent-development.yaml
```

Check that all Volcano components are running successfully.

```shell
kubectl get po -n volcano-system
NAME                                   READY   STATUS      RESTARTS   AGE
volcano-admission-76bd985b56-fnpjg     1/1     Running     0          3d
volcano-admission-init-wmxc7           0/1     Completed   0          3d
volcano-agent-q85jn                    1/1     Running     0          3d
volcano-controllers-7655bb499f-gpg9l   1/1     Running     0          3d
volcano-scheduler-6bf4759c45-c666z     1/1     Running     0          3d
```

Enable colocation and oversubscription by labeling nodes.

```shell
kubectl label node $node volcano.sh/oversubscription=true # replace $node with real node name in your Kubernetes cluster.

kubectl label node $node volcano.sh/colocation=true # replace $node with real node name in your Kubernetes cluster.
```

### CPU Burst Example

This example demonstrates how to use CPU Burst and its benefits.

#### Enabling CPU Burst

Deploy a Deployment and expose a ClusterIP service. The annotation `volcano.sh/enable-quota-burst: "true"` enables CPU Burst for the Pod.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
      annotations: 
        volcano.sh/enable-quota-burst: "true" # pod enabled CPU Burst 
    spec:
      containers:
      - name: container-1
        image: nginx:latest
        resources:
          limits:
            cpu: "2"
          requests:
            cpu: "1"
---
apiVersion: v1
kind: Service
metadata:
  name: nginx
  namespace: default
  labels:
    app: nginx
spec:
  selector:
    app: nginx
  ports:
    - name: http
      targetPort: 80
      port: 80
      protocol: TCP
  type: ClusterIP
```

#### Stress Testing

Use the `stress` tool to apply pressure to the nginx Pod.

```bash
wrk -H "Accept-Encoding: deflate, gzip" -t 2 -c 8 -d 120  --latency --timeout 2s http://$(kubectl get svc nginx -o jsonpath='{.spec.clusterIP}')
```

#### Checking CPU Throttling

Check the CPU throttling status of the Pod's container. We can see that `nr_bursts` and `burst_time` are not zero, while `nr_throttled` and `throttled_time` are relatively small, indicating that the Pod has used burst CPU quotas.

```bash
cat /sys/fs/cgroup/cpu/kubepods/burstable/podd2988e14-83bc-4d3d-931a-59f8a3174396/cpu.stat # replace nginx pod uid in your Kubernetes cluster.
nr_periods 1210
nr_throttled 9
throttled_time 193613865
nr_bursts 448
burst_time 6543701690
```

If we set the Pod's annotation `volcano.sh/enable-quota-burst=false` (disabling CPU Burst) and perform another stress test, `nr_throttled` and `throttled_time` will be relatively large, indicating strict CPU throttling, while `nr_bursts` and `burst_time` will be zero, indicating no CPU Burst occurred.

```bash
cat /sys/fs/cgroup/cpu/kubepods/burstable/podeeb542c6-b667-4da4-9ac9-86ced4e93fbb/cpu.stat #replace nginx pod uid in your Kubernetes cluster.
nr_periods 1210
nr_throttled 488
throttled_time 10125826283
nr_bursts 0
burst_time 0
```

#### Notes

CPU Burst relies on Linux kernel functionality. This feature is only effective on hosts with Linux kernel versions >= 5.14 and certain Linux distributions (e.g., OpenEuler 22.03 SP2 or later).

### Dynamic Resource Oversubscription Example

This example demonstrates the dynamic resource capabilities on a node and shows the suppression and eviction mechanisms when the node faces resource pressure. The node is configured with 8 CPU cores and 16GB of memory.

#### Checking Node Oversubscribed Resources

Oversubscribed resources on a node are calculated by subtracting the actual resource usage from the node's allocatable resources. Oversubscribed resources include CPU and memory, represented by `kubernetes.io/batch-cpu` and `kubernetes.io/batch-memory`, respectively, and reported as extended resources in the node's `Allocatable` field. Online tasks use native resources (`cpu` and `memory`), while offline tasks use oversubscribed resources (`kubernetes.io/batch-cpu` and `kubernetes.io/batch-memory`), increasing Pod deployment density and resource utilization.

```bash
kubectl describe node $node # replace $node with a real node in your cluster
Allocatable:
  cpu:                         8
  ephemeral-storage:           33042054704
  hugepages-1Gi:               0
  hugepages-2Mi:               0
  kubernetes.io/batch-cpu:     7937 # CPU oversubscribed resources, in millicores (1 core = 1000 millicores)
  kubernetes.io/batch-memory:  14327175770 # Memory oversubscribed resources, in bytes
  memory:                      15754924Ki
  pods:                        110
```

#### Deploying Online and Offline Jobs

Online jobs are identified by setting the annotation `volcano.sh/qos-level: "LC"`, `volcano.sh/qos-level: "HLS"`, or `volcano.sh/qos-level: "LS"`. Offline jobs are identified by setting the annotation `volcano.sh/qos-level: "BE"` and can only use oversubscribed resources (`kubernetes.io/batch-cpu` and `kubernetes.io/batch-memory`). We use an image containing the `stress` tool to simulate the pressure increase of online jobs. If you cannot access this image, you can replace it with another image containing the `stress` tool.

```yaml
# Online Job
apiVersion: apps/v1
kind: Deployment
metadata:
  name: online-demo
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: online-demo
  template:
    metadata:
      labels:
        app: online-demo
      annotations:
        volcano.sh/qos-level: "HLS" # Identify online jobs
    spec:
      containers:
      - name: container-1
        image: polinux/stress
        imagePullPolicy: IfNotPresent
        command: ["stress", "--cpu", "7"] # Run stress test
        resources:
          requests:
            cpu: 2
---
# Offline Job
apiVersion: apps/v1
kind: Deployment
metadata:
  name: offline-demo
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: offline-demo
  template:
    metadata:
      labels:
        app: offline-demo
      annotations: 
        volcano.sh/qos-level: "BE" # Identify offline jobs
    spec:
      containers:
      - name: container-1
        image: nginx:latest
        resources:
          requests:
            kubernetes.io/batch-cpu: 4000 # 4 CPU cores
            kubernetes.io/batch-memory: 10737418240 # 10Gi memory
```

#### Ensuring Online and Offline Jobs Run Successfully

```bash
kubectl get po
NAME                          READY   STATUS    RESTARTS   AGE
offline-demo-f59758bb-vlbp7   1/1     Running   0          6s
online-demo-9f9bbdb58-fljzs   1/1     Running   0          6s
```

#### Eviction Mechanism Under Node Pressure

When a node experiences pressure and resource utilization reaches the set threshold, the eviction mechanism is triggered. The QoS of online jobs is guaranteed by both the **Volcano Agent** and the **host OS**. The Volcano Agent monitors node resource utilization in real-time. When node resource utilization exceeds the threshold, offline jobs are evicted. For CPU resources, the default threshold is **80%**. We simulate resource pressure by applying **7 CPU cores of pressure** to the online job. After about 1 minute, we can observe the offline job being evicted through event logs.

```bash
kubectl get event | grep Evicted
69s         Warning   Evicted                   pod/offline-demo-785cff7f58-gwqwc    Evict offline pod due to CPU resource pressure
```

When node resource pressure increases, we can observe that oversubscribed resources (`kubernetes.io/batch-cpu` and `kubernetes.io/batch-memory`) decrease. This is because oversubscribed resources are calculated by subtracting actual resource usage from the node's allocatable resources. When resource usage by online or offline jobs increases, the node's available resources decrease, leading to a reduction in oversubscribed resources.

```bash
kubectl describe node $node # replace $node with a real node in your cluster
Allocatable:
  cpu:                         8
  ephemeral-storage:           33042054704
  hugepages-1Gi:               0
  hugepages-2Mi:               0
  kubernetes.io/batch-cpu:     978 # CPU oversubscribed resources decrease
  kubernetes.io/batch-memory:  14310391443
  memory:                      15754924Ki
  pods:                        110
```

When eviction occurs, the **Volcano Agent** adds an eviction taint to the current node to prevent new workloads from being scheduled to the node, avoiding additional burden on the already pressured node. We can observe that newly created offline job Pods will remain in the `Pending` state due to this eviction taint.

```bash
kubectl get po
NAME                          READY   STATUS    RESTARTS   AGE
offline-demo-f59758bb-kwb54   0/1     Pending   0          58s
online-demo-9f9bbdb58-54fnx   1/1     Running   0          2m1s

kubectl describe po offline-demo-f59758bb-kwb54
Events:
  Type     Reason            Age   From               Message
  ----     ------            ----  ----               -------
  Warning  FailedScheduling  69s   default-scheduler  0/1 nodes are available: 1 node(s) had taint {volcano.sh/offline-job-evicting: }, that the pod didn't tolerate.
```

If the online job is stopped to release node resource pressure, the **Volcano Agent** detects the decrease in node resource utilization and automatically removes the eviction taint. Once the taint is removed, new Pods can be scheduled to the node normally.

#### Notes

The **Volcano Agent** defines a QoS resource model for online and offline jobs and provides application-level guarantees for online jobs (e.g., evicting offline jobs under node resource pressure). Meanwhile, CPU and memory isolation and suppression are guaranteed at the OS level by the **host kernel**. Note that the Volcano Agent currently only supports **openEuler 22.03 SP2** and later versions, so ensure the correct OS type and version when using this feature.

### Egress Network Bandwidth Guarantee Example

In the egress network bandwidth isolation mechanism, the bandwidth usage of offline jobs is limited, especially when online jobs require more bandwidth. To achieve finer bandwidth control, three watermark parameters are typically defined to dynamically adjust the bandwidth allocation for offline jobs.

<table>
  <thead>
    <tr>
      <th style="text-align:center">Watermark</th>
      <th style="text-align:center">Description</th>
      <th style="text-align:center">Default Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="text-align:center"><code>onlineBandwidthWatermarkPercent</code></td>
      <td style="text-align:center">The ratio of the online bandwidth watermark value to the node's base bandwidth: <br><code>onlineBandwidthWatermark</code> value = node base bandwidth * <code>onlineBandwidthWatermarkPercent</code> / 100</td>
      <td style="text-align:center">&nbsp;&nbsp;&nbsp;80&nbsp;&nbsp;&nbsp;</td>
    </tr>
    <tr>
      <td style="text-align:center"><code>offlineHighBandwidthPercent</code></td>
      <td style="text-align:center">The ratio of the offline high bandwidth watermark value to the node's base bandwidth: <br><code>offlineHighBandwidth</code> value = node base bandwidth * <code>offlineHighBandwidthPercent</code> / 100<br>It represents the upper limit of bandwidth that can be used by offline workloads when the online workloads use bandwidth ratio less than <code>onlineBandwidthWatermarkPercent</code>.<br>For example: node base bandwidth = 100Mbps, <code>onlineBandwidthWatermarkPercent</code> = 80, <code>offlineHighBandwidthPercent</code> = 40, when online workloads use bandwidth less than 100Mbps * 0.8 = 80Mbps, then the offline workloads can use at most 100Mbps * 0.4 = 40Mbps bandwidth.</td>
      <td style="text-align:center">&nbsp;&nbsp;&nbsp;40&nbsp;&nbsp;&nbsp;</td>
    </tr>
    <tr>
      <td style="text-align:center"><code>offlineLowBandwidthPercent</code></td>
      <td style="text-align:center">The ratio of the offline low bandwidth watermark value to the node's base bandwidth: <br><code>offlineLowBandwidth</code> value = node base bandwidth * <code>offlineLowBandwidthPercent</code> / 100<br>It represents the upper limit of bandwidth that can be used by offline workloads when the online workloads use bandwidth ratio more than <code>onlineBandwidthWatermarkPercent</code>.<br>For example: node bandwidth = 100Mbps, <code>onlineBandwidthWatermarkPercent</code> = 80, <code>offlineLowBandwidthPercent</code> = 10, when online workloads use bandwidth more than 100Mbps * 0.8 = 80Mbps, then the offline workloads can use at most 100Mbps * 0.1 = 10Mbps bandwidth.</td>
      <td style="text-align:center">&nbsp;&nbsp;&nbsp;10&nbsp;&nbsp;&nbsp;</td>
    </tr>
  </tbody>
</table>

#### Setting Node Network Bandwidth

This example demonstrates how online jobs suppress the entire network bandwidth of offline jobs. We will use the `iperf` tool to simulate the ingress bandwidth traffic of online and offline jobs.

Add the annotation `volcano.sh/network-bandwidth-rate` to all nodes to specify the network bandwidth rate. The example sets the value to `1000Mbps`. Please set an appropriate value based on your actual environment and replace `$node` with the actual node name.

```bash
kubectl annotate node $node_name volcano.sh/network-bandwidth-rate=1000
```

#### Deploying Online and Offline Jobs

Deploy an online and offline Deployment. Replace `$node_ip` with the node IP accessible to the Pod in your environment. Also, start the `iperf` server on the `$node_ip` node using the command `iperf -s` to ensure the Pod can access the `iperf` server.

```yaml
# Online Job
apiVersion: apps/v1
kind: Deployment
metadata:
  name: online-iperf
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: online-iperf
  template:
    metadata:
      labels:
        app: online-iperf
      annotations:
        volcano.sh/qos-level: "HLS" # Identify online jobs
    spec:
      containers:
      - name: container-1
        image: volcanosh/iperf
        command:
        - /bin/sh
        - -c
        - |
          iperf -c $node_ip -i 1 -t 30 -f mb # Simulate bandwidth consumption
          echo finished...
          sleep 1000000
---
# Offline Job
apiVersion: apps/v1
kind: Deployment
metadata:
  name: offline-iperf
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: offline-iperf
  template:
    metadata:
      labels:
        app: offline-iperf
      annotations: 
        volcano.sh/qos-level: "BE" # Identify offline jobs
    spec:
      containers:
      - name: container-1
        image: volcanosh/iperf
        command:
        - /bin/sh
        - -c
        - |
          iperf -c $node_ip -i 1 -t 30 -f mb # Simulate bandwidth consumption
          echo finished...
          sleep 1000000
```

#### Viewing Logs

View the logs of online and offline jobs:

Online job logs:

```bash
Connecting to host 192.168.2.30, port 5201
[  5] local 192.168.2.115 port 58492 connected to 192.168.2.30 port 5201
[ ID] Interval           Transfer     Bandwidth         
[  5]   0.00-1.00   sec   118 MBytes  990 Mbits/sec 
[  5]   1.00-2.00   sec   106 MBytes  889 Mbits/sec 
[  5]   2.00-3.00   sec   107 MBytes  897 Mbits/sec 
[  5]   3.00-4.00   sec   107 MBytes  903 Mbits/sec 
[  5]   4.00-5.00   sec   107 MBytes  899 Mbits/sec
[  5]   5.00-6.00   sec   107 MBytes  902 Mbits/sec
[  5]   6.00-7.00   sec   705 MBytes  884 Mbits/sec
...
```

Offline job logs:

```bash
Connecting to host 192.168.2.30, port 5201
[  5] local 192.168.2.115 port 44362 connected to 192.168.2.30 port 5201
[ ID] Interval           Transfer     Bandwidth         
[  5]   0.00-1.00   sec   8 MBytes  70 Mbits/sec 
[  5]   1.00-2.00   sec   12 MBytes  102 Mbits/sec 
[  5]   2.00-3.00   sec   11 MBytes  98 Mbits/sec 
[  5]   3.00-4.00   sec   11 MBytes  99 Mbits/sec 
[  5]   4.00-5.00   sec   11 MBytes  99 Mbits/sec
[  5]   5.00-6.00   sec   11 MBytes  97 Mbits/sec
[  5]   6.00-7.00   sec   11 MBytes  98 Mbits/sec
...
```

We can see that when the bandwidth usage of online jobs exceeds the node's `onlineBandwidthWatermarkPercent` (default 80), offline jobs can only use about 10% of the bandwidth, indicating that when online jobs use network bandwidth beyond the watermark, the network bandwidth usage of offline jobs is suppressed to a lower value.

### Advanced Settings

#### Feature Toggles

The colocation feature has a unified toggle on nodes. If a node has the label `volcano.sh/oversubscription=true` or `volcano.sh/colocation=true`, the colocation feature is enabled. You can remove these labels to disable all colocation features. When a node has these labels, all colocation features take effect.

- If you only want to use the colocation feature for online and offline jobs without enabling resource oversubscription, simply set the node label `volcano.sh/colocation="true"`.
- If you want to use both the colocation feature and resource oversubscription, set the node label `volcano.sh/oversubscription=true`.

By default, the `volcano-agent-configuration` ConfigMap in the `volcano-system` namespace holds all configurations for the Volcano Agent.

Each colocation feature (CPU Burst / Dynamic Resource Oversubscription / Egress Network Bandwidth Guarantee) has an independent toggle. You can enable or disable each feature by modifying the `volcano-agent-configuration` ConfigMap in the `volcano-system` namespace.

- Set the `enable` field to `true` to enable the CPU Burst feature, or `false` to disable it.

  ```json
  "cpuBurstConfig":{
     "enable": true 
  }
  ```

- Set the `enable` field to `true` to enable the dynamic resource oversubscription feature, or `false` to disable it.

  ```json
  "overSubscriptionConfig":{
     "enable": true,
  }
  ```

- Set the `enable` field to `true` to enable the egress network bandwidth guarantee feature, or `false` to disable it.

  ```json
  "networkQosConfig":{
     "enable": true,
  }
  ```

#### CPU Burst

For containers in Pods with the CPU Burst feature enabled, their CPU usage can burst up to the container's CPU limit (`cpu limit`). If multiple Pods use burst CPU resources simultaneously, CPU contention may occur, affecting the CFS (Completely Fair Scheduler) scheduling of the CPU.

You can specify a custom burst quota by setting the Pod's annotation `volcano.sh/quota-burst-time`. For example:

If a container's CPU limit is 4 cores, the Volcano Agent defaults the container's CGroup `cpu.cfs_quota_us` value to `400000` (the CFS base period is `100000`, so 4 cores correspond to `4 * 100000 = 400000`). This means the container can burst up to 4 additional CPU cores at a time. If you set `volcano.sh/quota-burst-time=200000`, the container can only burst up to 2 additional CPU cores at a time.

#### Dynamic Resource Oversubscription

By default, the calculation of oversubscribed resources and the eviction of offline workloads only consider the resource usage of Pods on the node. If you want to consider the resource utilization of the node itself, set the Volcano agent's `--include-system-usage=true` flag.

To avoid excessive pressure on nodes, the Volcano agent sets an oversubscription ratio to determine the ratio of idle resource oversubscription. You can change this parameter by setting the `--oversubscription-ratio` flag. The default value is 60, meaning 60% of idle resources will be oversubscribed. If you set `--oversubscription-ratio=100`, all idle resources will be oversubscribed.

When a node is under pressure, the Volcano agent evicts offline workloads. The eviction threshold can be configured via the `volcano-agent-configuration` ConfigMap. `"evictingCPUHighWatermark":80` means eviction will occur when the node's CPU utilization exceeds 80% for a period, and the node cannot schedule new Pods during eviction. `"evictingCPULowWatermark":30` means the node will resume scheduling when the CPU utilization drops below 30%. `evictingMemoryHighWatermark` and `evictingMemoryLowWatermark` have the same meaning but apply to memory resources.

```json
"evictingConfig":{
  "evictingCPUHighWatermark": 80,
  "evictingMemoryHighWatermark": 60,
  "evictingCPULowWatermark": 30,
  "evictingMemoryLowWatermark": 30
}
```

#### Egress Network Bandwidth Guarantee

You can adjust the online and offline bandwidth watermarks by modifying the `volcano-agent-configuration` ConfigMap. `qosCheckInterval` represents the interval for monitoring bandwidth watermarks by the Volcano agent. Be cautious when modifying this value.

```json
"networkQosConfig":{  
   "enable": true,  
   "onlineBandwidthWatermarkPercent": 80,  
   "offlineHighBandwidthPercent":40,  
   "offlineLowBandwidthPercent": 10,
   "qosCheckInterval": 10000000
 }
```

#### Custom Oversubscription Policy Development

The Volcano agent defaults to using the [extend](https://github.com/volcano-sh/volcano/tree/master/pkg/agent/oversubscription/policy) method to report and use oversubscribed resources, i.e., reporting oversubscribed resources as an extended resource type to the node. If you want to customize the reporting and usage of oversubscribed resources, such as reporting them as native CPU and memory resources, and customize suspension and resumption of scheduling behaviors, implement the [policy Interface](https://github.com/volcano-sh/volcano/blob/4dea29b334877058786615ac1ed79143601dc600/pkg/agent/oversubscription/policy/policy.go#L48) to develop a custom oversubscription policy, and set the Volcano agent's startup parameter `oversubscription-policy` to the corresponding policy.
