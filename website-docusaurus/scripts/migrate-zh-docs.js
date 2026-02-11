#!/usr/bin/env node
/**
 * Migrate Chinese docs to Docusaurus i18n
 */
const fs = require('fs');
const path = require('path');

const HUGO_ZH_DOCS = path.join(__dirname, '../../content/zh/docs');
const I18N_ZH_DOCS = path.join(__dirname, '../i18n/zh/docusaurus-plugin-content-docs/current');

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
  const sidebar = lines.find(l => l.includes('weight'))?.match(/weight\s*=\s*(\d+)/);
  const pos = sidebar ? parseInt(sidebar[1], 10) : 10;
  const out = ['---', `title: ${JSON.stringify(result.title || 'Untitled')}`, `sidebar_position: ${pos}`, '---', '', body.trim(), ''].join('\n');
  return out;
}

function migrateDir(srcDir, destDir, excludeDirs = []) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  const VERSIONED = ['v1-7-0', 'v1-8-2', 'v1-9-0', 'v1-10-0', 'v1-11-0', 'v1-12-0'];
  for (const e of entries) {
    if (e.name.startsWith('.') || VERSIONED.includes(e.name)) continue;
    const srcPath = path.join(srcDir, e.name);
    const destPath = path.join(destDir, e.name);
    if (e.isDirectory()) {
      migrateDir(srcPath, destPath, []);
    } else if (e.name.endsWith('.md')) {
      let content = fs.readFileSync(srcPath, 'utf8');
      content = convertFrontmatter(content);
      content = content.replace(/\]\(\/en\/docs\//g, '](/docs/').replace(/\]\(\/zh\/docs\//g, '](/zh/docs/');
      const outName = e.name === '_index.md' ? 'intro.md' : e.name;
      fs.writeFileSync(path.join(destDir, outName), content);
    }
  }
}

console.log('Migrating ZH docs to i18n...');
migrateDir(HUGO_ZH_DOCS, I18N_ZH_DOCS);
console.log('Done.');
