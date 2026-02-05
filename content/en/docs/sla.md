---
title: "SLA"
date: 2021-05-13
lastmod: 2021-05-13
draft: false
toc: true
type: "docs"
linktitle: "SLA"
menu:
  docs:
    parent: "plugins"
    weight: 9
---

## Overview

When users apply jobs to Volcano, they may need adding some particular constraints to job, for example, longest Pending time aiming to prevent job from starving. And these constraints can be regarded as Service Level Agreement (SLA) which are agreed between volcano and user. So sla plugin is provided to receive and realize SLA settings for both individual job and whole cluster.

## Scenario

Users can customize SLA related parameters in their own cluster according to business needs. For example, for clusters with high real-time service requirements, JobWaitingTime can be set as small as possible. For clusters with bulk computing jobs, JobWaitingTime can be set to larger. The parameters of a specific SLA and the optimization of the parameters need to be combined with the specific business and related performance measurement results.

