---
title: "Headlamp on Volcano"
sidebar_position: 9
---

## Headlamp introduction

[Headlamp](https://headlamp.dev/) is a Kubernetes web UI that can run as a desktop application or inside a cluster. It supports plugins, allowing projects to add purpose-built views for custom resources and operational workflows.

The Volcano Headlamp plugin brings Volcano resources into Headlamp so operators can inspect and manage batch scheduling state from a Kubernetes UI. It is useful for users who want a visual way to work with Volcano CRDs instead of switching between multiple `kubectl` commands.

Watch the demo to see the Volcano plugin in Headlamp, including the plugin catalog, Volcano resource pages, detail views, and resource map integration.

<div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', margin: '1rem 0' }}>
  <iframe
    title="Volcano plugin for Headlamp demo"
    src="https://www.youtube-nocookie.com/embed/Mqm1EyAa7TY"
    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    frameBorder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerPolicy="strict-origin-when-cross-origin"
    allowFullScreen
  />
</div>

## Prerequisites

Before using the plugin, make sure the following components are available:

- A Kubernetes cluster with [Volcano installed](/docs/GettingStarted/Installation)
- A working kubeconfig for the cluster
- [Headlamp](https://headlamp.dev/docs/latest/installation/) installed as a desktop app or deployed in the cluster

## Install the plugin from the Headlamp Plugin Catalog

To try the plugin, install Headlamp and open the Plugin Catalog from the Headlamp UI. Search for `Volcano`, install the Volcano plugin, and connect Headlamp to a Kubernetes cluster where Volcano is already installed.

![Volcano plugin in the Headlamp Plugin Catalog](/img/headlamp/volcano-plugin-catalog.png)

After the plugin loads, the `Volcano` section appears in the Headlamp sidebar.

![Volcano section in the Headlamp sidebar](/img/headlamp/volcano-sidebar.png)

## Volcano resources supported

The plugin adds a dedicated `Volcano` section in the Headlamp sidebar and provides list and detail pages for core Volcano resources:

| Resource | API Group |
| -------- | --------- |
| Volcano Job | `batch.volcano.sh/v1alpha1` |
| Queue | `scheduling.volcano.sh/v1beta1` |
| PodGroup | `scheduling.volcano.sh/v1beta1` |
| JobTemplate | `flow.volcano.sh/v1alpha1` |
| JobFlow | `flow.volcano.sh/v1alpha1` |

The detail pages show scheduling-focused fields such as job status, queue, task progress, PodGroup phase, queue state, generated jobs, conditions, and related events. They also include links between related Volcano resources, for example from a Volcano Job to its Queue or PodGroup.

![Volcano Jobs list in Headlamp](/img/headlamp/volcano-jobs-list.png)

## Verify Volcano resources in Headlamp

After installing Volcano and loading the plugin, create or use existing Volcano workloads. The following commands show the core resources that the plugin displays:

```shell
kubectl get vcjob -A
kubectl get queues
kubectl get podgroups -A
kubectl get jobtemplates -A
kubectl get jobflows -A
```

In Headlamp, open the `Volcano` sidebar section and check the Jobs, Queues, PodGroups, JobTemplates, and JobFlows pages. Open a detail page to inspect status, related resources, conditions, events, and other scheduling information.

![Volcano Job details in Headlamp](/img/headlamp/volcano-job-details.png)

## View Volcano relationships in the resource map

The plugin also integrates Volcano resources with the Headlamp resource map. The map helps operators understand how scheduling resources relate to each other:

- Queue hierarchy shows parent and child Queues
- Volcano Jobs connect to their PodGroups
- Pods connect back to the Volcano Jobs that own or label them
- Queue details remain available from the map without adding dense Queue-to-workload edges

Open the Headlamp resource map and enable the Volcano map sources. Use the map to follow a workload from Pod to Volcano Job and PodGroup, or to inspect the Queue hierarchy used by scheduled workloads.

![Volcano resources in the Headlamp resource map](/img/headlamp/volcano-resource-map.png)

## Clean up test workloads

If you created sample Volcano workloads only for testing, delete them after verification. For example:

```shell
kubectl delete vcjob --all -n <namespace>
kubectl delete jobflows --all -n <namespace>
kubectl delete jobtemplates --all -n <namespace>
```

Do not delete shared Queues unless no other workloads use them.

For local development, see the [Volcano Headlamp plugin source](https://github.com/headlamp-k8s/plugins/tree/main/volcano).

## References

- [Volcano installation](/docs/GettingStarted/Installation)
- [Headlamp installation](https://headlamp.dev/docs/latest/installation/)
- [Headlamp plugin building and shipping](https://headlamp.dev/docs/latest/development/plugins/building/)
- [Volcano Headlamp plugin](https://github.com/headlamp-k8s/plugins/tree/main/volcano)
