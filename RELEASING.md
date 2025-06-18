# Release Workflow

This project uses a **two-phase release process** that works with branch protection rules:

## 🔄 Phase 1: Version Bump (in PRs)
## 🚀 Phase 2: Publish (on merge)

---

## 📦 How It Works

### For Pull Requests
When you create a PR, the CI will automatically:
1. ✅ Run tests and linting
2. ✅ **Bump the version** using `release-it`
3. ✅ **Create a git tag**
4. ✅ **Push changes back to the PR branch**
5. ❌ **Skip npm publish** (happens later)

### For Merges to Main
When the PR is merged to `main`, the CI will:
1. ✅ **Publish to npm** using the version from `package.json`
2. ✅ **Create GitHub release** with the git tag

---

## 🛠️ Manual Version Bumping

### During Development
```bash
# Patch version (1.0.0 → 1.0.1)
npm run release:patch

# Minor version (1.0.0 → 1.1.0)  
npm run release:minor

# Major version (1.0.0 → 2.0.0)
npm run release:major
```

### What This Does
- Bumps version in `package.json` and `package-lock.json`
- Creates a git tag
- Updates changelog (if configured)
- **Does NOT publish to npm** (happens on merge)

---

## 🔧 Workflow Benefits

### ✅ **Respects Branch Protection**
- Version bumps happen in PR branches
- No direct pushes to `main` required
- Works with "require PR" rules

### ✅ **Separates Concerns**
- **Version management**: Handled in PRs with proper review
- **Publishing**: Automated after merge approval

### ✅ **Fail-Safe**
- If version bump fails → PR fails (caught early)
- If publish fails → only affects deployment (version is safe)

### ✅ **Transparent**
- All version changes are visible in PR diffs
- Reviewers can see exactly what version will be released

---

## 🚨 Troubleshooting

### Version Bump Fails in PR
```bash
# Check if you need to authenticate with npm
npm whoami

# Or run manually to see the error
node scripts/version-bump.js patch
```

### Publish Fails After Merge
- Check GitHub Actions logs
- Verify `NPM_TOKEN` secret is set
- Ensure npm package permissions are correct

### Version Already Exists
This shouldn't happen with the new workflow, but if it does:
```bash
# Check what's published
npm view @far-world-labs/verblets versions --json

# Check local version
cat package.json | grep version
```

---

## 📋 Release Checklist

### Before Creating PR:
- [ ] All tests pass locally
- [ ] Code is properly linted
- [ ] Changes are documented

### In PR:
- [ ] CI automatically bumps version ✅
- [ ] Version bump looks correct in diff
- [ ] All checks pass

### After Merge:
- [ ] Check GitHub Actions for successful publish
- [ ] Verify new version on npm: `npm view @far-world-labs/verblets`
- [ ] Check GitHub releases page

---

## 🔧 Configuration Files

- **`.github/workflows/ci.yml`**: Main CI/CD pipeline
- **`.release-it.json`**: Release-it configuration
- **`scripts/version-bump.js`**: Manual version bump script
- **`package.json`**: Version bump npm scripts 