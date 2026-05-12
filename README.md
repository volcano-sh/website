# Volcano Website

## Creating and updating the docs

Welcome to the GitHub repository for Volcano's public website. The docs are hosted at [https://volcano.sh](https://volcano.sh).

We use [Docusaurus](https://docusaurus.io/) to format and generate our website, and [Netlify](https://www.netlify.com/) to manage the deployment of the site. Docusaurus is an open-source static site generator that provides us with templates, content organisation in a standard directory structure, and a website generation engine. You write the pages in Markdown (with YAML front matter), and Docusaurus wraps them up into a website.

Please see [How to contribute](https://github.com/volcano-sh/website/blob/master/CODE_OF_CONDUCT.md) for instructions on how to contribute, if you are not familiar with the GitHub workflow.

## Quickstart

Here's a quick guide to updating the docs. It assumes you're familiar with the GitHub workflow and you're happy to use the automated preview of your doc updates:

1. Fork the repo on GitHub.
2. Make your changes and send a pull request (PR).
3. If you're not yet ready for a review, add a comment to the PR saying it's a work in progress or add `[WIP]` in your PR's title. You can also add `/hold` in a comment to mark the PR as not ready for merge.
4. Wait for the automated PR workflow to do some checks. When it's ready, you should see a comment like this: **deploy/netlify — Deploy preview ready!**
5. Click **Details** to the right of "Deploy preview ready" to see a preview of your updates.
6. Continue updating your doc until you're happy with it.
7. When you're ready for a review, add a comment to the PR and assign a reviewer/approver.

## Previewing your changes on a local website server

If you'd like to preview your doc updates as you work, you can install Node.js and run a local Docusaurus dev server. This section shows you how.

### Install Node.js

You need **Node.js version 20 or higher**. See the [Node.js download page](https://nodejs.org/en/download/) for installation instructions. Here are some examples:

**Mac OS X:**
```bash
brew install node
```

**Debian / Ubuntu:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows:**

Download the installer from [https://nodejs.org](https://nodejs.org) and run it.

Verify your installation:
```bash
node --version
npm --version
```

### Run a local website server

Follow the usual GitHub workflow to fork the repo on GitHub and clone it to your local machine, then use your local repo as input to the Docusaurus dev server:

Install the dependencies (you only need to do this once, or when `package.json` changes):
```bash
npm install
```

Start the website server. Make sure you run this command from the repo root directory:
```bash
npm run start
```
Your website is at **http://localhost:3000/**.

To preview the Chinese locale:
```bash
npm run start -- --locale zh-Hans
```

Continue with the usual GitHub workflow to edit files, commit them, push the changes up to your fork, and create a pull request. See [GitHub's documentation on creating pull requests](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request) for more details.

While making the changes, you can preview them on your local version of the website at http://localhost:3000/. Note that if you have more than one local git branch, when you switch between git branches the local website reflects the files in the current branch.

### Production build

To generate a full production build (useful for catching broken links or build errors):
```bash
npm run build
```

You can serve the production build locally with:
```bash
npm run serve
```

## Project structure

Here's how the repository is organised:

```
website/
├── docs/                       # English documentation (default locale, source of truth)
│   ├── Home/                   # Introduction & overview
│   ├── GettingStarted/         # Installation & tutorials
│   ├── Concepts/               # Queue, Job, PodGroup, etc.
│   ├── KeyFeatures/            # GPU virtualisation, colocation, etc.
│   ├── Scheduler/              # Scheduler plugins & actions
│   ├── UserGuide/              # How-to guides
│   ├── CLI/                    # CLI reference
│   ├── Ecosystem/              # Spark, TensorFlow, Flink integrations
│   └── Contribution/           # Contribution guidelines
│
├── blog/                       # Blog posts (Markdown files + authors.yml)
├── versioned_docs/             # Frozen doc snapshots for past releases
├── versioned_sidebars/         # Sidebar snapshots for past releases
│
├── i18n/zh-Hans/               # Chinese (Simplified) translations
│   ├── docusaurus-plugin-content-docs/
│   │   ├── current/            # Translations for the current (latest) docs
│   │   └── version-v1.12.0/    # Translations for v1.12.0, etc.
│   └── docusaurus-plugin-content-blog/
│
│
├── src/                        # Custom React components, pages, CSS
├── static/img/                 # Images and static assets
├── plugins/                    # Custom Docusaurus plugins
│
├── docusaurus.config.js        # Main Docusaurus configuration
├── sidebar.js                  # Sidebar configuration (auto-generated from dirs)
├── versions.json               # List of released doc versions
├── package.json                # Dependencies and npm scripts
└── netlify.toml                # Netlify deployment configuration
```

## How to add a new doc

### English docs

1. Pick the category folder your doc belongs to under `docs/` (e.g., `docs/UserGuide/`, `docs/Concepts/`).
2. Create a new `.md` file in that folder.
3. Add YAML front matter at the top of the file:
   ```yaml
   ---
   title: "Your Page Title"
   sidebar_position: 3
   ---
   ```
4. Write your content in Markdown below the front matter.
5. The sidebar is auto-generated from the directory structure, so your new doc will show up automatically.

Each category folder contains a `_category_.json` file that controls the category label and its position in the sidebar:
```json
{
  "label": "Key Features",
  "position": 4
}
```

### Chinese translations

Docusaurus uses a specific directory convention for translations. English docs go in `docs/`, and Chinese translations go under `i18n/zh-Hans/docusaurus-plugin-content-docs/current/`. 

To add a Chinese translation:

1. Create the same file at the matching path under the i18n directory. For example:
   - English: `docs/Concepts/Queue.md`
   - Chinese: `i18n/zh-Hans/docusaurus-plugin-content-docs/current/Concepts/Queue.md`
2. Translate the content and update the `title` in the front matter.

## How to add a blog post

1. Create a new `.md` file in the `blog/` directory.
2. Add front matter:
   ```yaml
   ---
   title: "Your Blog Post Title"
   description: "Brief summary of the post"
   authors: ["volcano"]
   date: 2025-06-01
   tags: ["release"]
   ---
   ```
   The `authors` field must match a key defined in `blog/authors.yml`.
3. Use `<!-- truncate -->` to mark where the preview snippet ends on the blog listing page.

## Versioning

Docs are versioned to match Volcano releases. The `docs/` folder always contains the latest (current) version. Past versions are frozen snapshots stored in `versioned_docs/`.

The list of versions is in `versions.json`. To create a new version when a release ships:

```bash
npx docusaurus docs:version v1.14.0
```

This copies `docs/` into `versioned_docs/version-v1.14.0/` and updates `versions.json`. After that, update the version label in `docusaurus.config.js`.

## Useful Docusaurus docs

- [Docusaurus installation guide](https://docusaurus.io/docs/installation)
- [Docs — creating docs](https://docusaurus.io/docs/create-doc)
- [Docs — i18n tutorial](https://docusaurus.io/docs/i18n/tutorial)
- [Docs — versioning](https://docusaurus.io/docs/versioning)
- [Docs — blog](https://docusaurus.io/docs/blog)
