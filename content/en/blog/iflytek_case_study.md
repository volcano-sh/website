+++
title =  "iFlytek Enhances AI Infrastructure with Volcano, Wins CNCF End-User Case Study Award"
description = "iFlytek was awarded for its innovative use of Volcano in the CNCF End-User Case Study Competition and shared its success in large-scale AI model training at KubeCon + CloudNativeCon China 2025."
subtitle = ""

date = 2025-06-13
lastmod = 2025-06-13
datemonth = "June"
dateyear = "2025"
dateday = 13

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["volcano"]

tags = ["News"]
summary = "iFlytek was awarded for its innovative use of Volcano in the CNCF End-User Case Study Competition and shared its success in large-scale AI model training at KubeCon + CloudNativeCon China 2025."

# Add menu entry to sidebar.
linktitle = "iFlytek Enhances AI Infrastructure with Volcano, Wins CNCF End-User Case Study Award"
[menu.posts]
parent = "news"
weight = 6
+++

<div style="text-align: center;"> {{<figure library="1" src="./kubecon/iflytek.jpeg">}}
</div>

[HONG KONG, CHINA — June 10, 2025] — The Cloud Native Computing Foundation (CNCF) today announced that iFlytek has won the CNCF End-User Case Study Competition. The CNCF, which is committed to building a sustainable ecosystem for cloud native software, recognized iFlytek for its innovative use of Volcano. The company shared its success in large-scale AI model training at the KubeCon + CloudNativeCon China conference, held in Hong Kong from June 10-11.

### iFlytek's Challenges

As a leading Chinese technology company specializing in voice and language AI, iFlytek faced significant scaling challenges amid its rapid business growth. Inefficient scheduling led to underutilized GPU resources, while complex workflow management and intense resource contention among teams slowed down research and development, straining the company's infrastructure.

**By adopting Volcano, iFlytek implemented elastic scheduling, DAG-based workflows, and multi-tenancy isolation, which simplified operations and significantly improved resource utilization.**

"Before using Volcano, coordinating training across our large-scale GPU clusters was a constant exercise in firefighting, with frequent resource bottlenecks, task failures, and complex pipeline debugging," said **DongJiang, Senior Platform Architect at iFlytek**. "Volcano gives us the flexible control we need to scale our AI training efficiently and reliably. We are honored to be recognized by the CNCF and look forward to sharing our experiences with the community at KubeCon + CloudNativeCon China."

### About Volcano

Volcano is a cloud-native batch computing system built on Kubernetes. It is designed for high-performance workloads, including AI/machine learning, big data processing, and scientific computing. Volcano offers advanced scheduling capabilities such as job orchestration, fair-share resource allocation, and queue management to efficiently handle large-scale distributed tasks. After joining the CNCF as a Sandbox project in 2020 and graduating to the Incubating stage in 2022, Volcano has become a critical tool for compute-intensive workloads.

### Significant Results iFlytek Achieved with Volcano

As the demand for AI grew, iFlytek turned to Volcano to manage its increasingly large and complex training infrastructure. The engineering team required a more efficient way to allocate resources, handle complex multi-stage training workflows, minimize job interruptions, and ensure fair resource access across teams. **With Volcano, they achieved:**

*   **A 40% improvement in GPU utilization,** leading to significantly lower infrastructure costs and reduced resource idling.
*   **A 70% faster recovery from task failures,** ensuring continuous training operations.
*   **A 50% reduction in resource interference,** ensuring service stability and resource usage flexibility.

**Chris Aniszczyk, CTO of the CNCF,** commented, "iFlytek's story is a great example of how open source technology can solve complex and critical challenges at scale. By leveraging Volcano to improve GPU efficiency and streamline their training workflows, they have reduced costs, accelerated development, and built a more reliable AI infrastructure on Kubernetes—a critical advantage for any organization at the forefront of AI."

As AI workloads become more complex and resource-intensive, iFlytek's success demonstrates that cloud-native tools like Volcano are essential for teams looking to simplify operations and enhance scalability. Their presentation at KubeCon + CloudNativeCon China [1] offers practical insights into managing distributed training more effectively in a Kubernetes environment.

### References

[1] Presentation: [https://kccncchn2025.sched.com/event/23EWS?iframe=no](https://kccncchn2025.sched.com/event/23EWS?iframe=no) 