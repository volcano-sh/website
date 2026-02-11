import type {ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HeroCarousel from '@site/src/components/HeroCarousel';
import AboutSection from '@site/src/components/AboutSection';
import FrameworkSupport from '@site/src/components/FrameworkSupport';
import RecentPosts from '@site/src/components/RecentPosts';
import SupportersSection from '@site/src/components/SupportersSection';

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <main>
        <HeroCarousel />
        <AboutSection />
        <FrameworkSupport />
        <RecentPosts />
        <SupportersSection />
      </main>
    </Layout>
  );
}
