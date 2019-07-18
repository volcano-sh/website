+++
title =  "Basic Deployment Of Volcano"


date = 2019-07-18
lastmod = 2019-07-18

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.
# Add menu entry to sidebar.
linktitle = "SimpleDeployment"
[menu.docs]
  parent = "simpledeployment"
  weight = 1
+++

## pre requisites

* [Install-docker](https://docs.docker.com/install/) 

* Choosing a Kubernetes cluster (Kubernetes 1.12+ with CRD support).
To get started with volcano, you need a Kubernetes cluster. 
If you aren't sure which Kubernetes platform is right for you, see [Picking the Right Solution](https://kubernetes.io/docs/setup/).

* For Example refer the [minikube setup](https://github.com/volcano-sh/website/tree/master/content/en/docs/getting-started-minikube.md)

* optional [Install-helm](https://helm.sh/docs/using_helm/) 

### Volcano Deployment 

#### using helm
```
Add helm repo using following command,

* helm repo add volcano https://volcano-sh.github.io/charts

Install Volcano using following command,

* helm install volcano/volcano --namespace <namespace> --name <specified-name>

e.g :
* helm install volcano/volcano --namespace volcano-trial --name volcano-trial
```

#### Simple way
```
* mkdir -p $GOPATH/src/volcano-sh/
* cd $GOPATH/src/volcano.sh/
* git clone --recursive https://github.com/volcano-sh/volcano.git

* cd $GOPATH/src/volcano.sh/volcano
* make images

* bash ./hack/local-up-volcano.sh
```
or 
```
Install volcano k8s resources

* kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/master/installer/volcano-development.yaml

Install default-queue for volcano scheduler, note that the crd resources should be ready before this.

* kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/master/installer/helm/chart/volcano/templates/default-queue.yaml
```