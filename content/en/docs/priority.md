+++
title = "Priority Plugin"

date = 2021-05-13
lastmod = 2021-05-13

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Priority"
[menu.docs]
  parent = "plugins"
  weight = 3
+++

{{<figure library="1" src="fair-share.png" title="fair-share调度">}}

## Overview

The Priority Plugin provides the implementation of job, Task sorting, and PreempTablefn, a function that calculates sacrifice jobs. Job sorting according to priorityClassName, the task of sorting by priorityClassName, createTime, id in turn.

## Scenario

When the cluster runs multiple jobs but is low on resources, and each Job has a different number of Pods waiting to be scheduled, if you use the Kubernetes default scheduler, the Job with more Pods will eventually get more of the cluster's resources. In this case, the Volcano-Scheduler provides algorithms that enable different jobs to share cluster resources in a fair-share.

The Priority Plugin enables users to customize their job and task priorities, and to customize scheduling policies at different levels according to their own needs. Priority is arranged according to Job's PriorityClassName at the application level. For example, there are financial scenarios, Internet of Things monitoring scenarios and other applications requiring high real-time performance in the cluster, and the Priority Plugin can ensure that they are scheduled in Priority.
