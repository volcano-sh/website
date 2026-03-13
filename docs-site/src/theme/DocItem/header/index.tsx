import React from 'react';
import clsx from 'clsx';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import styles from './styles.module.css';

export default function DocItemHeader() {
  const {metadata} = useDoc();
  const {title, lastUpdatedAt} = metadata;

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>

      {lastUpdatedAt && (
        <div className={styles.lastUpdated}>
          Last updated on{' '}
          {new Date(lastUpdatedAt * 1000).toLocaleDateString()}
        </div>
      )}
    </header>
  );
}
