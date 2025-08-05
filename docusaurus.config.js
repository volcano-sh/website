// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'My Site',
  tagline: 'Dinosaurs are cool',
  favicon: 'favicons/favicon.svg',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://your-docusaurus-site.example.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'facebook', // Usually your GitHub org/user name.
  projectName: 'docusaurus', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: '',
        logo: {
          alt: 'Volacano Logo',
          src: 'img/volcano_logo.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'Home/Introduction',
            label: 'Documentation',
            position: 'left',
          },
          // {to: '/blog', label: 'Blog', position: 'left'},
          // {
          //   type: 'docsVersionDropdown',
          //   position: 'right',
          //   dropdownItemsBefore: [],
          //   dropdownItemsAfter: [],
          //   dropdownActiveClassDisabled: false,
          // },
          {
            href: "https://github.com/volcano-sh/",
            position: "right",
            className: "header-github-link header-icon",
          },
          {
            href: "https://x.com/volcano_sh",
            position: "right",
            className: "header-x-link header-icon",
          },
          {
            to: "https://cloud-native.slack.com/?redir=%2Farchives%2FC011GJDQS0N%3Fname%3DC011GJDQS0N",
            position: "right",
            className: "header-slack-link header-icon",
          },
          {
            type: "localeDropdown",
            position: "right",
          },
        ],
      },
        footer: {
        style: 'dark',
        links: [],
        copyright: `
          <div class="footer-content">
            <p>Volcano is a <a href="https://www.cncf.io/" target="_blank" rel="noopener noreferrer">Cloud Native Computing Foundation</a> incubating project.</p>
            <div class="footer__logo-container">
              <img class="footer__logo" alt="Cloud Native Computing Foundation Logo" src="img/logo_cloudnative.png" />
            </div>
            <p>The Linux Foundation has registered trademarks and uses trademarks. For a list of trademarks of The Linux Foundation, please see our <a href="https://www.linuxfoundation.org/trademark-usage" target="_blank" rel="noopener noreferrer">Trademark Usage</a> page.</p>
            <p>${new Date().getFullYear()} @ Volcano Project Authors. All rights reserved.</p>
          </div>
          <div class="footer__bottom">
            <div class="footer__back-to-top">
              <div class="footer__back-to-top-icon">↑</div>
            </div>
          </div>
        `,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
