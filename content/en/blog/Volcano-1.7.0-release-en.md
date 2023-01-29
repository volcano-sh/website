+++
title =  "Volcano 1.7.0 Available Now"
description = "New features: enhanced plugin for PyTorch Jobs, Ray on Volcano, enhanced scheduling for general Kubernetes services, multi-architecture images of Volcano, and optimized queue status info"
subtitle = ""

date = 2023-01-12
lastmod = 2023-01-12
datemonth = "Jan"
dateyear = "2023"
dateday = 12

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["volcano"]

tags = ["Practice"]
summary = "New features: enhanced plugin for PyTorch Jobs, Ray on Volcano, enhanced scheduling for general Kubernetes services, multi-architecture images of Volcano, and optimized queue status info"

# Add menu entry to sidebar.
linktitle = "Volcano 1.7.0 Available Now"
[menu.posts]
parent = "tutorials"
weight = 6
+++

<p></p>
Volcano 1.7.0 is now available with the following new features:

- **enhanced plugin for PyTorch Jobs**
- **Ray on Volcano**
- **enhanced scheduling for general Kubernetes services**
- **multi-architecture images of Volcano**
- **optimized queue status info**

{{<figure library="1" src="volcano_logo.png" width="50%">}}
Volcano is the industry-first cloud native batch computing project. Open-sourced at KubeCon Shanghai in June 2019, it became an official CNCF project in April 2020. In April 2022, Volcano was promoted to a CNCF incubating project. By now, more than 490 global developers have committed code to the project. The community is seeing growing popularity among developers, partners, and users.

### Key Features

#### 1. Enhanced Plugin for PyTorch Jobs
As one of the most popular AI frameworks, PyTorch has been widely used in deep learning fields such as computer vision and natural language processing. More and more users turn to Kubernetes to run PyTorch in containers for higher resource utilization and parallel processing efficiency.

Volcano 1.7 enhanced the plugin for PyTorch Jobs, freeing you from the manual configuration of container ports, MASTER_ADDR, MASTER_PORT, WORLD_SIZE, and RANK environment variables.

Other enhanced plugins include those for TensorFlow, MPI, and PyTorch Jobs. They are designed to help you run computing jobs on desired training frameworks with ease.

Volcano also provides an extended development framework for you to tailor Job plugins to your needs.

