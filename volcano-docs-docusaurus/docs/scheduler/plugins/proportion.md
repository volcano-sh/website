---
title: Proportion
---

# Proportion

## Overview

Proportion scheduling algorithm uses the concept of queue to control the Proportion of total resources allocated in the cluster. Each queue allocates a certain proportion of cluster resources. For example, there are three teams that share A pool of resources on A cluster: Team A uses up to 40% of the total cluster, Team B uses up to 30%, and Team C uses up to 30%. If the amount of work delivered exceeds the team's maximum available resources, there is a queue.

## Scenario

Proportion scheduling algorithm improves the flexibility and elasticity of cluster scheduling. The most typical scenario is that when multiple development teams in a company share a cluster, this scheduling algorithm can handle the requirements of shared resource matching and isolation between different departments very well. In multi-service mixed scenarios, such as computation-intensive AI business, network IO-intensive MPI and HPC business, and storage-intensive big data business, Proportion scheduling algorithm can allocate shared resources according to demand through matching.
