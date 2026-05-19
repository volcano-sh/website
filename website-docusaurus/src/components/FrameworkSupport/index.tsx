import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

/**
 * Rich Framework Support - matches Hugo required section
 */
const FRAMEWORKS = [
  {img: 'spark-logo-hd.png', name: 'Spark', url: 'https://spark.apache.org/', desc: 'Apache Spark™ is a unified analytics engine for large-scale data processing.'},
  {img: 'volcano_flink.PNG', name: 'Flink', url: 'https://flink.apache.org/', desc: 'Apache Flink is a framework for stateful computations over data streams.'},
  {img: 'volcano_tensorflow.PNG', name: 'TensorFlow', url: 'https://www.tensorflow.org/', desc: 'An end-to-end open source machine learning platform.'},
  {img: 'volcano_pytorch.PNG', name: 'PyTorch', url: 'https://pytorch.org/', desc: 'An open source machine learning framework.'},
  {img: 'volcano_argo-horizontal-color.png', name: 'Argo', url: 'https://argoproj.github.io/', desc: 'Argo Workflows is a container-native workflow engine for Kubernetes.'},
  {img: 'volcano_mindspore.PNG', name: 'MindSpore', url: 'https://www.mindspore.cn/en', desc: 'The all-scenario deep learning framework developed by Huawei.'},
  {img: 'ray_logo.png', name: 'Ray', url: 'https://github.com/ray-project/ray', desc: 'High-performance distributed computing framework.'},
  {img: 'kubeflow.png', name: 'Kubeflow', url: 'https://www.kubeflow.org/', desc: 'Making deployments of ML workflows on Kubernetes simple.'},
  {img: 'volcano_openMPI.jpg', name: 'Open MPI', url: 'https://www.open-mpi.org/', desc: 'Open source Message Passing Interface implementation.'},
  {img: 'volcano_horovod.PNG', name: 'Horovod', url: 'https://github.com/horovod/horovod', desc: 'Distributed deep learning training framework.'},
  {img: 'volcano_mxnet.PNG', name: 'MXNet', url: 'https://mxnet.apache.org/', desc: 'A truly open source deep learning framework.'},
  {img: 'volcano_paddle.PNG', name: 'PaddlePaddle', url: 'https://www.paddlepaddle.org.cn/', desc: 'Open source deep learning platform from Baidu.'},
];

export default function FrameworkSupport(): JSX.Element {
  return (
    <section id="required" className={styles.section}>
      <div className="container">
        <h2 className={styles.title}>Rich Framework Support</h2>
        <p className={styles.subtitle}>Seamlessly integrate with mainstream computing frameworks for AI, big data, and scientific computing</p>
        <div className={styles.grid}>
          {FRAMEWORKS.map((f, i) => (
            <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className={styles.card}>
              <img src={useBaseUrl(`/img/${f.img}`)} alt={f.name} className={styles.logo} onError={(e) => {(e.target as HTMLImageElement).style.display = 'none'}} />
              <h3>{f.name}</h3>
              <p>{f.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
