+++
title = "Extender Plugin"

date = 2025-01-21
lastmod = 2025-01-21

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Extender"
[menu.docs]
  parent = "plugins"
  weight = 4
+++

### Extender

#### Overview

The Extender plugin enables Volcano scheduler to delegate scheduling decisions to external HTTP services. It allows users to extend Volcano's scheduling capabilities by implementing custom logic in external services. The plugin supports various scheduling hooks including predicate, prioritize, preemptable, reclaimable, and event handlers.

#### Features

- **External Service Integration**: Delegate scheduling decisions to external HTTP services
- **Multiple Scheduling Hooks**: Support for predicate, prioritize, preemptable, reclaimable, and other scheduling functions
- **Managed Resources**: Optionally filter tasks based on managed resources
- **Error Handling**: Configurable error handling with ignorable option
- **Event Handlers**: Support for allocate and deallocate event handlers
- **HTTP Timeout Configuration**: Configurable HTTP request timeout

#### Configuration

The Extender plugin can be configured with the following arguments:

```yaml
actions: "reclaim, allocate, backfill, preempt"
tiers:
- plugins:
  - name: extender
    arguments:
      extender.urlPrefix: http://127.0.0.1:8080
      extender.httpTimeout: 100ms
      extender.onSessionOpenVerb: onSessionOpen
      extender.onSessionCloseVerb: onSessionClose
      extender.predicateVerb: predicate
      extender.prioritizeVerb: prioritize
      extender.preemptableVerb: preemptable
      extender.reclaimableVerb: reclaimable
      extender.queueOverusedVerb: queueOverused
      extender.jobEnqueueableVerb: jobEnqueueable
      extender.jobReadyVerb: jobReady
      extender.allocateFuncVerb: allocateFunc
      extender.deallocateFuncVerb: deallocateFunc
      extender.ignorable: true
      extender.managedResources:
      - nvidia.com/gpu
      - nvidia.com/gpumem
```

##### Configuration Parameters

- **extender.urlPrefix** (string): Base URL prefix for the extender service
- **extender.httpTimeout** (string): HTTP request timeout (e.g., "100ms", "1s", "1m")
- **extender.onSessionOpenVerb** (string): Verb for OnSessionOpen method
- **extender.onSessionCloseVerb** (string): Verb for OnSessionClose method
- **extender.predicateVerb** (string): Verb for Predicate method
- **extender.prioritizeVerb** (string): Verb for Prioritize method
- **extender.preemptableVerb** (string): Verb for Preemptable method
- **extender.reclaimableVerb** (string): Verb for Reclaimable method
- **extender.queueOverusedVerb** (string): Verb for QueueOverused method
- **extender.jobEnqueueableVerb** (string): Verb for JobEnqueueable method
- **extender.jobReadyVerb** (string): Verb for JobReady method
- **extender.allocateFuncVerb** (string): Verb for AllocateFunc event handler
- **extender.deallocateFuncVerb** (string): Verb for DeallocateFunc event handler
- **extender.ignorable** (bool): Whether the extender can ignore unexpected errors
- **extender.managedResources** (list): List of resources managed by the extender (comma-separated or list format)

#### How It Works

1. **Session Lifecycle**: The extender can hook into session open and close events to initialize and cleanup resources.
2. **Predicate**: The extender can filter nodes based on custom criteria during the predicate phase.
3. **Prioritize**: The extender can score nodes based on custom logic during the prioritize phase.
4. **Preemptable/Reclaimable**: The extender can determine which tasks can be preempted or reclaimed.
5. **Queue Management**: The extender can participate in queue overused and job enqueueable decisions.
6. **Event Handlers**: The extender can receive notifications when tasks are allocated or deallocated.

#### Managed Resources

The extender can optionally manage specific resources. When managed resources are configured, the extender is only invoked for tasks that request at least one of the managed resources:

```yaml
extender.managedResources:
- nvidia.com/gpu
- nvidia.com/gpumem
```

If no managed resources are specified, the extender is invoked for all tasks.

#### Error Handling

The extender can be configured to ignore errors:

```yaml
extender.ignorable: true
```

When ignorable is set to true, errors from the extender are logged but don't prevent scheduling from continuing. When set to false, errors cause scheduling decisions to fail.

#### API Contract

The extender service must implement HTTP POST endpoints for each configured verb. The request body contains JSON-encoded scheduling information, and the response should contain the appropriate scheduling decision.

##### Example Predicate Request/Response

**Request:**
```json
{
  "task": {
    "namespace": "default",
    "name": "task-1",
    "resources": {
      "cpu": 2,
      "memory": 4096
    }
  },
  "node": {
    "name": "node-1",
    "allocatable": {
      "cpu": 8,
      "memory": 16384
    }
  }
}
```

**Response:**
```json
{
  "code": 0,
  "errorMessage": ""
}
```

##### Example Prioritize Request/Response

**Request:**
```json
{
  "task": {
    "namespace": "default",
    "name": "task-1",
    "resources": {
      "cpu": 2,
      "memory": 4096
    }
  },
  "nodes": [
    {
      "name": "node-1",
      "allocatable": {
        "cpu": 8,
        "memory": 16384
      }
    },
    {
      "name": "node-2",
      "allocatable": {
        "cpu": 8,
        "memory": 16384
      }
    }
  ]
}
```

**Response:**
```json
{
  "nodeScore": {
    "node-1": 80.5,
    "node-2": 75.2
  },
  "errorMessage": ""
}
```

#### Scenario

The Extender plugin is suitable for:

- **Custom Scheduling Logic**: Implementing domain-specific scheduling requirements
- **Third-party Integration**: Integrating with external resource management systems
- **Advanced Filtering**: Complex node filtering based on external data sources
- **Custom Scoring**: Custom node scoring algorithms not available in standard plugins
- **Resource-specific Logic**: Handling special resources with custom allocation logic

#### Examples

##### Example 1: GPU Extender

Configure an extender for GPU-specific scheduling:

```yaml
- name: extender
  arguments:
    extender.urlPrefix: http://gpu-scheduler:8080
    extender.httpTimeout: 1s
    extender.predicateVerb: predicate
    extender.prioritizeVerb: prioritize
    extender.managedResources:
    - nvidia.com/gpu
    - nvidia.com/gpumem
    extender.ignorable: false
```

##### Example 2: Custom Node Filtering

Configure an extender for custom node filtering:

```yaml
- name: extender
  arguments:
    extender.urlPrefix: http://custom-filter:8080
    extender.httpTimeout: 500ms
    extender.predicateVerb: customFilter
    extender.ignorable: true
```

##### Example 3: Full Lifecycle Hooks

Configure an extender with all lifecycle hooks:

```yaml
- name: extender
  arguments:
    extender.urlPrefix: http://full-extender:8080
    extender.httpTimeout: 2s
    extender.onSessionOpenVerb: onSessionOpen
    extender.onSessionCloseVerb: onSessionClose
    extender.predicateVerb: predicate
    extender.prioritizeVerb: prioritize
    extender.preemptableVerb: preemptable
    extender.reclaimableVerb: reclaimable
    extender.allocateFuncVerb: allocateFunc
    extender.deallocateFuncVerb: deallocateFunc
    extender.ignorable: true
```

#### Notes

- The extender service must be accessible from the Volcano scheduler
- HTTP requests use POST method with JSON content type
- Maximum response body size is 10MB
- The extender should return HTTP 200 status code for successful operations
- Error responses should include appropriate error messages in the response body
