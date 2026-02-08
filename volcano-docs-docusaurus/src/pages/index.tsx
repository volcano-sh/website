import React, { useEffect, useState, useRef } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

// Animated terminal install component
function TerminalInstall() {
  const [lines, setLines] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setLines(prev => (prev < 6 ? prev + 1 : prev));
    }, 400);
    return () => clearInterval(timer);
  }, []);

  const terminalLines = [
    { type: 'prompt', text: '$ volcanoctl install' },
    { type: 'success', text: '✓ scheduler deployed' },
    { type: 'success', text: '✓ plugins loaded' },
    { type: 'success', text: '✓ queues configured' },
    { type: 'success', text: '✓ gang scheduling enabled' },
    { type: 'success', text: '✓ GPU plugin active' },
  ];

  return (
    <div className="volcano-terminal">
      {terminalLines.slice(0, lines).map((line, idx) => (
        <div
          key={idx}
          className="volcano-terminal-line"
          style={{ animationDelay: `${idx * 0.4}s` }}
        >
          <span className="volcano-terminal-prompt">{line.type === 'prompt' ? '$' : '✓'}</span>
          <span className={line.type === 'success' ? 'volcano-terminal-success' : ''}>{line.text.replace('$ ', '').replace('✓ ', '')}</span>
        </div>
      ))}
    </div>
  );
}

// Animated SVG Visualization
function VolcanoVisualization() {
  const [activePulse, setActivePulse] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePulse(prev => (prev + 1) % 6);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <svg viewBox="0 0 400 400" style={{ width: '100%', height: 'auto', maxHeight: '500px' }}>
      {/* Background grid */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
        </pattern>
      </defs>

      <rect width="400" height="400" fill="url(#grid)" />

      {/* Central Scheduler Node */}
      <g className="volcano-viz-node">
        <circle cx="200" cy="200" r="30" fill="var(--ifm-color-primary)" opacity="0.2" />
        <circle cx="200" cy="200" r="20" fill="var(--ifm-color-primary)" />
        <text x="200" y="205" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
          Scheduler
        </text>
      </g>

      {/* Plugin Nodes */}
      {[
        { x: 200, y: 100, name: 'Gang', angle: 0 },
        { x: 286, y: 150, name: 'DRF', angle: 60 },
        { x: 286, y: 250, name: 'Priority', angle: 120 },
        { x: 200, y: 300, name: 'NodeOrder', angle: 180 },
        { x: 114, y: 250, name: 'SLA', angle: 240 },
        { x: 114, y: 150, name: 'TDM', angle: 300 },
      ].map((plugin, idx) => (
        <g key={idx} className="volcano-viz-node">
          {/* Edge to center */}
          <line
            x1={plugin.x}
            y1={plugin.y}
            x2="200"
            y2="200"
            className={clsx('volcano-viz-edge', activePulse === idx && 'active')}
          />

          {/* Pulse animation */}
          {activePulse === idx && (
            <circle className="volcano-viz-pulse">
              <animate
                attributeName="cx"
                from={plugin.x}
                to="200"
                dur="2s"
                repeatCount="1"
              />
              <animate
                attributeName="cy"
                from={plugin.y}
                to="200"
                dur="2s"
                repeatCount="1"
              />
            </circle>
          )}

          {/* Plugin node */}
          <circle cx={plugin.x} cy={plugin.y} r="12" fill="var(--ifm-color-primary-light)" opacity="0.3" />
          <circle cx={plugin.x} cy={plugin.y} r="8" fill="var(--ifm-color-primary)" />
          <text
            x={plugin.x}
            y={plugin.y - 20}
            textAnchor="middle"
            fill="currentColor"
            fontSize="9"
            fontWeight="600"
          >
            {plugin.name}
          </text>
        </g>
      ))}

      {/* Worker Clusters */}
      {[
        { cx: 60, cy: 60 },
        { cx: 340, cy: 60 },
        { cx: 340, cy: 340 },
        { cx: 60, cy: 340 },
      ].map((cluster, idx) => (
        <g key={idx} opacity="0.6">
          <circle cx={cluster.cx} cy={cluster.cy} r="4" fill="currentColor" />
          <circle cx={cluster.cx + 8} cy={cluster.cy + 8} r="3" fill="currentColor" />
          <circle cx={cluster.cx - 8} cy={cluster.cy + 8} r="3" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}

// Hero Section - Using CSS Variables
function HomepageHero() {
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      {/* Background is handled by CSS variables in custom.css */}
      <div className="volcano-hero-grid" style={{ position: 'relative', zIndex: 1 }}>
        {/* Left Column */}
        <div className="volcano-hero-content">
          <Heading as="h1" className="hero__title" style={{
            fontSize: '3.5rem',
            marginBottom: '1rem',
            // color handled by CSS variable
          }}>
            Volcano
          </Heading>
          <p className="hero__subtitle" style={{
            fontSize: '1.3rem',
            marginBottom: '2rem',
            // color handled by CSS variable
          }}>
            Cloud-Native Batch Scheduling for Kubernetes and AI Workloads
          </p>

          <div className={styles.buttons} style={{ marginBottom: '2rem' }}>
            <Link
              className="button button--primary button--lg"
              to="/docs/intro"
              style={{ marginRight: '1rem' }}>
              Get Started →
            </Link>
            <Link
              className="button button--secondary button--lg"
              to="https://github.com/volcano-sh">
              GitHub ★
            </Link>
          </div>

          <TerminalInstall />
        </div>

        {/* Right Column - SVG Visualization */}
        <div className="volcano-hero-visual">
          <VolcanoVisualization />
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
            <div key={idx} className="col col--3">
              <div className="volcano-feature-card">
                <div className="volcano-feature-icon">{feature.icon}</div>
                <Heading as="h3">{feature.title}</Heading>
                <p>{feature.description}</p>
              </div>
            </div>
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
