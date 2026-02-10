# DCO Fix Instructions

## Problem

The following commits are missing DCO (Developer Certificate of Origin) signatures:

- `51433c5` - feat: enable Docusaurus docs versioning and snapshot v1.12
- `3de0964` - feat: add Hugo shortcode framework and CI for Docusaurus migration
- `0c1bee9` - docs: add Hugo to Docusaurus migration audit
- `52e279f` - feat: migrate v1.12 scheduler plugins and actions into separate Docusaurus pages
- `08767fe` - chore: bootstrap Docusaurus site for Volcano migration POC

These commits need to have `Signed-off-by: Aaradhy Chinche <aaradhychinche@gmail.com>` added.

## Solution: Interactive Rebase

### Step 1: Start Interactive Rebase

```bash
cd /Users/aaradhychinche/Documents/volcano/volcano-website

# Rebase from the commit before the first unsigned commit
git rebase -i 08767fe~1
```

### Step 2: Mark Commits for Editing

In the editor that opens, change `pick` to `edit` for all 5 unsigned commits:

```
edit 08767fe chore: bootstrap Docusaurus site for Volcano migration POC
edit 52e279f feat: migrate v1.12 scheduler plugins and actions into separate Docusaurus pages
edit 0c1bee9 docs: add Hugo to Docusaurus migration audit
edit 3de0964 feat: add Hugo shortcode framework and CI for Docusaurus migration
edit 51433c5 feat: enable Docusaurus docs versioning and snapshot v1.12
pick b20dd05 feat: Volcano homepage redesign and navigation improvements for Docusaurus migration
pick 72b4158 feat: enhance Volcano homepage UX with animations, typography, and performance optimizations
pick c5bc2f7 docs: add Docusaurus migration guide and Netlify preview pipeline
```

Save and close the editor.

### Step 3: Amend Each Commit

For each commit, Git will pause. Run:

```bash
# Amend the commit to add DCO
git commit --amend --signoff --no-edit

# Continue to the next commit
git rebase --continue
```

Repeat this for all 5 commits.

### Step 4: Force Push

After all commits are signed:

```bash
git push --force-with-lease origin feat/docusaurus-migration-poc
```

## Alternative: Automated Fix

If you want to automate this, you can use:

```bash
# This will sign off all commits in the current branch that aren't in origin/master
git filter-branch -f --msg-filter 'cat && echo && echo "Signed-off-by: Aaradhy Chinche <aaradhychinche@gmail.com>"' origin/master..HEAD

# Force push
git push --force-with-lease origin feat/docusaurus-migration-poc
```

**WARNING**: `filter-branch` is deprecated. Use `git-filter-repo` if available, or stick with interactive rebase.

## Verification

After fixing, verify all commits have DCO:

```bash
git log --format="%H %s" origin/master..HEAD | while read hash msg; do
  echo "Checking $hash..."
  git log -1 --format="%B" $hash | grep -q "Signed-off-by" || echo "  ❌ NO DCO: $msg"
done
```

If no output, all commits have DCO! ✅

## Why DCO?

The CNCF requires all contributions to be signed off under the Developer Certificate of Origin (DCO). This certifies that you have the right to submit the code under the project's license.

Always use `git commit -s` or `git commit --signoff` to automatically add the DCO signature.
