#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const args = process.argv.slice(2);
const bumpType = args[0] || 'patch'; // patch, minor, major

if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('Usage: node scripts/version-bump.js [patch|minor|major]');
  process.exit(1);
}

try {
  console.log(`🔄 Bumping ${bumpType} version...`);
  
  // Use release-it to bump version and create tag (no publish, no GitHub release)
  execSync(`npx release-it ${bumpType} --ci --no-npm.publish --no-github.release`, {
    stdio: 'inherit'
  });
  
  // Get the new version
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const newVersion = pkg.version;
  
  console.log(`✅ Version bumped to ${newVersion}`);
  console.log('📝 Commit and push this change in your PR');
  console.log('🚀 Publishing will happen automatically when PR is merged');
  
} catch (error) {
  console.error('❌ Version bump failed:', error.message);
  process.exit(1);
} 