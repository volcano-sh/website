import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'High Performance',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Designed for high-performance computing, AI, and Big Data workloads.
        Optimizes resource utilization and throughput for batch jobs.
      </>
    ),
  },
  {
    title: 'Rich Scheduling Policies',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        Supports advanced scheduling policies like Gang Scheduling, Fair Share,
        Binpacking, Priority-based scheduling, and more out of the box.
      </>
    ),
  },
  {
    title: 'Cloud Native Ecosystem',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Built on Kubernetes. Seamlessly integrates with Spark, TensorFlow,
        PyTorch, Flink, Argo, and other cloud-native frameworks.
      </>
    ),
  },
];

function Feature({ Svg, title, description }) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
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
