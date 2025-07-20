+++
title =  "MXNet on Volcano"

date = 2025-07-20
lastmod = 2025-07-20

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "MXNet"
[menu.docs]
  parent = "zoology"
  weight = 3

+++



# MXNet Introduction

MXNet is an open-source deep learning framework designed for efficient and flexible training and deployment of deep neural networks. It supports seamless scaling from a single GPU to multiple GPUs, and further to distributed multi-machine multi-GPU setups.

# MXNet on Volcano

Combining MXNet with Volcano allows you to fully leverage Kubernetes' container orchestration capabilities and Volcano's batch scheduling functionality to achieve efficient distributed training.

Click [here](https://github.com/apache/mxnet/blob/master/example/distributed_training-horovod/gluon_mnist.py) to view the example provided by the MXNet team. This directory contains the following files:

- Dockerfile: Builds the standalone worker image.
- Makefile: Used to build the above image.
- train-mnist-cpu.yaml: Volcano Job specification.

To run the example, edit the image name and version in `train-mnist-cpu.yaml`. Then run:

```
kubectl apply -f train-mnist-cpu.yaml -n ${NAMESPACE}
```

to create the Job.

Then use:

```
kubectl -n ${NAMESPACE} describe job.batch.volcano.sh mxnet-job
```

to view the status.
