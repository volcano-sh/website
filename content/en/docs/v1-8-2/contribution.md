+++
title = "Contribution"


date = 2024-01-16
lastmod = 2024-01-16

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Volcano Contribution"
[menu.v1-8-2]
  parent = "contribution"
  weight = 1
+++

# Welcome

Welcome to Volcano!

-   [Before You Start](#before-you-start)
    -   [Code of Conduct](#code-of-conduct)
    -   [Community discussions](#community-discussions)
    -   [Community Expectations](#community-expectations)
-   [Getting Started](#getting-started)
-   [Your First Contribution](#your-first-contribution)
    -   [Find Something to Work On](#find-something-to-work-on)
        -   [Find a Good Topic](#find-a-good-topic)
        -   [Work on an Issue](#work-on-an-issue)
        -   [File an Issue](#file-an-issue)
-   [Contribution Workflow](#contribution-workflow)
    -   [Open a Pull Request](#open-a-pull-request)
-   [Code Review](#code-review)
-   [Commit Message Format](#commit-message-format)
    -   [Testing](#testing)

## Before You Start

### Code of Conduct

All Volcano contributors must read and observe the [Code of Conduct](https://github.com/volcano-sh/website/blob/master/CODE_OF_CONDUCT.md).

### Community discussions

To better communicate with the developers in the Volcano community, please subscribe to the Volcano channel in the following way.

- Sign up and visit `slack.cncf. IO/` to join the CNCF workspace.
- Participate in community discussions by adding the channel search `volcano`.

### Community Expectations

Volcano is an open-source project driven by the Volcano community, which strives to promote a healthy, friendly, and productive environment.
The community is committed to developing a system that helps running high-performance workloads, such as AI, ML, and deep learning applications, on Kubernetes. Building such a system would be impossible without the support of community contributors with similar aspirations.

- For details about the community roles, see [Community Membership](https://github.com/volcano-sh/website/blob/master/content/en/docs/membership.md). If you make significant contributions, you will have a more advanced role in the community.


## Getting Started

- For more information on building and deployment, see [setup](https://github.com/volcano-sh/website/blob/master/content/en/docs/installation.md).


## Your First Contribution

You can contribute in different areas, including filing issues, developing features, fixing critical bugs, and getting your work reviewed and merged.

If you have any question about the development process, visit the [Slack Channel](https://cloud-native.slack.com/archives/C011GJDQS0N) ([sign up](https://join.slack.com/t/volcano-sh/shared_invite/enQtNTU5NTU3NDU0MTc4LTgzZTQ2MzViNTFmNDg1ZGUyMzcwNjgxZGQ1ZDdhOGE3Mzg1Y2NkZjk1MDJlZTZhZWU5MDg2MWJhMzI3Mjg3ZTk)) 
or join our [mailing list](https://groups.google.com/forum/#!forum/volcano-sh).

#### Find Something to Work On

You are welcome to open an issue concerning documentation, report bugs, and push changes to the repositories.
Feel free to optimize code that does not follow the best coding practices, perform code refactoring, or compile test cases.
The following steps will help you get started.

#### Find a Good Topic

There are [multiple repositories](https://github.com/volcano-sh/) within the Volcano organization with each repository containing a beginner-friendly issue that does not require deep understanding of the Volcano project.
For example, in [Volcano-Issues](https://github.com/volcano-sh/volcano), you can choose issues labeled with [help wanted](https://github.com/volcano-sh/volcano/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22) or [good first issue](https://github.com/volcano-sh/volcano/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22).
New contributors are welcome to work on these issues.

Another good way to start is to find a document that needs improvement, for example, a document that is missing a link or contains a broken link. For details on the workflow, see [Contribution Workflow](#contributor-workflow).

#### Work on an Issue

When you are ready to work on an issue, reply with `/assign` or `/assign @yourself` on an issue.
The bot then will assign the issue to you. Your name will then be displayed on the `Assignees` list.

#### File an Issue

You are welcome to file issues to Volcano sub-repositories.

*Example:* You can file an issue for [Volcano](https://github.com/volcano-sh/volcano/issues).

Follow the submission guidelines when you open an issue.

## Contribution Workflow

All contributors are welcome to open issues and create pull requests.

The contribution workflow is as follows:

- Create a topic branch from the existing branch (usually the master branch).
- Edit and commit the code.
- Make sure [commit message format](#commit-message-format) is followed.
- Push changes in the topic branch to your remote personal fork of the repository.
- Submit a pull request (PR) to [Volcano](https://github.com/volcano-sh/volcano). The PR must receive approval from at least two community maintainers before it can be merged.

### Open a Pull Request

Volcano follows the standard [GitHub pull request](https://help.github.com/articles/about-pull-requests/) process.

Volcano bot will apply structured labels to your PRs.

It also provides suggestions on commands in your PRs to facilitate review.
These `/command` options can be annotated to trigger auto-labeling and notifications. For more information, see [command reference documentation](https://go.k8s.io/bot-commands).

### Code Review

To make it easier for your PRs to receive reviews,

* Follow [good coding guidelines](https://github.com/golang/go/wiki/CodeReviewComments).
* Write [good commit messages](https://chris.beams.io/posts/git-commit/).
* Break down large chunks of modification into smaller unites that are logically independent and easy to understand.
* Label your PRs properly so that they can be sent to appropriate reviewers. The bot will help you through the entire PR submission process.



### Commit Message Format

In the subject line mention the changes you have made, and in the message body provide the reasons for making these changes.

```shell
scripts: add test code for metamanager

Unit test code is added to improve code coverage for metamanager.

Fixes #12
```

A more formal format is as follows:

```shell
<subsystem>: <what changed>
<BLANK LINE>
<why this change was made>
<BLANK LINE>
<footer>
```

The first line is the subject, which can contain up to 70 characters. The second line is normally a blank line. The third line can contain up to 80 characters and mentions why the change was made. Ensure that the other lines do not contain more than 80 characters so that the message can be easily read on GitHub as well as using various Git tools.

Note: If your pull request does not receive enough attention, you can reach out to the reviewers on Slack.

### Testing

After a PR is opened, the Volcano bot automatically performs multiple types of testing on it. The location of the test code and the environment requirements vary depending on the type of test.

* Unit testing: used to check whether a specific function works properly. Unit test source code is in the same package as its corresponding source code. You can easily run it at local.
* Integration testing: used to check the interactions between package components or between Volcano components and Kubernetes control plane components like API server. 
* End-to-end ("E2E") testing: used to test system consistency. [Volcano E2E test](https://github.com/volcano-sh/volcano/tree/master/test/e2e).

Each PR has to pass all the test cases before it can be reviewed.
