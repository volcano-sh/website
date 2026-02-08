import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import styles from './SchedulerDiagram.module.css';

// Data model for the scheduler nodes
const SCHEDULER_NODES = [
    { id: 'gang', name: 'Gang', x: 200, y: 100, description: 'All-or-nothing scheduling' },
    { id: 'drf', name: 'DRF', x: 286, y: 150, description: 'Dominant Resource Fairness' },
    { id: 'priority', name: 'Priority', x: 286, y: 250, description: 'Job & Task prioritization' },
    { id: 'nodeorder', name: 'NodeOrder', x: 200, y: 300, description: 'Best-fit node selection' },
    { id: 'sla', name: 'SLA', x: 114, y: 250, description: 'Service Level Agreements' },
    { id: 'tdm', name: 'TDM', x: 114, y: 150, description: 'Time Division Multiplexing' },
];

export default function SchedulerDiagram() {
    const [activeNode, setActiveNode] = useState<string | null>(null);
    const [activePulse, setActivePulse] = useState(0);

    // Auto-rotate pulse animation
    useEffect(() => {
        const timer = setInterval(() => {
            setActivePulse((prev) => (prev + 1) % SCHEDULER_NODES.length);
        }, 2000);
        return () => clearInterval(timer);
    }, []);

    // Keyboard navigation handler
    const handleKeyDown = (e: React.KeyboardEvent, nodeId: string) => {
        if (e.key === 'Enter' || e.key === ' ') {
            setActiveNode(nodeId === activeNode ? null : nodeId);
        }
    };

    return (
        <div className={styles.diagramContainer} role="region" aria-label="Interactive Scheduler Architecture Diagram">
            {/* Desktop SVG Visualization */}
            <motion.div
                className={styles.desktopView}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
            >
                <svg viewBox="0 0 400 400" className={styles.svgRoot} style={{ fontFamily: 'var(--ifm-heading-font-family)' }}>
                    <defs>
                        {/* Background Grid Pattern */}
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
                        </pattern>

                        {/* Glow Filter */}
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Background Grid */}
                    <rect width="400" height="400" fill="url(#grid)" />

                    {/* Central Scheduler Core */}
                    <g className={styles.schedulerCore}>
                        <circle cx="200" cy="200" r="30" fill="var(--ifm-color-primary)" opacity="0.2" />
                        <circle cx="200" cy="200" r="20" fill="var(--ifm-color-primary)" filter="url(#glow)" />
                        <text x="200" y="205" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700" pointerEvents="none" letterSpacing="0.5">
                            Scheduler
                        </text>
                    </g>

                    {/* Connection Lines */}
                    {SCHEDULER_NODES.map((node, idx) => (
                        <line
                            key={`edge-${node.id}`}
                            x1="200" y1="200"
                            x2={node.x} y2={node.y}
                            stroke="var(--ifm-color-primary)"
                            strokeWidth={activeNode === node.id || activePulse === idx ? 3 : 1}
                            opacity={activeNode === node.id || activePulse === idx ? 1 : 0.3}
                            style={{ transition: 'all 0.3s ease' }}
                        />
                    ))}

                    {/* Pulse Animations */}
                    {SCHEDULER_NODES.map((node, idx) => (
                        activePulse === idx && (
                            <circle key={`pulse-${idx}`} r="4" fill="var(--ifm-color-primary)">
                                <animate
                                    attributeName="cx"
                                    from={node.x}
                                    to="200"
                                    dur="2s"
                                    repeatCount="1"
                                />
                                <animate
                                    attributeName="cy"
                                    from={node.y}
                                    to="200"
                                    dur="2s"
                                    repeatCount="1"
                                />
                            </circle>
                        )
                    ))}

                    {/* Plugin Nodes */}
                    {SCHEDULER_NODES.map((node, idx) => {
                        // Calculate label position to avoid overlap
                        const labelOffset = 40; // Increased from 30
                        const angle = Math.atan2(node.y - 200, node.x - 200);
                        const labelX = node.x + Math.cos(angle) * labelOffset;
                        const labelY = node.y + Math.sin(angle) * labelOffset;

                        return (
                            <g
                                key={node.id}
                                onClick={() => setActiveNode(node.id === activeNode ? null : node.id)}
                                onMouseEnter={() => setActiveNode(node.id)}
                                onMouseLeave={() => setActiveNode(null)}
                                className={styles.pluginNode}
                                tabIndex={0}
                                role="button"
                                aria-label={`Select ${node.name} plugin`}
                                onKeyDown={(e) => handleKeyDown(e, node.id)}
                            >
                                <circle
                                    cx={node.x} cy={node.y}
                                    r="12"
                                    fill="var(--ifm-color-primary-light)"
                                    opacity="0.3"
                                />
                                <circle
                                    cx={node.x} cy={node.y}
                                    r={activeNode === node.id ? 10 : 8}
                                    fill="var(--ifm-color-primary)"
                                    style={{ transition: 'all 0.3s ease' }}
                                />

                                {/* Text background for better readability */}
                                <rect
                                    x={labelX - 35}
                                    y={labelY - 12}
                                    width="70"
                                    height="20"
                                    fill="var(--ifm-background-color)"
                                    opacity="0.9"
                                    rx="4"
                                />
                                <text
                                    x={labelX}
                                    y={labelY + 4}
                                    textAnchor="middle"
                                    fill="var(--ifm-font-color-base)"
                                    fontSize="13"
                                    fontWeight="600"
                                    pointerEvents="none"
                                    letterSpacing="0.3"
                                >
                                    {node.name}
                                </text>

                                {/* Tooltip for functionality */}
                                {activeNode === node.id && (
                                    <g transform={`translate(${node.x}, ${node.y - 45})`}>
                                        <rect x="-60" y="-20" width="120" height="24" className={styles.tooltipRect} />
                                        <text x="0" y="-5" className={styles.tooltipText}>
                                            {node.description}
                                        </text>
                                    </g>
                                )}
                            </g>
                        );
                    })}

                    {/* Worker Clusters in Corners */}
                    {[
                        { cx: 60, cy: 60 },
                        { cx: 340, cy: 60 },
                        { cx: 340, cy: 340 },
                        { cx: 60, cy: 340 },
                    ].map((cluster, idx) => (
                        <g key={`cluster-${idx}`} opacity="0.6">
                            <circle cx={cluster.cx} cy={cluster.cy} r="4" fill="currentColor" />
                            <circle cx={cluster.cx + 8} cy={cluster.cy + 8} r="3" fill="currentColor" />
                            <circle cx={cluster.cx - 8} cy={cluster.cy + 8} r="3" fill="currentColor" />
                        </g>
                    ))}
                </svg>
            </motion.div>

            {/* Mobile Fallback Cards */}
            <div className={styles.mobileView}>
                {SCHEDULER_NODES.map((node) => (
                    <div key={node.id} className={styles.nodeCard}>
                        <h3 className={styles.nodeTitle}>{node.name}</h3>
                        <p className={styles.nodeDesc}>{node.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
