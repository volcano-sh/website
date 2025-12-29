+++
title = "Predicates Plugin"

date = 2021-05-13
lastmod = 2021-05-13

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Predicates"
[menu.docs]
  parent = "plugins"
  weight = 7
+++

## Overview

The Predicate Plugin calls the PredicateGPU with pod and nodeInfo as parameters to evaluate and pre-select jobs based on the results.

## Scenario

In AI scenarios where GPU resources are required, the Predicate Plugin can quickly filter out those that require the GPU for centralized scheduling.
