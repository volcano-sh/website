import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import { motion } from 'framer-motion';

import styles from './index.module.css';
import TerminalDemo from '../components/TerminalDemo';
import SchedulerDiagram from '../components/SchedulerDiagram';

// Hero Section - Updated with animations and new components
function HomepageHero() {
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="volcano-hero-grid" style={{ position: 'relative', zIndex: 1 }}>

        {/* Left Column: Content + Terminal */}
        <div className="volcano-hero-content">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Heading as="h1" className="hero__title" style={{
              fontSize: '3.5rem',
              marginBottom: '1rem',
              lineHeight: 1.1
            }}>
              Volcano
            </Heading>
            <p className="hero__subtitle" style={{
              fontSize: '1.3rem',
              marginBottom: '2rem',
              maxWidth: '600px'
            }}>
              Cloud-Native Batch Scheduling for Kubernetes, optimized for AI/ML, Big Data, and HPC workloads.
            </p>

            <div className={styles.buttons} style={{ marginBottom: '2.5rem' }}>
              <Link
                className="button button--primary button--lg"
                to="/docs/intro"
                style={{ marginRight: '1rem', padding: '0.8rem 2rem' }}>
                Get Started →
              </Link>
              <Link
                className="button button--secondary button--lg"
                to="https://github.com/volcano-sh/volcano"
                style={{ padding: '0.8rem 2rem' }}>
                GitHub ★
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden md:block" // Hide terminal on very small screens if needed, but css handles it
          >
            <TerminalDemo />
          </motion.div>
        </div>

        {/* Right Column: Interactive Diagram */}
        <div className="volcano-hero-visual relative">
          <SchedulerDiagram />
        </div>

      </div>
    </header>
  );
}

// Feature Grid Component
function FeatureGrid() {
  const features = [
    {
      title: 'Gang Scheduling',
      icon: (
        <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" width="48" height="48">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
      description: 'All-or-nothing scheduling ensures entire job groups start together, preventing resource deadlocks.',
    },
    {
      title: 'Fair-Share Queues',
      icon: (
        <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" width="48" height="48">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
        </svg>
      ),
      description: 'DRF-based allocation guarantees fair resource distribution across teams and workloads.',
    },
    {
      title: 'AI / GPU Workloads',
      icon: (
        <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" width="48" height="48">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5M4.5 15.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
      description: 'Optimized for machine learning with GPU awareness, task topology, and batch job support.',
    },
    {
      title: 'Plugin Architecture',
      icon: (
        <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" width="48" height="48">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a2.873 2.873 0 00-1.003-.349C3.805 10.5 3 11.507 3 12.75c0 1.243.805 2.25 1.875 2.25a2.85 2.85 0 001.003-.349c.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.668-.643v0c0-.355-.186-.676-.401-.959a2.85 2.85 0 00-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0c.31 0 .555-.26.532-.57a48.039 48.039 0 01-.642-5.056c-1.518-.19-3.058-.309-4.616-.354a.64.64 0 00-.668.643v0z" />
        </svg>
      ),
      description: 'Extensible scheduler with modular plugins for custom scheduling policies and integrations.',
    },
  ];

  return (
    <section className="volcano-section">
      <div className="container">
        <Heading as="h2" className="volcano-section-title">
          Enterprise-Grade Features
        </Heading>
        <div className="row">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              className="col col--3"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="volcano-feature-card">
                <div className="volcano-feature-icon">{feature.icon}</div>
                <Heading as="h3">{feature.title}</Heading>
                <p>{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Use Case Blocks Component
function UseCases() {
  const useCases = [
    {
      title: 'Platform Engineers',
      description: 'Build multi-tenant platforms with fair resource sharing, quota management, and SLA guarantees.',
    },
    {
      title: 'Cluster Admins',
      description: 'Optimize utilization with intelligent scheduling, priority queues, and resource reclamation.',
    },
    {
      title: 'AI Engineers',
      description: 'Scale training workloads with gang scheduling, GPU management, and distributed job support.',
    },
    {
      title: 'Contributors',
      description: 'Extend Volcano with custom plugins, actions, and integrations via the open API.',
    },
  ];

  return (
    <section className="volcano-section" style={{ background: 'var(--volcano-card-bg)' }}>
      <div className="container">
        <Heading as="h2" className="volcano-section-title">
          Built for Your Use Case
        </Heading>
        <div className="row">
          {useCases.map((useCase, idx) => (
            <div key={idx} className="col col--6">
              <div className="volcano-use-case">
                <Heading as="h3">{useCase.title}</Heading>
                <p>{useCase.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Plugin Explorer Component
function PluginExplorer() {
  const plugins = [
    { name: 'Gang', description: 'All-or-nothing job scheduling' },
    { name: 'DRF', description: 'Dominant Resource Fairness' },
    { name: 'Priority', description: 'Fair-share prioritization' },
    { name: 'NodeOrder', description: 'Multi-dimensional scoring' },
    { name: 'SLA', description: 'Service level guarantees' },
  ];

  return (
    <section className="volcano-section">
      <div className="container">
        <Heading as="h2" className="volcano-section-title">
          Powerful Plugin Ecosystem
        </Heading>
        <div className="row">
          {plugins.map((plugin, idx) => (
            <div key={idx} className="col col--4" style={{ marginBottom: '1rem' }}>
              <div className="volcano-plugin-card">
                <div className="volcano-plugin-name">{plugin.name}</div>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>{plugin.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link to="/docs/scheduler/intro" className="button button--primary button--lg">
            Explore All Plugins →
          </Link>
        </div>
      </div>
    </section>
  );
}

// Main Homepage Component
export default function Home() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title={`${siteConfig.title} - Cloud Native Batch Scheduler`}
      description="Volcano is a CNCF project for cloud native batch scheduling on Kubernetes, optimized for AI/ML, HPC, and big data workloads.">
      <HomepageHero />
      <main>
        <FeatureGrid />
        <UseCases />
        <PluginExplorer />
      </main>
    </Layout>
  );
}
