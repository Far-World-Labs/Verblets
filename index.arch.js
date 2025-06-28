import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function getModuleDirs() {
  const root = path.resolve('src');
  const categories = ['chains', 'verblets'];
  const modules = [];
  for (const cat of categories) {
    const base = path.join(root, cat);
    for (const name of fs.readdirSync(base)) {
      const modPath = path.join(base, name);
      if (fs.statSync(modPath).isDirectory()) {
        modules.push({ category: cat, name, dir: modPath });
      }
    }
  }
  return modules;
}

export async function aiArchExpect(entry) {
  const context = typeof entry === 'string' ? { path: path.resolve(entry) } : entry;
  return {
    async satisfies(description, assertion = () => {}) {
      await assertion(context);
      return { description };
    },
    context,
  };
}

const requiredFiles = ['README.md', 'index.js', 'index.spec.js', 'index.examples.js'];

describe('module structure', () => {
  const modules = getModuleDirs();
  modules.forEach((mod) => {
    it(`${mod.category}/${mod.name} has required files`, () => {
      const missing = requiredFiles.filter((f) => !fs.existsSync(path.join(mod.dir, f)));
      expect(missing).toEqual([]);
    });
  });
});
