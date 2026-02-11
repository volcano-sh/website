#!/usr/bin/env node
/**
 * Migrate Hugo docs to Docusaurus format
 * - Converts +++ TOML frontmatter to --- YAML
 * - Removes Hugo-specific fields (menu.docs, type, draft, toc)
 * - Maps weight to sidebar_position
 */
const fs = require('fs');
const path = require('path');

const HUGO_DOCS = path.join(__dirname, '../../content/en/docs');
const DOCUSAURUS_DOCS = path.join(__dirname, '../docs');
const VERSIONED = ['v1-7-0', 'v1-8-2', 'v1-9-0', 'v1-10-0', 'v1-11-0', 'v1-12-0'];

function convertFrontmatter(content) {
  const match = content.match(/^\+\+\+\n([\s\S]*?)\n\+\+\+\n([\s\S]*)$/);
  if (!match) return content;
  const [, frontmatter, body] = match;
  const lines = frontmatter.split('\n');
  const result = {};
  let currentKey = null;
  for (const line of lines) {
    if (line.startsWith('[') && line.endsWith(']')) continue; // Skip [menu.docs]
    const kv = line.match(/^(\w+)\s*=\s*"?([^"]*)"?$/);
    if (kv) {
      currentKey = kv[1];
      result[currentKey] = kv[2].replace(/^["']|["']$/g, '').trim();
    }
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
  for (const e of entries) {
    if (e.name.startsWith('.') || excludeDirs.includes(e.name)) continue;
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

// Migrate latest docs (excluding version folders)
console.log('Migrating latest docs...');
migrateDir(HUGO_DOCS, DOCUSAURUS_DOCS, VERSIONED);

// Migrate versioned docs
const versionedDocs = path.join(__dirname, '../versioned_docs');
for (const v of VERSIONED) {
  const versionName = 'version-' + v.replace(/-/g, '.');
  const src = path.join(HUGO_DOCS, v);
  const dest = path.join(versionedDocs, versionName);
  if (fs.existsSync(src)) {
    console.log('Migrating', versionName, '...');
    migrateDir(src, dest, []);
  }
}
console.log('Done.');
