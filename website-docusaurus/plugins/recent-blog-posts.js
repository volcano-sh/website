const fs = require('node:fs');
const path = require('node:path');
const blogPluginExports = require('@docusaurus/plugin-content-blog');
const defaultBlogPlugin = blogPluginExports.default;

async function blogPluginEnhanced(...pluginArgs) {
  const blogPluginInstance = await defaultBlogPlugin(...pluginArgs);

  return {
    ...blogPluginInstance,
    contentLoaded: async function (data) {
      const recentPosts = [...data.content.blogPosts]
        .filter((p) => !p.metadata.unlisted)
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          metadata: p.metadata,
        }));

      const dir = path.join(__dirname, '..', '.docusaurus');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'recent-posts.json'),
        JSON.stringify(recentPosts),
      );

      return blogPluginInstance.contentLoaded(data);
    },
  };
}

module.exports = {
  ...blogPluginExports,
  default: blogPluginEnhanced,
};
