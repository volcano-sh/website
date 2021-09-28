+++
title =  "spark on volcano"

date = 2021-06-29
lastmod = 2021-06-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "pyTorch"
[menu.docs]
  parent = "ecosystem"
  weight = 10

+++





### PyTorch introduction

Torch is a scientific computing framework with lots of machine learning algorithms. It's a Tensor library similar to Numpy. PyTorch is an open source machine learning library for Python based on Torch for applications such as natural language processing. With PyTorch, however, the reverse derivative technology allows you to arbitrarily change the behavior of the neural network with zero latency, and it's fast. It is this flexibility that gives PyTorch its biggest advantage over TensorFlow. It has many advantages, such as GPU support, flexibility, dynamic neural network support, easy to understand underlying code, imperative experience and custom extension.

### Premise condition

PyTorch's tools are integrated into KubeFlow, so make sure you have Kubernetes, VolCNao, and KubeFlow installed and configured in your environment. To install and deploy KubeFlow, refer to [1].

### Install pyTorch operator

1.By default, pyTorch is already deployed after KubeFlow has been successfully deployed.

2.Check that the PyTorch custom resource is installed.

```
# kubectl get crd
The output should include pytorchjobs.kubeflow.org like the following:

NAME                                             CREATED AT
...
pytorchjobs.kubeflow.org                         2021-09-06T18:33:58Z
...
```

3.Check that the Training operator is running via:

```
# kubectl get pods -n kubeflow
NAME                                READY   STATUS    RESTARTS   AGE
training-operator-d466b46bc-xbqvs   1/1     Running   0          4m37s
```



### Creating a PyTorch training job

1.Deploy the `PyTorchJob` resource to start training(Change the scheduler field to volcano).

```
kubectl create -f https://raw.githubusercontent.com/kubeflow/tf-operator/master/examples/pytorch/simple.yaml
```

2.Check pod running status.

```
kubectl get pods -l job-name=pytorch-simple -n kubeflow
```



[1][Install kubeFlow official documentation](https://www.kubeflow.org/docs/started/installing-kubeflow/)

[2][pytorch on kubeflow](https://www.kubeflow.org/docs/components/training/pytorch/)

