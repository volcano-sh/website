import React from 'react';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

/**
 * Volcano landing hero - static first slide only (matches Hugo original)
 * Original Hugo hides carousel controls and shows only first slide
 */
export default function HeroCarousel(): JSX.Element {
  const bgUrl = useBaseUrl('/img/headers/banner_02.png');

  return (
    <>
      <Head>
        <script async defer src="https://buttons.github.io/buttons.js" />
      </Head>
      <section id="home_slider" className={styles.hero} style={{backgroundImage: `url(${bgUrl})`}}>
      <div className="container">
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>Volcano</h1>
        <p className={styles.heroLead}>
          Cloud native batch scheduling system for compute-intensive workloads
        </p>
        <div className={styles.heroActions}>
          <a
            className="github-button"
            href="https://github.com/volcano-sh/volcano"
            data-icon="octicon-star"
            data-size="large"
            data-show-count="true"
            aria-label="Star volcano-sh/volcano on GitHub">
            Star
          </a>
          <Link className={styles.ctaButton} to="/docs/intro">
            Learn More About Volcano
          </Link>
        </div>
      </div>
      </div>
    </section>
    </>
  );
}
