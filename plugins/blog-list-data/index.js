const path = require("path");
const fs = require("fs");
const matter = require("gray-matter");

module.exports = function (context, options) {
  const { siteDir, i18n } = context;
  const currentLocale = i18n?.currentLocale || "en";

  const blogPath =
    currentLocale === "zh-Hans"
      ? path.join(siteDir, "i18n", "zh-Hans", "docusaurus-plugin-content-blog")
      : path.join(siteDir, "blog");

  return {
    name: "blog-list-data",
    async contentLoaded({ actions }) {
      const posts = [];
      if (!fs.existsSync(blogPath)) {
        actions.setGlobalData({ blogList: [] });
        return;
      }

      const files = fs
        .readdirSync(blogPath, { withFileTypes: true })
        .filter((f) =>
          f.isFile() && (f.name.endsWith('.md') || f.name.endsWith('.mdx')) && f.name !== '_index.md'
        )
        .map((f) => f.name);

      for (const file of files) {
        const filePath = path.join(blogPath, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const { data: fm } = matter(content);

        let dateStr = fm.date || null;
        let timestamp = 0;
        if (dateStr) {
          const t = Date.parse(dateStr);
          if (!Number.isNaN(t)) {
            timestamp = t;
          } else {
            dateStr = null;
          }
        }
        if (!dateStr) {
          const stat = fs.statSync(filePath);
          timestamp = stat.mtimeMs;
          dateStr = new Date(timestamp).toISOString();
        }

        const slug = file.replace(/\.mdx?$/, '');
        const permalink =
          currentLocale === "zh-Hans" ? `/zh-Hans/blog/${slug}` : `/blog/${slug}`;

        let authors = fm.authors || [];
        if (typeof authors === "string") {
          authors = [authors];
        }
        if (!Array.isArray(authors)) {
          authors = [];
        }

        posts.push({
          id: slug,
          title: fm.title || "Untitled",
          date: dateStr,
          permalink,
          description: fm.description || "",
          authors,
          _timestamp: timestamp,
        });
      }


      posts.sort((a, b) => b._timestamp - a._timestamp);

      const blogList = posts.map(({ _timestamp, ...rest }) => rest);
      actions.setGlobalData({ blogList });
    },
  };
};
