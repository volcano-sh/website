# Documentation Structure and Improvement Plan

## 1. Purpose

This document outlines the current state of Volcano's documentation structure and proposes incremental improvements to enhance maintainability, discoverability, and contributor experience. The goal is to improve documentation organization without requiring tool migration or major infrastructure changes.

### Why Documentation Clarity Matters

Clear, well-organized documentation is essential for:

- **User Adoption**: Users need to quickly find installation guides, tutorials, and feature documentation to successfully deploy and use Volcano.
- **Operator Efficiency**: Cluster operators require clear operational guides, configuration references, and troubleshooting information.
- **Developer Contribution**: Contributors need accessible architecture documentation, contribution guidelines, and development workflows to effectively contribute to the project.
- **Project Sustainability**: As Volcano grows, maintaining documentation becomes increasingly complex. A clear structure reduces maintenance burden and prevents documentation drift.

This document focuses on organizational improvements that can be implemented incrementally within the current Hugo-based documentation system.

## 2. Scope and Non-Goals

This document is intended for discussion and planning purposes. It does not:

- **Change existing documentation content**: No modifications to current documentation pages are proposed in this document.
- **Modify tooling**: No changes to Hugo, the build system, or deployment infrastructure are suggested.
- **Propose immediate migration**: No migration to different documentation frameworks is recommended at this time.
- **Mandate specific implementations**: All proposals are suggestions for community discussion and incremental improvement.

The purpose of this document is to establish shared understanding of the current state, identify improvement opportunities, and provide a reference for future documentation enhancements that can be implemented incrementally and with low risk.

## 3. Current Documentation Layout

### Content Organization

Volcano's documentation is hosted at https://volcano.sh and built using [Hugo](https://gohugo.io/) with the Academic theme. The documentation structure is organized as follows:

#### Primary Documentation Directories

- **`website/content/en/docs/`**: English documentation (latest/current version)
- **`website/content/zh/docs/`**: Chinese documentation (latest/current version)
- **`website/doc/`**: Additional concept documentation (separate from main docs)

#### Versioned Documentation

The project maintains versioned documentation for multiple releases:
- `v1-7-0/`
- `v1-8-2/`
- `v1-9-0/`
- `v1-10-0/`
- `v1-11-0/`
- `v1-12-0/`

Each versioned directory contains a subset of documentation files that were current at that release.

#### Menu Structure

Documentation navigation is defined in `website/config/_default/menus.toml` with the following top-level categories:

1. **Home**: Overview and introduction
2. **Getting Started**: Installation and tutorials
3. **Concepts**: Core concepts (PodGroup, Queue, VCJob, etc.)
4. **Key Features**: Feature-specific documentation
5. **Ecosystem**: Integration guides (Spark, TensorFlow, Flink, etc.)
6. **Scheduler**: Scheduler-specific documentation
7. **CLI**: Command-line interface documentation
8. **Contribution**: Contributor guidelines and community information

Each version has its own menu section in `menus.toml`, duplicating the structure for versioned documentation.

#### How Users Find Documentation

- Documentation is accessible via direct URLs (e.g., `volcano.sh/en/docs/installation`)
- Versioned documentation is available at paths like `volcano.sh/en/docs/v1-12-0/installation`
- The main navigation menu does not currently link to documentation (commented out in `menus.toml`)
- Users typically discover documentation through:
  - Search engines
  - Direct links from GitHub README
  - Community references
  - Blog posts and tutorials

### Observed Complexity

1. **Dual Documentation Locations**: Some concept documentation exists in both `website/content/en/docs/` and `website/doc/`, creating potential confusion about the canonical location.

2. **Versioned Documentation Maintenance**: Each release requires:
   - Creating a new version directory
   - Copying relevant documentation files
   - Updating menu configuration for that version
   - Maintaining consistency across versions

3. **Menu Duplication**: The menu structure is duplicated for each version in `menus.toml`, requiring updates in multiple places when navigation changes.

