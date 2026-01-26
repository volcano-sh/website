import React from 'react';
import SectionContainer from '../SectionContainer';
import './styles.css';

const frameworks = [
  {
    name: "Spark",
    logo: "img/frameworks/spark-logo-hd.png",
    description: "Apache Spark™ is a unified analytics engine for large-scale data processing",
    url: "https://spark.apache.org/"
  },
  {
    name: "Flink",
    logo: "img/frameworks/volcano_flink.png",
    description: "Apache Flink is a framework and distributed processing engine for stateful computations over unbounded and bounded data streams",
    url: "https://flink.apache.org/"
  },
  {
    name: "TensorFlow",
    logo: "img/frameworks/volcano_tensorflow.png",
    description: "An end-to-end open source machine learning platform",
    url: "https://www.tensorflow.org/"
  },
  {
    name: "PyTorch",
    logo: "img/frameworks/volcano_pytorch.png",
    description: "An open source machine learning framework that accelerates the path from research prototypes to production deployment",
    url: "https://pytorch.org/"
  },
  {
    name: "Argo",
    logo: "img/frameworks/volcano_argo-horizontal-color.png",
    description: "Argo Workflows is an open source container-native workflow engine for orchestrating parallel jobs on Kubernetes. Argo Workflows is implemented as a Kubernetes CRD.",
    url: "https://argoproj.github.io/"
  },
  {
    name: "MindSpore",
    logo: "img/frameworks/volcano_mindspore.png",
    description: "The all-scenario deep learning framework developed by Huawei.",
    url: "https://www.mindspore.cn/en"
  },
  {
    name: "Ray",
    logo: "img/frameworks/ray_logo.png",
    description: "Ray is a high-performance distributed computing framework that supports machine learning, deep learning, and distributed applications.",
    url: "https://github.com/ray-project/ray"
  },
  {
    name: "Kubeflow",
    logo: "img/frameworks/kubeflow.png",
    description: "The Kubeflow project is dedicated to making deployments of machine learning (ML) workflows on Kubernetes simple, portable, and scalable.",
    url: "https://www.kubeflow.org/"
  },
  {
    name: "Open MPI",
    logo: "img/frameworks/volcano_openMPI.jpg",
    description: "The Open MPI Project is an open source Message Passing Interface implementation that is developed and maintained by a consortium of academic, research, and industry partners.",
    url: "https://www.open-mpi.org/software/ompi/v4.0/"
  },
  {
    name: "Horovod",
    logo: "img/frameworks/volcano_horovod.png",
    description: "Horovod is a distributed deep learning training framework for TensorFlow, Keras, PyTorch, and Apache MXNet.",
    url: "https://github.com/horovod/horovod"
  },
  {
    name: "MXNet",
    logo: "img/frameworks/volcano_mxnet.png",
    description: "A truly open source deep learning framework suited for flexible research prototyping and production.",
    url: "https://mxnet.apache.org/versions/1.6/"
  },
  {
    name: "PaddlePaddle",
    logo: "img/frameworks/volcano_paddle.png",
    description: "PaddlePaddle is an open source deep learning platform derived from industrial practice initiated by Baidu.",
    url: "https://www.paddlepaddle.org.cn/"
  }
];

export default function Frameworks() {
  return (
    <div className="frameworks-container">
      <SectionContainer className="frameworksSection">
        <h1>Rich Framework Support</h1>
        <p className="frameworks-subtitle">
          Seamlessly integrate with mainstream computing frameworks for AI, big data, and scientific computing
        </p>
        <div className="frameworks-grid">
          {frameworks.map((framework, index) => (
            <a 
              key={index} 
              href={framework.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="framework-card-link"
            >
              <div className="framework-card">
                <div className="framework-logo">
                  <img src={framework.logo} alt={`${framework.name} Logo`} />
                </div>
                <h3 className="framework-name">{framework.name}</h3>
                <p className="framework-description">{framework.description}</p>
              </div>
            </a>
          ))}
        </div>
      </SectionContainer>
    </div>
  );
}
