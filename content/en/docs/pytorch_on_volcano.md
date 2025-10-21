+++
title =  "Pytorch on Volcano"

date = 2021-06-29
lastmod = 2021-06-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Pytorch"
[menu.docs]
  parent = "zoology"
  weight = 6

+++

### PyTorch introduction

PyTorch is an open-source machine learning framework developed by Facebook (now Meta) AI Research team. It is known for its dynamic computation graph and intuitive Python interface, enabling researchers and developers to build and train deep learning models with greater flexibility. PyTorch provides powerful GPU acceleration capabilities, supports distributed training, and has a rich ecosystem of tools.

### PyTorch on Volcano

Volcano's support for PyTorch is implemented through the PyTorch plugin, which not only allows users to write less YAML configuration but also ensures the proper functioning of PyTorch jobs.

The PyTorch plugin accomplishes three tasks:

- Opens ports used by PyTorch for all containers in the job
- Enforces the `svc` plugin
- Automatically adds environment variables required for PyTorch distributed training to containers, such as `MASTER_ADDR`, `MASTER_PORT`, `WORLD_SIZE`, `RANK`, etc.

#### Parameter List

| No.  | Name   | Type   | Default | Required | Description                      | Example         |
| ---- | ------ | ------ | ------- | -------- | -------------------------------- | --------------- |
| 1    | master | string | master  | No       | Name of the PyTorch master node  | --master=master |
| 2    | worker | string | worker  | No       | Name of the PyTorch worker node  | --worker=worker |
| 3    | port   | string | 23456   | No       | Port to be opened for containers | --port=23456    |

#### Example

```yaml
yamlapiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: pytorch-job
spec:
  minAvailable: 1
  schedulerName: volcano
  plugins:
    pytorch: ["--master=master","--worker=worker","--port=23456"] # PyTorch plugin registration
  tasks:
    - replicas: 1
      name: master
      policies:
        - event: TaskCompleted
          action: CompleteJob
      template:
        spec:
          containers:
            - image: gcr.io/kubeflow-ci/pytorch-dist-sendrecv-test:1.0
              imagePullPolicy: IfNotPresent
              name: master
          restartPolicy: OnFailure
    - replicas: 2
      name: worker
      template:
        spec:
          containers:
            - image: gcr.io/kubeflow-ci/pytorch-dist-sendrecv-test:1.0
              imagePullPolicy: IfNotPresent
              name: worker
              workingDir: /home
          restartPolicy: OnFailure
```
