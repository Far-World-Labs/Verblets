# Branch Protection Setup

This repository uses GitHub Actions to enforce branch protection rules and ensure code quality before allowing merges.

## How It Works

### 1. Required Status Checks
The following checks must pass before a PR can be merged:

- **🔍 Lint Code** - ESLint checks for code quality and style
- **🧪 Test (Node.js LTS versions)** - Tests run on all supported Node.js LTS versions  
- **🛠️ Build** - Confirms the package builds successfully
- **✅ PR Ready to Merge** - Final gate that confirms all other checks passed

### 2. Automated Enforcement
- **Branch Protection Workflow** (`.github/workflows/branch-protection.yml`) runs on every PR
- Checks the status of all required checks
- Posts helpful comments on PRs indicating readiness to merge
- Prevents merge until all checks pass

### 3. Merge Process
1. Create a pull request
2. Wait for all automated checks to complete
3. Once all checks pass, you'll see a comment: "🎉 All checks passed! This PR is ready for squash and merge."
4. The "Squash and merge" button will be enabled
5. Merge the PR

## Repository Settings

To fully enable this system, configure these repository settings:

### Branch Protection Rules
Go to **Settings → Branches → Add rule** for the `main` branch:

1. **Require status checks to pass before merging** ✅
2. **Require branches to be up to date before merging** ✅  
3. **Required status checks:**
   - `🛡️ Enforce Branch Protection`
   - `🚪 Merge Gate`
   - `🔍 Lint Code`
   - `🛠️ Build`
   - `✅ PR Ready to Merge`

4. **Restrict pushes that create files** ✅
5. **Require linear history** ✅ (optional, for cleaner git history)

### General Settings
Go to **Settings → General → Pull Requests**:

1. **Allow squash merging** ✅
2. **Allow merge commits** ❌ (disable to enforce squash merging)
3. **Allow rebase merging** ❌ (disable to enforce squash merging)
4. **Always suggest updating pull request branches** ✅
5. **Automatically delete head branches** ✅

## Troubleshooting

### PR Shows "Merge blocked"
- Check that all required status checks are passing
- Look for the latest comment from the branch protection bot
- Ensure your branch is up to date with `main`

### Status Check Not Found
If a required status check isn't appearing:
1. Push a new commit to trigger the workflows
2. Check the Actions tab for any failed workflows
3. Verify the workflow names match exactly in both files

### Manual Override
Repository administrators can override branch protection rules if needed, but this should be used sparingly and only for emergency fixes.

## Benefits

- **Prevents broken code** from being merged
- **Ensures consistent code quality** through automated linting
- **Validates compatibility** across Node.js versions
- **Provides clear feedback** on PR readiness
- **Enforces team standards** automatically

This system helps maintain high code quality while providing a smooth developer experience. 