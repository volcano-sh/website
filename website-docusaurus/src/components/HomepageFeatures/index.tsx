import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Unified Scheduling',
    description: (
      <>
        Support native Kubernetes workload scheduling and complete support for frameworks like PyTorch, TensorFlow, Spark, Flink, Ray through VolcanoJob.
      </>
    ),
  },
  {
    title: 'Rich Scheduling Policies',
    description: (
      <>
        Gang scheduling, binpack scheduling, heterogeneous device scheduling, proportion/capacity scheduling, and more. Supports custom plugins and actions.
      </>
    ),
  },
  {
    title: 'Queue Resource Management',
    description: (
      <>
        Multi-dimensional resource quota control, multi-level queue structure, resource borrowing, reclaiming and preemption between queues.
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
