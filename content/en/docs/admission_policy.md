+++
title = "Admission Policy"

date = 2025-09-18
lastmod = 2025-09-18

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Admission Policy"
[menu.docs]
  parent = "concepts"
  weight = 7
+++

## Introduction
Volcano supports Validating Admission Policy (VAP) and Mutating Admission Policy (MAP) to validate and automatically modify Volcano resources like Jobs, Pods, Queues, and PodGroups when they are created or updated. These policies work alongside existing Volcano admission webhooks, providing additional validation and mutation capabilities using Kubernetes native admission policies.

> **Note**: VAP and MAP are **not enabled by default**. You must explicitly enable them during installation.

## Installation and Configuration
### Prerequisites
- Kubernetes 1.30+ for ValidatingAdmissionPolicy (stable)
- Kubernetes 1.32+ for MutatingAdmissionPolicy (beta)

### Enable VAP and MAP

#### Option 1: Helm Installation
Configure the following values when installing Volcano:

```bash
# Install Volcano with VAP and MAP enabled
helm install volcano volcano/volcano --namespace volcano-system --create-namespace \
  --set custom.vap_enable=true \
  --set custom.map_enable=true

# Or upgrade existing installation
helm upgrade volcano volcano/volcano --namespace volcano-system \
  --set custom.vap_enable=true \
  --set custom.map_enable=true
```

Alternatively, you can set these values in your `values.yaml`:

```yaml
custom:
  vap_enable: true  # Enable Validating Admission Policy
  map_enable: true  # Enable Mutating Admission Policy
```

#### Option 2: YAML Installation
You can also install Volcano directly using YAML manifests. Choose the appropriate file based on your requirements:

```bash
# Install Volcano without VAP/MAP (default)
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/master/installer/volcano-development.yaml

# Install Volcano with VAP only
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/master/installer/volcano-development-vap.yaml

# Install Volcano with both VAP and MAP
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/master/installer/volcano-development-vap-map.yaml
```


## Key Configuration Fields

### vap_enable
`vap_enable` enables Validating Admission Policy. When enabled, Volcano will validate all Volcano resources before they are created or updated.

### map_enable
`map_enable` enables Mutating Admission Policy. When enabled, Volcano will automatically set default values for Jobs, Pods, and other resources.

> **Important**: MAP provides partial functionality compared to existing webhooks. It handles job-level defaults but has limitations with task-level modifications. The existing webhook system continues to work alongside MAP.

## Usage

### Verify Policies are Active
After installation, check that the policies are running:

```bash
# Check ValidatingAdmissionPolicies
kubectl get validatingadmissionpolicy | grep volcano

# Check MutatingAdmissionPolicies
kubectl get mutatingadmissionpolicy | grep volcano

# Verify policy bindings
kubectl get validatingadmissionpolicybinding | grep volcano
kubectl get mutatingadmissionpolicybinding | grep volcano
```

### Test Validation
Try creating an invalid job to see validation in action:

```bash
# This will be rejected due to duplicate task names
kubectl apply -f - <<EOF
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: invalid-job
spec:
  tasks:
    - name: worker
      replicas: 1
      template:
        spec:
          containers:
          - image: nginx
            name: nginx
    - name: worker  # Duplicate name - will be rejected
      replicas: 1
      template:
        spec:
          containers:
          - image: nginx
            name: nginx
EOF
```

## Notes
- VAP and MAP work alongside existing Volcano webhooks, providing additional validation and mutation capabilities
- MAP has some limitations with task-level modifications due to technical constraints
- ValidatingAdmissionPolicy requires Kubernetes 1.30+ (stable since 1.30)
- MutatingAdmissionPolicy requires Kubernetes 1.32+ (beta since 1.32)
- If policies are not working, verify your Kubernetes version meets the minimum requirements