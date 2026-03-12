// @ts-check
import { themes as prismThemes } from "prism-react-renderer";

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Volcano",
  tagline: "Cloud native batch scheduling system",


  future: {
    v4: true,
  },

  url: "https://volcano.sh",
  baseUrl: "/",

  organizationName: "volcano-sh",
  projectName: "website",

  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh-Hans"],
    localeConfigs: {
      en: {
        label: "English",
        direction: "ltr",
        htmlLang: "en-US",
        calendar: "gregory",
      },
      "zh-Hans": {
        label: "中文",
        direction: "ltr",
        htmlLang: "zh-CN",
        calendar: "gregory",
      },
    },
  },
  plugins: [
    require.resolve("./plugins/blog-list-data"),
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      {
        docsRouteBasePath: "/docs",
        blogRouteBasePath: "/blog",
        language: ["en", "zh"],
        hashed: true,
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
        indexPages: true,
      },
    ],
  ],
  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: require.resolve('./sidebar.js'),
          showLastUpdateTime: true,
          showLastUpdateAuthor: false,
          editUrl: "https://github.com/volcano-sh/website/tree/main/",
          lastVersion: "current",
          versions: {
            current: {
              label: "v1.13.0 (Latest)",
              path: "",
            },
          },
        },
        blog: {
          showReadingTime: true,
          blogSidebarCount: "ALL",
          feedOptions: {
            type: ["rss", "atom"],
            xslt: true,
          },
          editUrl: "https://github.com/volcano-sh/website/tree/main/",
          onInlineTags: "warn",
          onInlineAuthors: "warn",
          onUntruncatedBlogPosts: "warn",
        },

        theme: {
          customCss: "./src/css/custom.css",
        },
      },
    ],
  ],

  themeConfig: {
    image: "img/docusaurus-social-card.jpg",
    navbar: {
      title: "",
      logo: {
        alt: "Volcano Logo",
        src: "img/landing/volcano_logo.png",
      },
      items: [
        {
          type: "doc",
          docId: "Home/Introduction",
          label: "Documentation",
          position: "left",
        },
        {
          type: "docsVersionDropdown",
          position: "right",
          dropdownItemsBefore: [],
          dropdownItemsAfter: [],
          dropdownActiveClassDisabled: false,
        },
        { to: "/blog", label: "Blog", position: "left" },

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
        {
          type: "search",
          position: "right",
        },
      ],
    },
    footer: {
      style: "light",
      links: [],
      copyright: `
        <div class="footer-content">
          <p>Volcano is a <a href="https://www.cncf.io/" target="_blank" rel="noopener noreferrer">Cloud Native Computing Foundation</a> incubating project.</p>
          <div class="footer__logo-container">
            <img class="footer__logo" alt="Cloud Native Computing Foundation Logo" src="/img/landing/logo_cloudnative.png" />
          </div>
          <p>The Linux Foundation has registered trademarks and uses trademarks. For a list of trademarks of The Linux Foundation, please see our <a href="https://www.linuxfoundation.org/trademark-usage" target="_blank" rel="noopener noreferrer">Trademark Usage</a> page.</p>
          <p>${new Date().getFullYear()} @ Volcano Project Authors. All rights reserved.</p>
      `,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  },
};

export default config;