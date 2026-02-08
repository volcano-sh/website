# Volcano Website Migration: Hugo → Docusaurus

## Overview

This document explains the ongoing migration of the Volcano project website from Hugo to Docusaurus. The migration aims to modernize the documentation platform, improve contributor experience, and align with current CNCF ecosystem standards.

**Status**: 🚧 In Progress — Docusaurus site is functional in `volcano-docs-docusaurus/` subdirectory  
**Netlify Preview**: ✅ Configured to build Docusaurus (not Hugo)  
**Target Completion**: Q1 2026

---

## Why Docusaurus?

### Replacing Hugo

While Hugo has served the Volcano project well, we're migrating to Docusaurus for several strategic reasons:

1. **Modern React Ecosystem**
   - Better integration with interactive components and visualizations
   - Rich plugin ecosystem actively maintained by Meta/Facebook
   - Native support for MDX (Markdown + JSX)

2. **CNCF Alignment**
   - Kubernetes, Istio, and other CNCF projects use Docusaurus
   - Shared best practices and reusable components across projects
   - Easier onboarding for contributors familiar with the CNCF ecosystem

3. **Developer Experience**
   - Hot module reload during local development
   - Better TypeScript support for theme customization
   - Modern build pipeline with Webpack/ESBuild

4. **Documentation Features**
   - Versioned documentation out of the box
   - Native search with Algolia DocSearch integration
   - Better internal link validation and broken link detection
   - Superior i18n (internationalization) support

5. **Maintenance & Community**
   - Active development and regular updates
   - Large community and extensive documentation
   - Better accessibility (a11y) defaults

---

## Current Architecture

### Why a Subdirectory?

The Docusaurus site currently lives in `volcano-docs-docusaurus/` as a **parallel implementation** during the migration phase. This approach allows us to:

- ✅ Keep the existing Hugo site operational while we migrate
- ✅ Review and validate the Docusaurus implementation before switching
- ✅ Avoid breaking the production website during development
- ✅ Make the migration reviewable in manageable PRs
- ✅ Maintain Hugo as a fallback if needed

**Post-Migration Plan**: Once approved, we'll move Docusaurus content to the repo root and archive Hugo.

### Directory Structure

```
volcano-website/
├── volcano-docs-docusaurus/    # ← NEW: Docusaurus site
│   ├── docs/                   # Documentation content (MDX)
│   ├── src/                    # React components, pages, CSS
│   ├── static/                 # Static assets
│   ├── docusaurus.config.ts    # Site configuration
│   ├── package.json            # Node dependencies
│   └── tsconfig.json           # TypeScript config
│
├── content/                    # ← OLD: Hugo content (to be archived)
├── layouts/                    # ← OLD: Hugo layouts (to be archived)
├── themes/                     # ← OLD: Hugo theme (to be archived)
├── config/                     # ← OLD: Hugo config (to be archived)
│
├── netlify.toml                # ← UPDATED: Now builds Docusaurus
├── README.md                   # Repo README
└── Docusaurus-MIGRATION.md     # ← This file
```

---

## Running Locally

### Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher

### Development Server

```bash
# Navigate to Docusaurus directory
cd volcano-docs-docusaurus

# Install dependencies (first time only)
npm ci

# Start development server with hot reload
npm start

# Server runs at: http://localhost:3000
```

### Production Build

```bash
# Build static site
npm run build

# Preview production build locally
npm run serve
```

### Common Commands

```bash
# Clear cache (if you encounter build issues)
npm run clear

# Run TypeScript type checking
npm run typecheck

# Format code
npm run format
```

---

## CI/CD Pipeline

### How CI Builds Docusaurus

Our CI pipeline (GitHub Actions) runs the following steps:

1. **Install Dependencies**
   ```bash
   npm ci --prefix volcano-docs-docusaurus
   ```

2. **Build Site**
   ```bash
   npm run build --prefix volcano-docs-docusaurus
   ```

3. **Run Tests** (if applicable)
   ```bash
   npm test --prefix volcano-docs-docusaurus
   ```

