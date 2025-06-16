+++
title =  "Volcano completes security audit"
description = "Volcano completes 2025 security audit"
subtitle = ""

date = 2025-05-30
lastmod = 2025-05-30
datemonth = "May"
dateyear = "2025"
dateday = 30

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "posts"  # Do not modify.
authors = ["Adam Korczynski, Ada Logics", "Xavier Chang, Huawei and Volcano maintainer"]

tags = ["News"]
summary = "Volcano completes 2025 security audit"

# Add menu entry to sidebar.
linktitle = "volcano 2025 security audit"
[menu.posts]
parent = "news"
weight = 6
+++

Volcano is excited to announce the completion of our CNCF-funded security audit carried out by [Ada Logics](https://adalogics.com/) and facilitated by [OSTIF](https://ostif.org/) in collaboration with the Volcano maintainers. The audit was scoped to cover the Volcano source code, supply-chain risks and fuzzing. The auditing team identified 10 security issues which the Volcano security team has fixed with the completion of the audit. 

Volcano has addressed several infrastructure-level security issues by making targeted configuration changes that reduce risk and improve the default security posture of its default deployment. Below is a breakdown of each issue, the associated risks, and how Volcano resolved them, along with the resulting security improvements.

One issue involved several Volcano components running with root privileges by default. Containers running as root pose an increased security risk in that if compromised, an attacker gains access to capabilities they can use to escalate their privileges. Volcano fixed this by configuring all components - including the scheduler, admission controller, controllers, and dashboard - to run as non-root by default. This change limits the scope of what an attacker can do inside a container and helps contain breaches more effectively.

Another issue was the absence of seccomp profiles across Volcano’s workloads. Without seccomp, containers can invoke any Linux system call which increases the attack surface for kernel-level attacks and container escapes. Volcano addressed this by adding seccomp profiles, specifically using `RuntimeDefault`, which restricts containers to a safe subset of system calls. This reduces the kernel’s exposure and strengthens runtime isolation.

Volcano also lacked SELinux in its containers. SELinux manages access control at the kernel level and limits how processes can interact with files, system resources, and other processes. Volcano added `SELinux` to all its pods and containers. 

In addition, Volcano had previously assigned containers with unnecessary Linux capabilities—fine-grained permissions that determine what a containerized process can do. For example, capabilities like `CAP_NET_ADMIN` or `CAP_SYS_ADMIN` grant significant power and are often unnecessary for typical application logic. Volcano mitigated this risk by removing non-essential capabilities using a “drop all” approach and only adding back specific permissions if needed. This reduces the attack surface and enforces the principle of least privilege.

Prior to the audit, Volcano allowed containers to escalate privileges during execution, which could permit non-privileged processes to gain additional privileges. Such privilege escalation increases the risk of bypassing container security controls. Volcano resolved this by setting `allowPrivilegeEscalation: false` in its containers and pods ensuring that processes run only with the privileges they were initially assigned.

These changes help contain potential attacks, reduce the avenues for privilege escalation or container breakout, and enhance the overall resilience of the system in multi-tenant and production environments.

On the application side, the auditors identified 5 issues, of which the most interesting was an issue where an attacker who had compromised an elastic service or an extender plugin in the cluster could cause denial of service of the Volcano scheduler. This issue was assigned CVE-2025-32777 of HIGH severity.

## Fuzzing

During the audit, Ada Logics integrated volcano into [Googles OSS-Fuzz project](https://github.com/google/oss-fuzz/tree/master/projects/volcano) with two initial fuzz tests. OSS-Fuzz is an open source project that other critical open source projects can integrate into. Google runs integrated projects’ fuzzers on vast amounts of compute and reports any findings to the projects team via email. OSS-Fuzz’s reports contain information such as stack traces, steps to reproduce, which fuzz harness found the issue and more. Periodically, OSS-Fuzz reproduces the issue to assert that it still exists. If it can’t reproduce it, OSS-Fuzz automatically marks the issue fixed.

## Getting involved in Volcano

Volcano is the industry's first cloud-native batch computing engine and the sole batch computing project within the CNCF. It operates as a Kubernetes-native batch scheduling system, enhancing the standard kube-scheduler. Volcano provides comprehensive features to manage and optimize diverse batch and elastic workloads, including AI/ML/DL, Bioinformatics/Genomics, and other "Big Data" applications. It offers robust integration with frameworks such as Spark, Flink, Ray, TensorFlow, PyTorch, Argo, MindSpore, PaddlePaddle, Kubeflow, MPI, Horovod, MXNet, and KubeGene. Drawing from over fifteen years of experience in high-performance workload operations, Volcano combines proven practices and innovative concepts to deliver a powerful and flexible scheduling solution.

We encourage you to join our community and contribute to Volcano's development. Your participation is valuable, whether you're asking questions, sharing experiences, or contributing code.

- GitHub: Access our main repository to contribute code or report issues: [https://github.com/volcano-sh/volcano](https://github.com/volcano-sh/volcano).
- Website & Documentation: Find comprehensive documentation and news on our official website: [https://volcano.sh/en/](https://volcano.sh/en/).
- Contributing Code: Our [Contribution Guide](https://github.com/volcano-sh/volcano/blob/master/contribute.md) offers detailed instructions on finding good first issues and submitting pull requests. We welcome contributions of all sizes.
- Slack Channel: Join our Slack workspace for real-time discussions and support. First, join the CNCF Slack at [https://slack.cncf.io/](https://slack.cncf.io/), then navigate to the #volcano channel: [https://cloud-native.slack.com/archives/C011GJDQS0N](https://www.google.com/search?q=https://cloud-native.slack.com/archives/C011GJDQS0N).
- Community Meetings: Participate in our regular community meetings to discuss project updates, roadmaps, and proposals.
    - [Meeting Link](https://zoom.us/j/91804791393)
    - [Meeting Notes](https://docs.google.com/document/d/1YLbF8zjZBiR9PbXQPB22iuc_L0Oui5A1lddVfRnZrqs/edit)
- Mailing List: Subscribe to our [mailing list](https://groups.google.com/forum/#!forum/volcano-sh) for important announcements and broader discussions.

You can find the audit report [here](https://volcano.sh/reports/Ada-Logics-Volcano-Security-Audit-2025.pdf).
We would like to thank all involved parties in the audit for their great work.

