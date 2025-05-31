+++
title = "How to Use PyTorch Plugin"
description = "Guide for using the PyTorch plugin in Volcano"
date = 2023-03-01
lastmod = 2023-03-01

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Use PyTorch Plugin"
[menu.docs]
  parent = "user-guide"
  weight = 14
+++

# Pytorch Plugin User Guide

## Introduction

**Pytorch plugin** is designed to optimize the user experience when running pytorch jobs, it not only allows users to write less yaml, but also ensures the normal operation of Pytorch jobs.

## How the Pytorch Plugin Works

The Pytorch Plugin will do three things:

* Open ports used by Pytorch for all containers of the job
* Force open `svc` plugins
* Add some envs such like `MASTER_ADDR`, `MASTER_PORT`, `WORLD_SIZE`, `RANK` which pytorch distributed training needed to containers automatically

## Parameters of the Pytorch Plugin

### Arguments

| ID   | Name   | Type   | Default Value | Required | Description                        | Example            |
| ---- | ------ | ------ | ------------- | -------- | ---------------------------------- | ------------------ |
| 1    | master | string | master        | No       | Name of Pytorch master             | --master=master    |
| 2    | worker | string | worker        | No       | Name of Pytorch worker             | --worker=worker    |
| 3    | port   | string | 23456         | No       | The port to open for the container | --port=23456       |

## Examples

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: pytorch-job
spec:
  minAvailable: 1
  schedulerName: volcano
  plugins:
    pytorch: ["--master=master","--worker=worker","--port=23456"] # Pytorch plugin register
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