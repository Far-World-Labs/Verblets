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

/**
 * Set project overrides from an external source.
 * Called by the Node entry point after reading .verblets.json.
 * @param {object} overrides - Model name overrides keyed by capability alias
 */
export const setProjectOverrides = (overrides) => {
  projectOverrides = overrides;
};

/* global window */
const loadProjectOverrides = () => {
  if (projectOverrides !== undefined) return projectOverrides;

  if (runtime.isBrowser) {
    projectOverrides = window?.verblets?.models ?? {};
    return projectOverrides;
  }

  // Node.js: defaults to empty if entry point hasn't called setProjectOverrides
  projectOverrides = {};
  return projectOverrides;
};

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
