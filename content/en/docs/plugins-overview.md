+++
title = "Plugins Overview"

date = 2021-05-13
lastmod = 2021-05-13

draft = false  # Is this a draft? true/false
toc = false  # Show table of contents? true/false
type = "docs"  # Do not modify.

linktitle = "Plugins"
[menu.docs]
  parent = "scheduler"
  weight = 3
  identifier = "plugins"
+++

Volcano scheduler provides a rich set of plugins to support various scheduling scenarios. Each plugin implements specific scheduling algorithms and policies.

## Available Plugins

- **Gang**: All-or-nothing scheduling for batch jobs
- **Binpack**: Maximize node resource utilization  
- **Priority**: Job and task priority-based scheduling
- **DRF**: Dominant Resource Fairness scheduling
- **Proportion**: Queue-based resource allocation
- **Task-topology**: Affinity and anti-affinity based scheduling
- **Predicates**: Job pre-selection and filtering
- **Nodeorder**: Multi-dimensional node scoring
- **SLA**: Service Level Agreement enforcement
- **TDM**: Time Division Multiplexing for shared nodes
- **Numa-aware**: NUMA topology-aware scheduling

Please select a specific plugin from the submenu to learn more about its functionality and use cases.
