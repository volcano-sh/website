# Contributing to the Volcano Website

Thank you for your interest in contributing to the Volcano website! This guide will help you get started with contributing documentation, blog posts, and site improvements.

## Code of Conduct

All contributors are expected to follow the [CNCF Code of Conduct](https://github.com/cncf/foundation/blob/main/code-of-conduct.md).

## Getting Started

### 1. Prerequisite: Install Hugo

This website is built with [Hugo](https://gohugo.io/). You must install the **Extended** version of Hugo to build the site locally.

- **Check Version**: Refer to `HUGO_VERSION` in [netlify.toml](./netlify.toml) for the recommended version (currently `0.57.2`).
- **Installation**: See the [Hugo Installation Guide](https://gohugo.io/getting-started/installing/).

### 2. Fork and Clone

1. Fork this repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/website.git
   cd website
   ```

### 3. Local Development

To run a local server and preview your changes:
```bash
hugo server -D
```
The site will be available at `http://localhost:1313/`.

## PR Workflow

1. **Create a branch**: `git checkout -b your-feature-branch`
2. **Make changes**: Keep your changes focused and concise.
3. **Commit**: Use descriptive commit messages.
4. **Push & PR**: Push your branch to your fork and open a Pull Request against the `master` branch.
5. **Netlify Preview**: Each PR will generate a unique preview URL. Check the "Checks" section of your PR for the "deploy/netlify" link.

## Documentation Standards

- Use standard Markdown (`.md`).
- Ensure all links use `https://` where possible.
- For large images, optimize for web to keep load times fast.

For more details on the general Volcano contribution process, see the [main Volcano contribution guide](https://github.com/volcano-sh/volcano/blob/master/contribute.md).
