// @ts-check
// Volcano website - Docusaurus configuration
// Reference: openkruise.io, oras-www

const {themes} = require('prism-react-renderer');
const lightTheme = themes.github;
const darkTheme = themes.dracula;

/** @type {import('@docusaurus/types').DocusaurusConfig} */
const config = {
  title: 'Volcano',
  tagline: 'A Cloud Native System for High-Performance Workloads',
  url: 'https://volcano.sh',
  baseUrl: '/',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'volcano-sh',
  projectName: 'volcano',
  trailingSlash: false,

  markdown: {
    format: 'detect',
    mermaid: true,
  },

  presets: [
    [
      '@docusaurus/preset-classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/volcano-sh/website/edit/main/website-docusaurus/',
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
          includeCurrentVersion: true,
          routeBasePath: 'docs',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  plugins: [
    [
      './plugins/recent-blog-posts.js',
      {
        showReadingTime: true,
        blogSidebarTitle: 'All posts',
        blogSidebarCount: 'ALL',
        editUrl: 'https://github.com/volcano-sh/website/edit/main/website-docusaurus/',
      },
    ],
  ],

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh'],
    localeConfigs: {
      en: {
        label: 'English',
      },
      zh: {
        label: '简体中文',
      },
    },
  },

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      algolia: {
        appId: process.env.ALGOLIA_APP_ID || 'KXO9RCDQGX',
        apiKey: process.env.ALGOLIA_API_KEY || '6f21a78a8681d337c3b93995f3291e08',
        indexName: 'volcano',
        contextualSearch: true,
      },
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        logo: {
          alt: 'Volcano Logo',
          src: 'img/volcano_logo.svg',
        },
        items: [
          {
            type: 'docsVersionDropdown',
            position: 'right',
            dropdownActiveClassDisabled: true,
          },
          {
            to: '/docs/',
            position: 'left',
            label: 'Docs',
          },
          {to: '/blog', label: 'Blog', position: 'left'},
          {
            type: 'localeDropdown',
            position: 'right',
          },
          {
            href: 'https://github.com/volcano-sh/volcano',
            className: 'header-github-link',
            position: 'right',
            'aria-label': 'GitHub',
          },
          {
            href: 'https://x.com/volcano_sh',
            position: 'right',
            label: 'X',
            'aria-label': 'X (Twitter)',
          },
          {
            href: 'https://cloud-native.slack.com/archives/C011GJDQS0N',
            position: 'right',
            label: 'Slack',
            'aria-label': 'Slack',
          },
        ],
      },
      footer: {
        style: 'light',
        logo: {
          src: 'img/cncf-color.svg',
          alt: 'Cloud Native Computing Foundation',
          href: 'https://www.cncf.io/projects/volcano/',
        },
        links: [
          {
            title: 'Documentation',
            items: [
              {label: 'Introduction', to: '/docs/'},
              {label: 'Installation', to: '/docs/installation'},
              {label: 'Getting Started', to: '/docs/tutorials'},
              {label: 'Concepts', to: '/docs/podgroup'},
            ],
          },
          {
            title: 'Community',
            items: [
              {label: 'GitHub', href: 'https://github.com/volcano-sh/volcano'},
              {label: 'Slack', href: 'https://cloud-native.slack.com/archives/C011GJDQS0N'},
              {label: 'X (Twitter)', href: 'https://x.com/volcano_sh'},
            ],
          },
          {
            title: 'More',
            items: [
              {label: 'Blog', to: '/blog'},
              {label: 'CNCF', href: 'https://www.cncf.io/projects/volcano/'},
            ],
          },
        ],
        copyright: `
        Volcano is a <a href="https://www.cncf.io/projects/volcano/">Cloud Native Computing Foundation</a> graduated project.
        <br /><br />
        <strong>© ${new Date().getFullYear()} The Volcano Authors. All rights reserved. The Linux Foundation has registered trademarks and uses trademarks. For a list of trademarks of The Linux Foundation, please see our <a href="https://www.linuxfoundation.org/trademark-usage/">Trademark Usage</a> page.</strong>
        `,
      },
      prism: {
        theme: lightTheme,
        darkTheme: darkTheme,
        additionalLanguages: ['bash', 'yaml', 'json'],
      },
      colorMode: {
        respectPrefersColorScheme: true,
      },
    }),
};

module.exports = config;
