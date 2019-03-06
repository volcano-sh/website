+++
title =  "Deployment Overview"


date = 2019-01-28
lastmod = 2019-01-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Deployment"
[menu.docs]
  parent = "concepts"
  weight = 4
+++

## Overall Architecture


{{<figure library="1" src="deployment.png" title="">}}

### Deployment Overview
1. Volcano is bootstrapped by Kubernetes, e.g. Deployment, kube-scheduler
2. Dedicated nodes and hardware/accelerator for high performance workload, e.g. GPU, FPGA
3. Launch high performance workload by Volcano for faire-sharing, gang-scheduling, and so on
4. Deploy other components by Kubernetes, e.g. Dashboard, log, monitoring, in other nodes