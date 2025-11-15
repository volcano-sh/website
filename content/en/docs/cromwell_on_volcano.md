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



# Cromwell Introduction

Cromwell is a workflow management system designed for scientific workflows.

# Cromwell on Volcano

Cromwell can be integrated with Volcano to efficiently schedule and execute bioinformatics workflows in Kubernetes environments.

To make Cromwell interact with a Volcano cluster and dispatch jobs to it, you can use the following basic configuration:

```hocon
hoconhoconVolcano {
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

Please note that this configuration example is community-contributed and therefore not officially supported.