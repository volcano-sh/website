#!/usr/bin/env node
/**
 * Migrate Hugo blog posts to Docusaurus format
 */
const fs = require('fs');
const path = require('path');

const HUGO_BLOG_EN = path.join(__dirname, '../../content/en/blog');
const HUGO_BLOG_ZH = path.join(__dirname, '../../content/zh/blog');
const DOCUSAURUS_BLOG = path.join(__dirname, '../blog');
const I18N_ZH_BLOG = path.join(__dirname, '../i18n/zh/docusaurus-plugin-content-blog');

function convertFrontmatter(content) {
  const match = content.match(/^\+\+\+\n([\s\S]*?)\n\+\+\+\n([\s\S]*)$/);
  if (!match) return content;
  const [, frontmatter, body] = match;
  const lines = frontmatter.split('\n');
  const result = {};
  for (const line of lines) {
    if (line.startsWith('[')) continue;
    const kv = line.match(/^(\w+)\s*=\s*"?([^"]*)"?$/);
    if (kv) result[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  const date = result.date ? result.date.split('T')[0] : '2020-01-01';
  const slug = result.linktitle || result.title || 'post';
  const out = [
    '---',
    `title: ${JSON.stringify(result.title || 'Untitled')}`,
    result.description ? `description: ${JSON.stringify(result.description)}` : null,
    `date: ${date}`,
    result.authors ? `authors: [${(result.authors || 'volcano').split(',').map(a => JSON.stringify(a.trim())).join(', ')}]` : 'authors: [volcano]',
    result.tags ? `tags: [${(result.tags || '').split(',').map(t => JSON.stringify(t.trim())).filter(Boolean).join(', ')}]` : null,
    '---',
    '',
    body.trim(),
    '',
  ].filter(Boolean).join('\n');
  return out;
}

function migrateBlog(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === '_index.md') continue;
    const srcPath = path.join(srcDir, e.name);
    if (e.isDirectory()) {
      const indexMd = path.join(srcPath, 'index.md');
      if (fs.existsSync(indexMd)) {
        let content = fs.readFileSync(indexMd, 'utf8');
        content = convertFrontmatter(content);
        content = content.replace(/\]\(\/en\/docs\//g, '](/docs/').replace(/\]\(\/zh\/docs\//g, '](/zh/docs/').replace(/\]\(\/en\/blog\//g, '](/blog/').replace(/\]\(\/zh\/blog\//g, '](/zh/blog/');
        const date = (content.match(/date:\s*(\d{4}-\d{2}-\d{2})/) || ['', '2020-01-01'])[1];
        const slug = e.name.replace(/\s+/g, '-').toLowerCase();
        const outName = `${date}-${slug}.md`;
        fs.writeFileSync(path.join(destDir, outName), content);
      }
    } else if (e.name.endsWith('.md')) {
      let content = fs.readFileSync(srcPath, 'utf8');
      content = convertFrontmatter(content);
      content = content.replace(/\]\(\/en\/docs\//g, '](/docs/').replace(/\]\(\/zh\/docs\//g, '](/zh/docs/').replace(/\]\(\/en\/blog\//g, '](/blog/').replace(/\]\(\/zh\/blog\//g, '](/zh/blog/');
      const date = (content.match(/date:\s*(\d{4}-\d{2}-\d{2})/) || ['', '2020-01-01'])[1];
      const slug = e.name.replace(/\.md$/, '').replace(/\s+/g, '-').toLowerCase();
      const outName = `${date}-${slug}.md`;
      fs.writeFileSync(path.join(destDir, outName), content);
    }
  }
}

console.log('Migrating EN blog...');
fs.mkdirSync(DOCUSAURUS_BLOG, { recursive: true });
// Remove default Docusaurus blog posts
['2019-05-28-first-blog-post.md', '2019-05-29-long-blog-post.md', '2021-08-01-mdx-blog-post.mdx'].forEach(f => {
  const p = path.join(DOCUSAURUS_BLOG, f);
  if (fs.existsSync(p)) fs.unlinkSync(p);
});
const welcomeDir = path.join(DOCUSAURUS_BLOG, '2021-08-26-welcome');
if (fs.existsSync(welcomeDir)) fs.rmSync(welcomeDir, { recursive: true });
migrateBlog(HUGO_BLOG_EN, DOCUSAURUS_BLOG);

console.log('Migrating ZH blog...');
fs.mkdirSync(I18N_ZH_BLOG, { recursive: true });
migrateBlog(HUGO_BLOG_ZH, I18N_ZH_BLOG);

console.log('Done.');
