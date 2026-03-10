/**
 * Model resolution: capability name → catalog entry.
 *
 * Resolution order:
 *   1. Project override (.verblets.json / window.verblets.models)
 *   2. Default mapping (from constants/models.js)
 *   3. Direct catalog lookup by model name
 */

import { catalog } from '../../constants/model-catalog.js';
import { defaultMapping } from '../../constants/model-mappings.js';
import { runtime } from '../env/index.js';

// ── Project overrides ───────────────────────────────────────────────

let projectOverrides;

/* global window */
const loadProjectOverrides = () => {
  if (projectOverrides !== undefined) return projectOverrides;

  if (runtime.isBrowser) {
    projectOverrides = window?.verblets?.models ?? {};
    return projectOverrides;
  }

  // Node.js: lazy-load fs via dynamic import (cached after first call)
  // Falls through to empty overrides if .verblets.json doesn't exist
  projectOverrides = {};
  return projectOverrides;
};

// Async initialization for Node.js — reads .verblets.json if it exists
const initNodeOverrides = async () => {
  if (runtime.isBrowser || projectOverrides !== undefined) return;

  try {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const filePath = resolve(process.cwd(), '.verblets.json');
    projectOverrides = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    projectOverrides = {};
  }
};

// Fire-and-forget initialization in Node.js
if (!runtime.isBrowser) {
  initNodeOverrides();
}

// ── Resolve ─────────────────────────────────────────────────────────

/**
 * Resolve a capability name or model name to a catalog entry.
 * @param {string} name - Capability alias (e.g. "fastGood") or model name (e.g. "gpt-4o")
 * @returns {{ name: string, provider: string, ... } | undefined}
 */
export const resolveModel = (name) => {
  const overrides = loadProjectOverrides();

  // 1. Check project override for capability name
  const overriddenModel = overrides[name];
  if (overriddenModel && catalog[overriddenModel]) {
    return { name: overriddenModel, ...catalog[overriddenModel] };
  }

  // 2. Check default mapping
  const mappedModel = defaultMapping[name];
  if (mappedModel && catalog[mappedModel]) {
    return { name: mappedModel, ...catalog[mappedModel] };
  }

  // 3. Direct catalog lookup
  if (catalog[name]) {
    return { name, ...catalog[name] };
  }

  return undefined;
};

export default resolveModel;
