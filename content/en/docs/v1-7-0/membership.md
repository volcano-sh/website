+++
title = "Community Membership"


date = 2024-01-16
lastmod = 2024-01-16

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Community Membership"
[menu.v1-7-0]
  parent = "contribution"
  weight = 2
+++

# Volcano Community Membership

**Note:** We regularly update this document with the latest information and incorporate feedback from the Volcano community.

This document gives a brief overview of the Volcano community roles and the requirements and responsibilities associated with them.

| Role | Requirements | Responsibilities | Privileges |
| -----| ---------------- | ------------ | -------|
| [Member](#member) | Sponsored by 2 approvers, active in the community, has contributed to Volcano | Gets new contributors on board| Member of the Volcano GitHub organization |
| [Approver](#approver) | Sponsored by 2 maintainers, has extensive experience and knowledge of a particular domain, has actively contributed to code and review | Reviews and approves contributions from community members | Has write access to specific packages in relevant repositories |
| [Maintainer](#maintainer) | Sponsored by 2 owners, has shown good technical judgment in feature design/development and PR review | Release planning and feature development/maintenance | Has top-level write access to relevant repositories; name entry in the Maintainers file of the repositories |
| [Owner](#owner) | Sponsored by 3 owners, has proven ability to lead the entire Volcano project | Drives the overall technical roadmap of the project and sets priorities of activities in release planning | Has admin access to the Volcano GitHub organization |


**Note:** All Volcano community members must follow the Volcano [Code of Conduct](https://github.com/volcano-sh/website/blob/master/CODE_OF_CONDUCT.md).

## Member

Members are active participants in the community. They contribute by authoring PRs,
reviewing issues/PRs or participating in community discussions on slack/mailing list.


### Requirements

- Sponsored by 2 approvers
- Has enabled two-factor authentication for GitHub account
- Actively contributed to the community. Contributions include but are not limited to:
    - Authoring PRs
    - Reviewing issues/PRs authored by other community members
    - Participating in community discussions on slack/mailing list
    - Attending Volcano community meetings


### Responsibilities and privileges

- Becomes a member of the Volcano GitHub organization
- Can be assigned issues and PRs and can work on review requests from community members
- Assigns issues and PRs
- Gets new contributors on board
- Guides new contributors on maintaining docs/files
- Helps/Motivates new members in contributing to Volcano


## Approver

Approvers are active members who have extensive experience and knowledge of a particular domain.
They have actively participated in the issue/PR reviews and have identified noteworthy issues during the reviews.


### Requirements

- Sponsored by 2 maintainers
- Has been a member for at least 2 months
- Has reviewed a large number of PRs
- Has good codebase knowledge


### Responsibilities and privileges

- Reviews code to maintain/improve code quality
- Acknowledges and works on review requests from community members
- Approves code contributions for acceptance related to a particular domain
- Has write access to specific packages inside a repository, enforced via bot
- Continues to contribute and guide other community members to contribute to Volcano

## Maintainer

Maintainers are approvers who have shown good technical judgment in feature design/development.
They can grasp the big picture of the project and features in the project.

### Requirements

- Sponsored by 2 owners
- Has been an approver for at least 2 months
- Is nominated by a project owner
- Has good technical judgment in feature design/development

### Responsibilities and privileges

- Participates in release planning
- Maintains project code quality
- Ensures the forward/backword compatibility of APIs based on feature graduation criteria
- Analyzes and proposes new features/enhancements in the Volcano project
- Demonstrates sound technical judgment
- Mentors contributors and approvers
- Has top-level write access to relevant repositories (including the permission to click the Merge PR button when manual check-in is necessary)
- Name entry in the Maintainers file of the repositories
- Participates & drives design/development of multiple features

## Owner

Owners are maintainers who have helped lead the project.
They have deep understanding of Volcano and the related domains, and have facilitated major decision making in issues such as release planning.

### Requirements

- Sponsored by 3 owners
- Has been a maintainer for at least 2 months
- Is nominated by a project owner
- Is not opposed by any project owner
- Has helped lead the entire project

### Responsibilities and privileges

- Makes overall technical decisions of the project
- Makes the overall technical roadmap of the project
- Sets priorities for release planning
- Guides and mentors all other community members
- Ensures all community members follow the Code of Conduct
- Makes sure all PRs are properly reviewed and merged, despite the admin access to all repositories
- May obtain admin access to relevant repositories as required
- Participates & drives design/development of multiple features


**Note:** These roles are applicable only to the Volcano Github organization and repositories. We are currently developing a formal process for review and acceptance into these roles.


[two-factor authentication]: https://help.github.com/articles/about-two-factor-authentication
