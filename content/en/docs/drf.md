+++
title = "DRF Plugin"

date = 2021-05-13
lastmod = 2021-05-13

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "DRF"
[menu.docs]
  parent = "plugins"
  weight = 4
+++

{{<figure library="1" src="drfjob.png" title="Drf plugin">}}

## Overview

The full name of DRF scheduling algorithm is Dominant Resource Fairness, which is a scheduling algorithm based on the container group Dominant Resource. Dominant Resource is the largest percentage of all required resources for a container group. The DRF algorithm selects the Dominant Resource that is the smallest in a series of container groups for priority scheduling. This can meet more job, not because a fat business, starve a large number of small business. DRF scheduling algorithm can ensure that many types of resources coexist in the environment, as far as possible to meet the fair principle of allocation.

## Scenario

The DRF scheduling algorithm gives priority to the throughput of the business in the cluster and is suitable for batch small business scenarios such as a single AI training, a single big data calculation and a query.