4. **Inconsistent File Naming**: Some files have naming inconsistencies (e.g., `schduler_introduction.md` contains a typo).

5. **Flat Structure**: Many documentation files exist at the root of `docs/` without clear subcategorization by audience or purpose.

## 4. Observed Pain Points

### Navigation Discoverability Issues

- **No Main Navigation Link**: Documentation is not linked from the primary site navigation, making it less discoverable for new users.
- **Unclear Version Selection**: Users may not know which version of documentation to use, and there's no clear guidance on version selection.
- **Deep Linking Challenges**: Some documentation categories (e.g., "Key Features") contain many pages, making it difficult to find specific information without using search.

### Difficulty Extending or Restructuring Docs

- **Menu Configuration Complexity**: Adding new documentation pages requires understanding Hugo's menu system and updating `menus.toml` appropriately.
- **Version Maintenance Overhead**: When adding new documentation, maintainers must decide whether to backport to versioned directories, creating maintenance burden.
- **Unclear Categorization**: The distinction between "Concepts", "Key Features", and "Scheduler" categories is not always clear, making it difficult to know where new documentation should be placed.

### Contributor Onboarding Friction

- **Unclear Contribution Process**: While `contribution.md` exists, the process for contributing documentation improvements could be more explicit.
- **Template Inconsistency**: Documentation files have varying front matter structures, making it unclear what's required for new pages.
- **No Documentation Style Guide**: Contributors lack clear guidance on writing style, formatting conventions, and documentation structure.

### Maintenance Challenges

- **Version Synchronization**: Keeping versioned documentation in sync with the latest version requires manual effort and is error-prone.
- **Outdated Content Risk**: With multiple version directories, there's a risk of outdated information persisting in older versions without clear deprecation notices.
- **Menu Configuration Drift**: Menu structure duplication increases the likelihood of inconsistencies between versions.
- **Bilingual Maintenance**: Maintaining parallel English and Chinese documentation requires coordination to ensure both stay current.

## 5. Proposed Incremental Improvements

The following improvements can be implemented without changing the site generator or requiring major infrastructure changes:

### 5.1 Clearer Separation of User vs Operator vs Developer Docs

**Current State**: Documentation is organized by topic (Concepts, Features, Ecosystem) rather than by audience.

**Proposed Improvement**: Add audience-based organization within existing categories:

- **User Documentation**: Focus on end-user workflows
  - Installation guides
  - Quick start tutorials
  - Framework integration guides (Spark, TensorFlow, etc.)
  - Common use cases

- **Operator Documentation**: Focus on cluster administration
  - Advanced configuration
  - Queue management
  - Resource management
  - Troubleshooting guides
  - Performance tuning

- **Developer Documentation**: Focus on contribution and extension
  - Architecture documentation
  - Plugin development
  - Scheduler internals
  - Contribution guidelines
  - API references

**Implementation**: Add a metadata field to each documentation page indicating its primary audience, and create index pages that filter by audience. This can be done using Hugo's taxonomy or custom front matter fields.

### 5.2 Consistent Naming and Grouping

**Current State**: File names are inconsistent, and some contain typos.

**Proposed Improvements**:

1. **Correct Minor Naming Inconsistencies**: Address naming inconsistencies where identified (e.g., `schduler_introduction.md` could be corrected to `scheduler_introduction.md` with appropriate redirects if needed).

2. **Establish Naming Conventions**:
   - Use lowercase with underscores: `feature_name.md`
   - Framework integrations: `{framework}_on_volcano.md` (already consistent)
   - Concepts: `{concept_name}.md` (e.g., `podgroup.md`, `queue.md`)
   - Features: `{feature_name}.md` (e.g., `gpu_virtualization.md`)

3. **Group Related Documentation**: Create subdirectories for logical groupings:
   - `concepts/` - Core concepts
   - `integrations/` - Framework integrations
   - `features/` - Feature documentation
   - `operations/` - Operational guides

**Implementation**: Create a migration plan to rename files incrementally, update all references, and document naming conventions in a `CONTRIBUTING.md` file in the docs directory.

