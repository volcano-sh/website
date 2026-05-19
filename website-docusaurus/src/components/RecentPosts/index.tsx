import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

type PostMetadata = {
  title: string;
  permalink: string;
  formattedDate: string;
  date?: string;
  description?: string;
  authors?: string[];
};

let recentPosts: Array<{id: string; metadata: PostMetadata}> = [];
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  recentPosts = require('@site/.docusaurus/recent-posts.json');
} catch {
  // File not yet generated (e.g. first run)
}

function formatDateDisplay(dateStr?: string, formatted?: string): {day: string; monthYear: string} {
  if (dateStr) {
    try {
      const d = new Date(dateStr);
      return {
        day: d.getDate().toString(),
        monthYear: d.toLocaleDateString('en-US', {month: 'short', year: 'numeric'}),
      };
    } catch {
      // fallthrough
    }
  }
  if (formatted) {
    const parts = formatted.split(' ');
    if (parts.length >= 3) {
      const day = parts[1]?.replace(',', '') ?? '';
      const monthYear = `${parts[0]} ${parts[2]}`;
      return {day, monthYear};
    }
  }
  return {day: '', monthYear: formatted ?? ''};
}

/**
 * Recent Posts section - card-based layout with Volcano styling
 */
export default function RecentPosts(): JSX.Element {
  return (
    <section id="posts" className={styles.section}>
      <div className="container">
        <h2 className={styles.title}>Recent Posts</h2>
        <p className={styles.subtitle}>Latest news and updates from the Volcano community</p>
        {recentPosts.length > 0 ? (
          <div className={styles.postGrid}>
            {recentPosts.map((post) => {
              const {day, monthYear} = formatDateDisplay(
                post.metadata.date,
                post.metadata.formattedDate,
              );
              return (
                <Link
                  key={post.id}
                  to={post.metadata.permalink}
                  className={styles.postCard}>
                  <div className={styles.cardDate}>
                    {day && <span className={styles.cardDay}>{day}</span>}
                    <span className={styles.cardMonthYear}>{monthYear}</span>
                  </div>
                  <div className={styles.cardContent}>
                    <h3 className={styles.cardTitle}>{post.metadata.title}</h3>
                    {post.metadata.description && (
                      <p className={styles.cardDesc}>
                        {post.metadata.description.length > 120
                          ? `${post.metadata.description.slice(0, 120)}...`
                          : post.metadata.description}
                      </p>
                    )}
                    <span className={styles.readMore}>Read more →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
        <div className={styles.viewAllWrap}>
          <Link to="/blog" className={styles.viewAllBtn}>
            View all posts
          </Link>
        </div>
      </div>
    </section>
  );
}