Design Documentation: [Pytorch-plugin](https://github.com/volcano-sh/volcano/blob/master/docs/design/distributed-framework-plugins.md#pytorch-plugin)<br>
User Guide: [Pytorch-plugin-user-guide](https://github.com/volcano-sh/volcano/blob/master/docs/user-guide/how_to_use_pytorch_plugin.md#pytorch-plugin-user-guide)<br>
Issue：[#2292](https://github.com/volcano-sh/volcano/issues/2292)<br>


#### 2. Ray on Volcano
Ray is a unified framework for extending AI and Python applications. It can run on any machine, cluster, cloud, and Kubernetes cluster. Its community and ecosystem are growing steadily.

As machine learning workloads are hosting computing jobs at a density higher than ever before, single-node environments are failing in providing enough resources for training tasks. Here's where Ray comes in, which seamlessly coordinates resources of the entire cluster, instead of a single node, to run the same set of code. Ray is designed for common scenarios and any type of workloads.

For users running multiple types of Jobs, Volcano partners with Ray to provide high-performance batch scheduling. Ray on Volcano has been released in [KubeRay v0.4](https://github.com/ray-project/kuberay/releases/tag/v0.4.0).

User Guide: [KubeRay-integration-with-Volcano](https://ray-project.github.io/kuberay/guidance/volcano-integration/#kuberay-integration-with-volcano)<br>
Issue: [#2429](https://github.com/volcano-sh/volcano/issues/2429)，  [#213](https://github.com/ray-project/kuberay/issues/213)<br>

#### 3. Enhance Scheduling for General Kubernetes Services
Schedulers have their own advantages according to the use case. For example, in batch computing, Volcano provides more scheduling policies and capabilities. In general scheduling, the Kubernetes default scheduler is more balanced. However, it's often the case that a user runs multiple types of tasks in the same cluster. When there are both batch computing and general tasks, scheduling can be a challenge.

Starting from version 1.7, Volcano becomes fully compatible with the Kubernetes default scheduler to schedule and manage long-running services. Now you can use Volcano to centrally schedule both batch computing and general workloads.

**Enhancements:**
<ul>
    <li>Supports multiple types of schedulers for Volcano scheduler and webhook.</li>
    <li>Supports NodeVolumeLimits plugin.</li>
    <li>Supports VolumeZone plugin.</li>
    <li>Supports PodTopologySpread plugin.</li>
    <li>Supports SelectorSpread plugin.</li>
</ul>

Support for Kubernetes 1.25 is also available in Volcano 1.7.

Issue: [#2394](https://github.com/volcano-sh/volcano/issues/2394)，[#2510](https://github.com/volcano-sh/volcano/issues/2510)

#### 4. Multi-architecture Images
You can now compile multi-architecture Volcano images by a few clicks through cross compilation. For example, you can compile the base images of the amd64 and arm64 architectures on an amd64 host and push the images to the image repository. During installation and deployment, the system automatically selects a proper image based on the host architecture for you, more user-friendly than before.

User Guide: [building-docker-images](https://github.com/volcano-sh/volcano/blob/master/docs/development/development.md#building-docker-images)<br>
Issue: [#2435](https://github.com/volcano-sh/volcano/pull/2435)<br>

#### 5. Optimized Queue Status Info
Volcano can now collect statistics on allocated resources in real time to the queue status info, which eases dynamic resource adjustment and puts cluster resources into good use.

Volcano allocates and manages cluster resources by queues. The Capability field limits the resource use for each queue, which is a hard ceiling.

Before, users had no clear view on the allocated resources in queues and idle resources among those defined by Capability. Creating a large number of workloads against insufficient resources may cause job suspension and unexpected cluster scale-out triggered by autoscaler, increasing the cloud resource costs. Now with more detailed status info, you can manage cluster resources more efficiently and avoid excess costs.

Issue: [#2571](https://github.com/volcano-sh/volcano/issues/2571)

### Contributors
Volcano 1.7.0 is brought into being from hundreds of code commits from 29 contributors. Thanks for your contributions.

**Contributors on GitHub:**<br>
<table>
  <tr>
    <td>@xiaoxubeii</td>
    <td>@jsolbrig</td>
    <td>@Yikun</td>
  </tr>
  <tr>
    <td>@tgaddair</td>
    <td>@william-wang</td>
    <td>@elinx</td>
  </tr>
  <tr>
    <td>@Abirdcfly</td>
    <td>@xiaoanyunfei</td>
    <td>@qiankunli</td>
  </tr>
  <tr>
    <td>@wpeng102</td>
    <td>@waiterQ</td>
    <td>@hwdef</td>
  </tr>
  <tr>
    <td>@WingkaiHo</td>
    <td>@Monokaix</td>
    <td>@kerthcet</td>
  </tr>
  <tr>
    <td>@WulixuanS</td>
    <td>@autumn0207</td>
    <td>@jinzhejz</td>
  </tr>
  <tr>
    <td>@lucming</td>
    <td>@jimoosciuc</td>
    <td>@LY-today</td>
  </tr>
  <tr>
    <td>@dontan001</td>
    <td>@wangyang0616</td>
    <td>@Akiqqqqqqq</td>
  </tr>
  <tr>
    <td>@zhoumingcheng</td>
    <td>@jiangkaihua</td>
    <td>@Thor-wl</td>
  </tr>
  <tr>
    <td>@ccchenjiahuan</td>
    <td>@zhifanggao</td>
    <td>&nbsp;</td>
  </tr>
</table>                              

#### Links
Release note：[v1.7.0](https://github.com/volcano-sh/volcano/releases/tag/v1.7.0)<br>
Branch：[release-1.7](https://github.com/volcano-sh/volcano/tree/release-1.7)<br>

### About Volcano
Volcano is designed for high-performance computing applications such as AI, big data, gene sequencing, and rendering, and supports mainstream general computing frameworks. More than 26,000 global developers joined us, among whom the in-house ones come from companies such as Huawei, AWS, Baidu, Tencent, JD, and Xiaohongshu. There are 2,800 Stars and 670 Forks for the project. Volcano has been proven feasible for mass data computing and analytics, such as AI, big data, and gene sequencing. Supported frameworks include Spark, Flink, TensorFlow, PyTorch, Argo, MindSpore, Paddlepaddle, Kubeflow, MPI, Horovod, MXNet, KubeGene, and Ray. The ecosystem is thriving with more developers and use cases coming up.