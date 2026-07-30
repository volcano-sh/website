---
title: Extender
---

## Introduction

The **Extender** plugin enables Volcano to integrate external scheduling logic via HTTP webhook endpoints. This follows the Kubernetes Scheduler Extender pattern, allowing you to plug in custom filtering, scoring, or binding logic without modifying the core Volcano scheduler.

## Mechanism

When the Extender plugin is configured, the Volcano scheduler will call external HTTP endpoints at specific scheduling phases:

1. **Filter (Predicate)**: The extender can filter out nodes that should not be considered for a pod.
2. **Prioritize (Score)**: The extender can provide additional scores for nodes to influence placement decisions.
3. **Bind**: The extender can perform custom binding actions.

## Configuration

For detailed configuration and usage instructions on how to set up the Extender plugin, including how to define the HTTP endpoints, configure TLS, and set up filter/prioritize callbacks, please refer to the dedicated user guide:

👉 **[Extender User Guide](../../UserGuide/user_guide_how_to_use_extender)**

The user guide includes:
- Complete scheduler configmap examples
- Extender endpoint configuration
- HTTP callback setup
- TLS configuration options
- End-to-end examples
