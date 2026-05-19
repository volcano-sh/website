import React, { useEffect, useState, useRef } from 'react';
import clsx from 'clsx';
import { useInView } from 'framer-motion';
import styles from './TerminalDemo.module.css';

interface TerminalLine {
    type: 'prompt' | 'success';
    text: string;
}

const TERMINAL_LINES: TerminalLine[] = [
    { type: 'prompt', text: '$ volcanoctl install --namespace volcano-system' },
    { type: 'success', text: '✓ scheduler.volcano.sh/v1beta1 deployed' },
    { type: 'success', text: '✓ admission-controller configured' },
    { type: 'success', text: '✓ queues.scheduling.volcano.sh initialized' },
    { type: 'success', text: '✓ podgroups.scheduling.volcano.sh verified' },
    { type: 'success', text: '✓ Volcano successfully installed!' },
];

export default function TerminalDemo() {
    const [lines, setLines] = useState<number>(0);
    const [key, setKey] = useState(0); // Key to force re-trigger
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-50px' });

    // Start animation when in view or when key changes (replay)
    useEffect(() => {
        if (isInView) {
            setLines(0); // Reset lines
            const timer = setInterval(() => {
                setLines((prev) => {
                    if (prev < TERMINAL_LINES.length) {
                        return prev + 1;
                    }
                    clearInterval(timer);
                    return prev;
                });
            }, 800);
            return () => clearInterval(timer);
        }
    }, [isInView, key]); // Re-run when key changes

    const handleReplay = () => {
        setKey(prev => prev + 1); // Change key to re-trigger effect
    };

    return (
        <div ref={ref} className={styles.terminalContainer} role="region" aria-label="Terminal Installation Demo">
            <div className={styles.terminalHeader}>
                <div className={clsx(styles.dot, styles.dotRed)} />
                <div className={clsx(styles.dot, styles.dotYellow)} />
                <div className={clsx(styles.dot, styles.dotGreen)} />
            </div>

            <div className={styles.content}>
                {TERMINAL_LINES.slice(0, lines).map((line, idx) => (
                    <div
                        key={idx}
                        className={clsx(styles.line, idx === 0 && styles.typingLine)}
                        style={{ animationDelay: `${idx * 0.15}s` }}
                    >
                        <span className={line.type === 'prompt' ? styles.prompt : styles.successTick}>
                            {line.type === 'prompt' ? '>' : '✓'}
                        </span>
                        <span>{line.text.replace('$ ', '')}</span>
                    </div>
                ))}
            </div>

            {lines === TERMINAL_LINES.length && (
                <button
                    onClick={handleReplay}
                    className={styles.replayButton}
                    aria-label="Replay animation"
                >
                    Replay ↺
                </button>
            )}
        </div>
    );
}