4. **Deploy Preview**
   - Netlify automatically detects the updated `netlify.toml`
   - Builds from `volcano-docs-docusaurus/` directory
   - Publishes to a preview URL for PR reviews

### Netlify Configuration

The **netlify.toml** at the repo root has been updated:

```toml
[build]
  base = "volcano-docs-docusaurus"
  command = "npm ci && npm run build"
  publish = "build"
```

**What this means:**
- ✅ Netlify deploy previews now show the **Docusaurus site**, not Hugo
- ✅ PR reviewers can preview the new site before merging
- ✅ Hugo is no longer built in CI/Netlify (but remains in repo for now)

---

## Migration Roadmap

### Phase 1: Parallel Implementation ✅ (Current)

- [x] Set up Docusaurus project in subdirectory
- [x] Migrate core documentation structure
- [x] Implement custom theme and styling
- [x] Set up Netlify preview for Docusaurus
- [x] Create migration documentation

### Phase 2: Content Migration 🚧 (In Progress)

- [ ] Migrate all documentation from Hugo Markdown to MDX
- [ ] Convert Hugo shortcodes to React components
- [ ] Migrate static assets and images
- [ ] Set up documentation versioning
- [ ] Implement search integration (Algolia DocSearch)
- [ ] Add i18n support for existing languages

### Phase 3: Review & Validation

- [ ] CNCF maintainer review and approval
- [ ] Community testing and feedback
- [ ] Performance benchmarking (Lighthouse scores)
- [ ] Accessibility audit
- [ ] SEO validation

### Phase 4: Cutover

- [ ] Move Docusaurus content to repo root
- [ ] Update production Netlify deployment
- [ ] Archive Hugo implementation in a branch
- [ ] Remove Hugo files from main branch
- [ ] Update README and contributor docs
- [ ] Announce migration completion

---

## Open Questions for Maintainers

### 1. **Domain & Subdomain Strategy**

- Should we use a subdomain (e.g., `docs-next.volcano.sh`) during preview?
- Or continue using Netlify preview URLs for now?

### 2. **Content Migration Responsibility**

- Who owns migrating specific documentation sections?
- Should we migrate incrementally or all at once?

### 3. **Hugo Archival Plan**

- Keep Hugo in a `hugo-archive` branch or completely remove?
- Preserve Hugo build artifacts for historical reference?

### 4. **Versioning Strategy**

- Do we want to maintain docs for multiple Volcano versions?
- If yes, which versions should we document?

### 5. **Search Integration**

- Apply for CNCF Algolia DocSearch program?
- Or use Docusaurus's built-in search (less powerful)?

### 6. **CI/CD Ownership**

- Should Docusaurus build be integrated into the main Volcano CI?
- Or keep it separate for now?

---

## Frequently Asked Questions

### Why not a simple Hugo theme update?

Hugo's architecture makes it challenging to implement modern interactive features (e.g., live code editors, dynamic diagrams). Docusaurus's React-based approach is more suitable for our documentation goals.

### Will this break existing documentation links?

No. We're maintaining the same URL structure where possible. Redirects will be configured for any necessary changes.

### How can I contribute to the migration?

Contributions welcome! Check the [GitHub Issues](https://github.com/volcano-sh/volcano-website/issues) tagged with `migration`.

### What if we need to rollback?

Hugo remains in the repository and functional. We can revert the Netlify config if needed.

---

## Resources

- **Docusaurus Documentation**: https://docusaurus.io
- **CNCF Docusaurus Projects**: https://github.com/cncf/techdocs
- **Volcano GitHub**: https://github.com/volcano-sh
- **Migration Tracking Issue**: [Link to GitHub Issue]

---

## Contacts

For questions about this migration:

- **Primary Contact**: [Maintainer Name/Email]
- **GitHub Discussions**: https://github.com/volcano-sh/volcano-website/discussions
- **Slack**: #volcano-website in CNCF Slack

---

**Last Updated**: 2026-02-08  
**Document Owner**: Volcano Documentation Team
