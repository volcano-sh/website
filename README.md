[![Netlify Status](https://api.netlify.com/api/v1/badges/8cf65901-dae4-4826-b32b-17feeebddc86/deploy-status)](https://app.netlify.com/sites/kind-montalcini-bed86a/deploys)


# Creating and updating the docs

Welcome to the GitHub repository for Volcano's public website. The docs are
hosted at https://volcano.sh.

We use [Hugo](https://gohugo.io/) to format and generate our website, and
[Netlify](https://www.netlify.com/) to manage the deployment of the site. Hugo
is an open-source static site generator that provides us with templates, content
organisation in a standard directory structure, and a website generation engine.
You write the pages in Markdown, and Hugo wraps them up into a website.

* Please see [How to contribute](https://github.com/volcano-sh/volcano/blob/master/contribute.md) for instructions on how to contribute, if you are not familiar with the
  GitHub workflow

## Project Structure

- `content/`: Contains the markdown content for the website.
- `layouts/`: Contains HTML templates for the site structure.
- `static/`: Contains static assets like images, CSS, and JavaScript.
- `themes/`: Contains the site themes (e.g., `docsy`).
- `i18n/`: Contains internationalization files.

## Local Development

If you'd like to preview your doc updates as you work, you can install Hugo
and run a local server. This section shows you how.

### Install Hugo

See the [Hugo installation guide][hugo-install]. You generally need the **extended** version of Hugo.

#### Mac OS X

```bash
brew install hugo
```

#### Windows

You can use [Chocolatey](https://chocolatey.org/):

```powershell
choco install hugo-extended
```

Or [Scoop](https://scoop.sh/):

```powershell
scoop install hugo-extended
```

#### Linux (Debian/Ubuntu)

1. Download the latest extended .deb package from the [Hugo releases page](https://github.com/gohugoio/hugo/releases).
2. Install using `dpkg`:

    ```bash
    sudo dpkg -i hugo_extend_x.y.z_Linux-64bit.deb
    ```

3. Verify your installation:

    ```bash
    hugo version
    ```

### Run a local website server

Follow the usual GitHub workflow to fork the repo on GitHub and clone it to your
local machine, then use your local repo as input to your Hugo web server.

1. Ensure you are in the project root directory:

    ```bash
    git branch
    ```

2. Start your website server:

    ```bash
    hugo server -D
    ```

3. Your website is at [http://localhost:1313/](http://localhost:1313/).

4. Continue with the usual GitHub workflow to edit files, commit them, push the
  changes up to your fork, and create a pull request. (See the GitHub workflow)

5. While making the changes, you can preview them on your local version of the
  website at [http://localhost:1313/](http://localhost:1313/). Note that if you
  have more than one local git branch, when you switch between git branches the
  local website reflects the files in the current branch.

## Quickstart Contribution Guide

1. Fork the repo on GitHub.
2. Make your changes and send a pull request (PR).
3. If you're not yet ready for a review, add a comment to the PR saying it's a
  work in progress or add `[WIP]` in your PR's title. You can also add `/hold` in a comment to mark the PR as not
  ready for merge. (**Don't** add the Hugo declarative "draft = true" to the
  page front matter, because that will prevent the auto-deployment of the
  content preview described in the next point.)
4. Wait for the automated PR workflow to do some checks. When it's ready,
  you should see a comment like this: **deploy/netlify — Deploy preview ready!**
5. Click **Details** to the right of "Deploy preview ready" to see a preview
  of your updates.
6. Continue updating your doc until you're happy with it.
7. When you're ready for a review, add a comment to the PR and assign a
  reviewer/approver.

## Troubleshooting

### 'hugo' not found
Ensure Hugo is in your system PATH. If you installed via a package manager, this should be automatic.

### Images not loading
Make sure image paths in markdown do not start with `/website/` or other subdirectories unless they exist. Use absolute paths starting with `/` which resolve to the `static/` directory.

## Getting Help

If you need help or have questions, you can reach out to the community:

- **Slack**: Join the Volcano workspace [here](https://volcano-sh.slack.com/).
- **Mailing List**: Subscribe to the [Volcano mailing list](https://groups.google.com/g/volcano-sh).
- **GitHub Issues**: Open an issue in this repository.

Useful Hugo docs:
- [Hugo installation guide](https://gohugo.io/getting-started/installing/)
- [Hugo basic usage](https://gohugo.io/getting-started/usage/)
- [Hugo site directory structure](https://gohugo.io/getting-started/directory-structure/)
- [hugo server reference](https://gohugo.io/commands/hugo_server/)
- [hugo new reference](https://gohugo.io/commands/hugo_new/)

[hugo-install]: https://gohugo.io/getting-started/installing/