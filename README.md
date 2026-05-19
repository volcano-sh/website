# Volcano Website

Welcome to the GitHub repository for Volcano's public website. The docs are hosted at [https://volcano.sh](https://volcano.sh).

We use [Docusaurus](https://docusaurus.io/) to format and generate our website, and [Netlify](https://www.netlify.com/) to manage the deployment of the site. Docusaurus is an open-source static site generator that provides us with templates, content organisation in a standard directory structure, and a website generation engine. You write the pages in Markdown (with YAML front matter), and Docusaurus wraps them up into a website.

Please see [How to contribute](https://github.com/volcano-sh/volcano/blob/master/contribute.md) for instructions on how to contribute, if you are not familiar with the GitHub workflow.

## Prerequisites

You need the following installed locally:

- [Node.js](https://nodejs.org/) version 20 or higher
- [npm](https://www.npmjs.com/) (comes bundled with Node.js)

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

## Quickstart

Here's a quick guide to adding or updating docs and previewing your changes locally.

1. Fork the repo on GitHub and clone it to your local machine:

   ```bash
   git clone https://github.com/<your-username>/website.git
   cd website
   ```

2. Install dependencies (you only need to do this once, or when `package.json` changes):

   ```bash
   npm install
   ```

3. Start the local development server:

   ```bash
   npm run start
   ```

   The site is now live at **http://localhost:3000/** with hot-reload — any changes you save will be reflected immediately in the browser.

   To preview the Chinese locale:
   ```bash
   npm run start -- --locale zh-Hans
   ```

4. Make your changes:

   - To **add a new doc**, create a `.md` file in the appropriate category folder under `docs/` (see [How to add a new doc](#how-to-add-a-new-doc)).
   - To **update an existing doc**, edit the corresponding `.md` file under `docs/`.
   - To **add a blog post**, see [How to add a blog post](#how-to-add-a-blog-post).

5. Preview your changes to make sure everything looks correct.

6. Commit and push your changes. 

7. Open a pull request on GitHub. See [GitHub's documentation on creating pull requests](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request) for more details.


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

To add a Chinese translation:

1. Create the same file at the matching path under the i18n directory. For example:
   - English: `docs/Concepts/Queue.md`
   - Chinese: `i18n/zh-Hans/docusaurus-plugin-content-docs/current/Concepts/Queue.md`
2. Translate the content and update the `title` in the front matter.

## How to add a blog post

### English blog posts

1. Create a new `.md` file in the `blog/` directory.
2. Add YAML front matter at the top of the file:
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

### Chinese translations

To add a Chinese translation of a blog post:

1. Create the same `.md` file at the matching path under the `i18n` blog directory. For example:
   - English: `blog/2025-06-01-my-post.md`
   - Chinese: `i18n/zh-Hans/docusaurus-plugin-content-blog/2025-06-01-my-post.md`

2. Translate the content, update the `title` and `description` in the front matter, and keep the same `date` and `authors`.

## Versioning and archiving docs

Docs are versioned to match Volcano releases.

### How versioning works

- The `docs/` directory is the **current** (in-development) version of the documentation.
- When a new Volcano version is released, the current docs are frozen into a versioned snapshot stored in `versioned_docs/`.
- The list of all released versions is maintained in `versions.json`.
- Each frozen version has its own sidebar configuration in `versioned_sidebars/`.

### Archiving a version for a new release

When a new Volcano version ships (e.g., v1.13.0), follow **both** steps below to archive the English docs and the Chinese translations.

#### Step 1 — Archive English docs (automated)

Run the Docusaurus versioning command:

```bash
npx docusaurus docs:version v1.13.0
```

This command will:

1. Copy the entire `docs/` directory into `versioned_docs/version-v1.13.0/`.
2. Copy the current sidebar configuration into `versioned_sidebars/version-v1.13.0-sidebars.json`.
3. Add `v1.13.0` to the `versions.json` file.

> **Note:** This command **only** archives English documentation. Chinese translations must be archived manually.

#### Step 2 — Archive Chinese translations (manual)

The Docusaurus versioning command does not handle i18n files. You must manually copy the Chinese translations for the new version:

1. Copy the current Chinese docs to a new versioned directory:

   ```bash
   cp -r i18n/zh-Hans/docusaurus-plugin-content-docs/current i18n/zh-Hans/docusaurus-plugin-content-docs/version-v1.13.0
   ```

   On Windows (PowerShell):
   ```powershell
   Copy-Item -Recurse i18n/zh-Hans/docusaurus-plugin-content-docs/current i18n/zh-Hans/docusaurus-plugin-content-docs/version-v1.13.0
   ```

2. If a `current.json` file exists (for label translations), copy it for the new version:

   ```bash
   cp i18n/zh-Hans/docusaurus-plugin-content-docs/current.json i18n/zh-Hans/docusaurus-plugin-content-docs/version-v1.13.0.json
   ```

3. Verify the new version directory was created successfully:

   ```bash
   ls i18n/zh-Hans/docusaurus-plugin-content-docs/
   ```

   You should see `version-v1.13.0/` and `version-v1.13.0.json` alongside the existing versions.

#### Step 3 — Update configuration

After archiving both English and Chinese docs:

1. Update the version label in `docusaurus.config.js` to reflect the new current (next) version.
2. Run `npm run build` to verify that the new version builds correctly for both locales.

> **Note:** After archiving, the `docs/` folder and `i18n/.../current/` folder continue to be the working directories for the *next* release. All new documentation changes should go into those directories.

For more details on how Docusaurus versioning works, see the [official Docusaurus versioning documentation](https://docusaurus.io/docs/versioning).

## Useful Docusaurus docs

- [Docusaurus installation guide](https://docusaurus.io/docs/installation)
- [Docs — creating docs](https://docusaurus.io/docs/create-doc)
- [Docs — i18n tutorial](https://docusaurus.io/docs/i18n/tutorial)
- [Docs — versioning](https://docusaurus.io/docs/versioning)
- [Docs — blog](https://docusaurus.io/docs/blog)
