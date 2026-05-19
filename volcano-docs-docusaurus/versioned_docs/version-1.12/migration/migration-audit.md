# Migration Audit for Volcano Website

## Hugo Shortcodes Used
- `{{<figure library="1" src="..." title="..." >}}`: Used extensively for images across docs and blog posts. Appears in architecture.md, various versioned docs, and blog articles.

## Docs Directories and Versioned Folders
- Main docs: `content/en/docs/` and `content/zh/docs/`
- Versioned folders: v1-7-0, v1-8-2, v1-9-0, v1-10-0, v1-11-0, v1-12-0 under both en and zh docs.

## Docs Duplication Across Versions
Docs are duplicated in each versioned folder (e.g., `content/en/docs/v1-12-0/`) containing copies of files like architecture.md, plugins.md, etc., from the main docs directory. This creates redundancy for version-specific snapshots.

## Hugo Front Matter Fields for Navigation
- `type = "docs"`: Specifies content type.
- `linktitle = "..."`: Display name in menu.
- `[menu.docs]`: Menu section for docs, with `parent = "..."` (e.g., "home", "getting-started") and `weight = N` for ordering.
- Versioned docs use `[menu.v1-XX-X]` for their respective menus.

## Netlify Build Configuration
From `netlify.toml`:
- Publish directory: `public`
- Build command: `HUGO_BASEURL=$URL hugo`
- Hugo version: 0.57.2
- Environments: Production with `HUGO_ENV = "production"`, `HUGO_ENABLEGITINFO = "true"`
- Contexts for deploy-preview, branch-deploy, etc., with specific commands like `hugo --buildFuture -b $DEPLOY_PRIME_URL`

## Markdown Rendering Issues
No specific markdown rendering issues mentioned in the repository. Standard Markdown is used with Hugo extensions like shortcodes. BlackFriday is configured in `config/_default/config.toml` for Markdown rendering.
