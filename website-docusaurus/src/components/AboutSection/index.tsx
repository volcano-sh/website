import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

/**
 * Why Volcano - 8 feature items from Hugo author Volcano content
 */
const FEATURES = [
  {title: 'Unified Scheduling', desc: 'Supports integrated job scheduling for both Kubernetes native workloads and mainstream computing frameworks (such as TensorFlow, Spark, PyTorch, Ray, Flink, etc.).', href: '/docs/unified_scheduling'},
  {title: 'Queue Management', desc: 'Provides multi-level queue management capabilities, enabling fine-grained resource quota control and task priority scheduling.', href: '/docs/queue_resource_management'},
  {title: 'Heterogeneous Device Support', desc: 'Efficiently schedules heterogeneous devices like GPU and NPU, fully unleashing hardware computing potential.', href: '/docs/gpu_virtualization'},
  {title: 'Network Topology Aware Scheduling', desc: 'Greatly enhancing model training efficiency in AI distributed training scenarios.', href: '/docs/network_topology_aware_scheduling'},
  {title: 'Multi-cluster Scheduling', desc: 'Supports cross cluster job scheduling, improving resource pool management capabilities and achieving large scale load balancing.', href: '/docs/multi_cluster_scheduling'},
  {title: 'Online and Offline Workloads Colocation', desc: 'Enables online and offline workloads colocation, improving cluster resource utilization through intelligent scheduling strategies.', href: '/docs/colocation'},
  {title: 'Load Aware Descheduling', desc: 'Optimizing cluster load distribution and enhancing system stability.', href: '/docs/descheduler'},
  {title: 'Multiple Scheduling Policies', desc: 'Supports various scheduling strategies such as Gang scheduling, Fair-Share, Binpack, DeviceShare, NUMA-aware scheduling, Task Topology, etc.', href: '/docs/schduler_introduction'},
];

export default function AboutSection(): JSX.Element {
  return (
    <section id="about" className={styles.section}>
      <div className="container">
        <h2 className={styles.title}>Why Volcano</h2>
        <div className={styles.featureList}>
          {FEATURES.map((f, i) => (
            <Link key={i} to={f.href} className={styles.featureItem}>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
