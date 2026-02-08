# 🚨 Quick Fix Checklist - Netlify & CI

## Status Overview

✅ = Done | ⚠️ = Action Required | 🔄 = In Progress

---

## Infrastructure Fixes ✅ COMPLETE

- [x] Update `netlify.toml` Node version 18 → 20
- [x] Create `.nvmrc` with version 20
- [x] Verify `npm ci` works locally
- [x] Verify `npm run build` works locally
- [x] Create DCO fix documentation
- [x] Update validation documentation

---

## DCO Fix ⚠️ ACTION REQUIRED

You have 5 commits missing DCO signatures. **You must fix these before the PR can be approved.**

### Quick Fix Commands

```bash
# 1. Start interactive rebase
git rebase -i 08767fe~1

# 2. In the editor that opens, change 'pick' to 'edit' for these 5 commits:
#    08767fe - chore: bootstrap Docusaurus site
#    52e279f - feat: migrate v1.12 scheduler plugins
#    0c1bee9 - docs: add Hugo to Docusaurus migration audit
#    3de0964 - feat: add Hugo shortcode framework
#    51433c5 - feat: enable Docusaurus docs versioning

# 3. For each commit Git stops at, run:
git commit --amend --signoff --no-edit
git rebase --continue

# 4. After all 5 commits are signed:
git push --force-with-lease origin feat/docusaurus-migration-poc
```

**Full instructions**: See `DCO-FIX-INSTRUCTIONS.md`

---

## Commit Infrastructure Fixes ⚠️ TODO

```bash
cd /Users/aaradhychinche/Documents/volcano/volcano-website

# Stage the fixed files
git add netlify.toml .nvmrc DCO-FIX-INSTRUCTIONS.md MIGRATION-VALIDATION.md NETLIFY-CI-FIX-SUMMARY.md

# Commit with DCO signature
git commit -s -m "fix(ci): update Node version to 20 and add DCO fix instructions

- Update netlify.toml to use Node 20 (was 18) for consistency with CI
- Add .nvmrc to pin Node version for local development
- Add DCO-FIX-INSTRUCTIONS.md for unsigned commit fixes
- Update MIGRATION-VALIDATION.md with troubleshooting section"

# Push
git push origin feat/docusaurus-migration-poc
```

---

## Verify Everything Works ⚠️ TODO

After pushing both fixes:

1. **Check Netlify Preview**
   - Should build with Node 20
   - Should show Docusaurus site
   - Should complete without errors

2. **Check GitHub Actions**
   - Build should pass
   - DCO check should pass

3. **Verify Commit History**
   ```bash
   # All commits should have DCO now
   git log --format="%h %s" origin/master..HEAD
   ```

---

## Priority Order

1. **FIRST**: Fix DCO signatures (blocks PR approval)
2. **SECOND**: Commit infrastructure fixes
3. **THIRD**: Push both commits
4. **FOURTH**: Verify Netlify and CI

---

## 📖 Documentation

- **DCO Fix**: `DCO-FIX-INSTRUCTIONS.md`
- **Full Summary**: `NETLIFY-CI-FIX-SUMMARY.md`
- **Validation**: `MIGRATION-VALIDATION.md`

---

**Ready to Execute**: YES ✅  
**Estimated Time**: 10-15 minutes
