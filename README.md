[![Netlify Status](https://api.netlify.com/api/v1/badges/8cf65901-dae4-4826-b32b-17feeebddc86/deploy-status)](https://app.netlify.com/sites/kind-montalcini-bed86a/deploys)

# Volcano Website Documentation Guide

Welcome to the GitHub repository for Volcano's public website. The documentation and website are hosted at [https://volcano.sh](https://volcano.sh).

We use **[Hugo](https://gohugo.io/)** — a fast and flexible static site generator — to format and generate the website. The site is deployed automatically via **[Netlify](https://www.netlify.com/)**.

-----

## Table of Contents
  * [About](#about)
  * [Getting Started](#getting-started)
      * [Prerequisites](#prerequisites)
      * [Installation](#installation)
  * [Local Development](#local-development)
  * [Contributing](#contributing)
  * [Deployment](#deployment)
  * [Resources](#resources)
-----

## About

Volcano uses **[Hugo](https://gohugo.io/)** to organize content in a standard directory structure and generate the website from Markdown pages. Hugo templates wrap the Markdown content into a fully functional website.

This repository holds the source files, and **[Netlify](https://www.netlify.com/)** automates the building and deployment process whenever changes are pushed or pull requests are made.

-----

## Getting Started

### Prerequisites

  * **Git** (for version control)
  * **Hugo** (version specified in `netlify.toml`)

### Installation

#### macOS

```bash
brew install hugo
```

#### Debian / Ubuntu Linux

1.  Download the correct Hugo version (check `HUGO_VERSION` in `netlify.toml`):
    `hugo_0.57.2_Linux-64bit.deb`
    [https://github.com/gohugoio/hugo/releases/download/v0.57.2/hugo\_0.57.2\_Linux-64bit.deb](https://github.com/gohugoio/hugo/releases/download/v0.57.2/hugo_0.57.2_Linux-64bit.deb)
2.  Install the package:
    ```bash
    sudo dpkg -i hugo_0.57.2_Linux-64bit.deb
    ```
3.  Verify installation:
    ```bash
    hugo version
    ```

#### Windows

  * Download the latest Hugo Windows binary from the [Hugo Releases page](https://github.com/gohugoio/hugo/releases).
  * Unzip and place `hugo.exe` in a directory included in your system **PATH**.
  * Verify installation in Command Prompt or PowerShell:
    ```bash
    hugo version
    ```

-----

## Local Development

Follow these steps to preview the website locally as you make changes:

1.  Fork this repository on GitHub and clone your fork:

    ```bash
    git clone https://github.com/your-username/website.git
    cd website
    ```

2.  Checkout the branch you want to work on:

    ```bash
    git checkout <branch-name>
    ```

3.  Start the Hugo local server from the `/website/` directory (where `config.toml` exists):

    ```bash
    hugo server -D
    ```

4.  Open your browser and visit:
    `http://localhost:1313/`

    The `-D` flag ensures Hugo builds draft content as well, useful for previewing in-progress pages.

5.  Make changes in your editor, and Hugo will automatically reload the site preview with your updates.

6.  Commit and push your changes to your fork:

    ```bash
    git add .
    git commit -m "commit message"
    git push origin <branch-name>
    ```

7.  Create a pull request (PR) to the main Volcano repo to propose your changes.

-----

## Contributing

Please refer to the [Volcano contributing guide](https://github.com/volcano-sh/volcano/blob/master/contribute.md).

### Pull Request Guidelines:

  * If your PR is a work in progress, mark the title with `[WIP]` or add `/hold` in the comments.
  * Do not set `draft = true` in your page front matter if you want Netlify preview deployments to work.
  * Wait for automated checks; once you see the comment "deploy/netlify — Deploy preview ready\!", click **Details** to preview your changes.
  * Assign reviewers when ready for review.

-----

## Deployment

The site is deployed automatically through **Netlify** when changes are pushed to the repository or pull requests are created.

The status of the latest deployment is visible at the top of this README.

-----

## Resources

  * [Hugo Installation Guide](https://gohugo.io/getting-started/installing/)
  * [Hugo Basic Usage](https://gohugo.io/getting-started/usage/)
  * [Hugo Directory Structure](https://gohugo.io/getting-started/directory-structure/)
  * [Hugo Server Reference](https://gohugo.io/commands/hugo_server/)
  * [Hugo New Content Reference](https://gohugo.io/commands/hugo_new/)



