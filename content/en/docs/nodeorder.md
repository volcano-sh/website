+++
title = "Nodeorder Plugin"

date = 2021-05-13
lastmod = 2021-05-13

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Nodeorder"
[menu.docs]
  parent = "plugins"
  weight = 8
+++

## Overview

The NodeOrder Plugin is a scheduling optimization strategy that scores nodes from various dimensions through simulated assignments to find the node that is best suited for the current job. The scoring parameters are configured by the user. The parameter contains the Affinity、reqResource、LeastReqResource、MostResource、balanceReqResouce.

## Scenario

NodeOrder Plugin provides scoring criteria of multiple dimensions for scheduling, and the combination of different dimensions enables users to flexibly configure appropriate scheduling policies according to their own needs.
