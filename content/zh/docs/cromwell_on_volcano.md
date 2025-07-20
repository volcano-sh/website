+++
title =  "Cromwell on Volcano"

date = 2025-07-20
lastmod = 2025-07-20

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Cromwell"
[menu.docs]
  parent = "zoology"
  weight = 3

+++



### Cromwell简介

Cromwell 是一个面向科学工作流程的工作流管理系统。

### Cromwell on volcano

Cromwell可以与Volcano集成，以便在Kubernetes环境中高效地调度和执行生物信息学工作流。

要使Cromwell与Volcano集群交互并向其分派作业，可以使用以下基本配置：

```hocon
hoconVolcano {
  actor-factory = "cromwell.backend.impl.sfs.config.ConfigBackendLifecycleActorFactory"
  config {
    runtime-attributes = """
    Int runtime_minutes = 600
    Int cpus = 2
    Int requested_memory_mb_per_core = 8000
    String queue = "short"
    """

    submit = """
        vcctl job run -f ${script}
    """
    kill = "vcctl job delete -N ${job_id}"
    check-alive = "vcctl job view -N ${job_id}"
    job-id-regex = "(\\d+)"
  }
}
```

需要注意，这个配置示例是社区贡献的，因此不受官方支持。