### 5.3 Ideas to Make Documentation Easier to Maintain

**Documentation Templates**: Create standardized front matter templates for different documentation types (concepts, features, integrations, tutorials) to ensure consistency.

**Version Management Strategy**: 
- Document a clear policy for which versions to maintain
- Create a deprecation notice template for older versions
- Establish a process for archiving very old versions

**Menu Configuration Simplification**:
- Consider using Hugo's menu configuration features to reduce duplication
- Document the menu structure clearly for contributors
- Create helper scripts or documentation for adding new pages

**Consolidate Documentation Locations**:
- Evaluate the purpose of `website/doc/` directory
- Migrate or link content to avoid duplication
- Document the canonical location for different types of content

**Documentation Maintenance Guide**:
- Create a `MAINTAINING.md` guide for documentation maintainers
- Document the versioning strategy
- Provide examples of common documentation tasks

### 5.4 Improvements Without Changing Site Generator

**Enhanced Navigation**:
- Add a "Documentation" link to the main navigation menu
- Create a documentation landing page with clear sections for different audiences
- Add breadcrumb navigation for better context
- Implement a "version selector" widget on documentation pages

**Search and Discovery**:
- Ensure Hugo's built-in search is properly configured
- Add a "Related Documentation" section to pages
- Create topic-based index pages (e.g., "All GPU-related documentation")

**Content Organization**:
- Add "Last Updated" dates prominently (already present, ensure consistency)
- Add "Applicable Versions" metadata to pages
- Create "What's New" or "Recent Changes" documentation section

**Contributor Experience**:
- Create a `docs/CONTRIBUTING.md` with documentation contribution guidelines
- Add examples of well-structured documentation pages
- Document the review process for documentation PRs

## 6. Future Considerations

While the current Hugo-based documentation system serves the project well, modern documentation frameworks such as **Docusaurus** could provide additional benefits in the future, including built-in versioning, enhanced search capabilities, and improved internationalization features.

**Note**: This section is forward-looking only. No migration is proposed at this time, and any future consideration of alternative frameworks would require separate discussion and planning. The current improvements focus exclusively on optimizing the existing Hugo-based system.

## 7. Conclusion

This document is intended to be introduced early in the documentation improvement process to establish shared understanding among maintainers and contributors. By documenting the current state and proposing incremental improvements upfront, the community can reference this plan as a guide for future work, reducing ambiguity and enabling low-risk, coordinated enhancements over time.

### Summary of Benefits

The proposed incremental improvements will:

1. **Improve Discoverability**: Better navigation and organization will help users, operators, and developers find the information they need more quickly.

2. **Reduce Maintenance Burden**: Consistent naming, clear organization, and documentation templates will make it easier for contributors to add and maintain documentation.

3. **Enhance Contributor Experience**: Clear guidelines and templates will lower the barrier to entry for documentation contributions.

4. **Support Project Growth**: As Volcano continues to evolve, a well-organized documentation structure will scale better and remain maintainable.

5. **Preserve Stability**: All proposed improvements work within the existing Hugo infrastructure, minimizing risk and allowing incremental adoption.

### Emphasis on Contributor-Friendliness and Maintainability

The improvements outlined in this document prioritize:

- **Low-Risk Changes**: All proposals can be implemented incrementally without disrupting existing documentation.
- **Clear Guidelines**: Establishing conventions and templates reduces ambiguity for contributors.
- **Maintainability**: Better organization and consistent naming will make documentation easier to maintain as the project grows.
- **Incremental Adoption**: Improvements can be implemented piece by piece, allowing the community to adapt gradually.

### Next Steps

1. Review and discuss this document with the Volcano maintainer community.
2. Prioritize improvements based on community needs and available resources.
3. Create implementation issues for high-priority improvements.
4. Begin incremental implementation, starting with low-risk, high-value changes (e.g., fixing typos, adding navigation links).
5. Document progress and gather feedback from users and contributors.

This document serves as a living reference that can be updated as improvements are implemented and new needs are identified.

