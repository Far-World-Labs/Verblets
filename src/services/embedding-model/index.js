/**
 * Embedding Model Service
 *
 * Rule-based negotiation for embedding models, parallel to ModelService for LLMs.
 * Manages model catalog, negotiation rules, and lazy-loaded model instances.
 *
 * Default: CLIP multimodal is the catch-all. Request { good: true } for
 * text-only pipeline model (higher quality text embeddings, no image support).
 */

import { buildEmbedCatalog } from '../../constants/embedding-catalog.js';
import { buildDefaultEmbedRules } from '../../constants/embedding-mappings.js';
import { loadPipeline, loadClip } from './loaders.js';

export class EmbeddingService {
  constructor() {
    this.rules = buildDefaultEmbedRules();
    this.catalog = buildEmbedCatalog();
    this.customModels = {};
    this._loaderCache = new Map();
  }

  // ── Rule management ───────────────────────────────────────────────

  /** Replace negotiation rules. Fully overrides defaults. */
  setRules(rules) {
    this.rules = rules;
  }

  /** Add custom embedding model definitions. Checked before built-in catalog. */
  addModels(models) {
    for (const [name, def] of Object.entries(models)) {
      this.customModels[name] = { name, ...def };
    }
  }

  // ── Model resolution ──────────────────────────────────────────────

  /** Look up a model by name: custom → catalog. Returns undefined if not found. */
  getModel(name) {
    return this.customModels[name] ?? this.catalog[name];
  }

  /** The catch-all model (last rule or first rule without match conditions). */
  getDefaultModel() {
    const defaultRule = this.rules.find((r) => !r.match || Object.keys(r.match).length === 0);
    if (defaultRule) return this.getModel(defaultRule.use);
    const last = this.rules[this.rules.length - 1];
    return last ? this.getModel(last.use) : undefined;
  }

  // ── Negotiation ───────────────────────────────────────────────────

  /**
   * Find the best embedding model by walking rules (first match wins).
   *
   * Capabilities: { good: true|false|'prefer', multi: true|false|'prefer' }
   * fast is accepted but has no matching rules by default (ignored).
   *
   * @param {object} caps - Capability flags
   * @returns {object|undefined} Model definition
   */
  negotiate(caps = {}) {
    for (const rule of this.rules) {
      if (this._ruleMatches(rule, caps)) {
        const model = this.getModel(rule.use);
        if (model) return model;
      }
    }
    return undefined;
  }

  /** Test whether a rule matches the consumer's capability request. */
  _ruleMatches(rule, caps) {
    const match = rule.match;
    if (!match || Object.keys(match).length === 0) return true;

    for (const [cap, required] of Object.entries(match)) {
      const has = caps[cap] === true || caps[cap] === 'prefer';
      if (required && !has) return false;
      if (!required && has) return false;
    }
    return true;
  }

  // ── Loader management ─────────────────────────────────────────────

  /**
   * Get a loaded model ready for inference. Lazy-loads and caches.
   *
   * @param {string} modelName
   * @returns {Promise<{ embedTexts: function, embedImages?: function, dimensions: number }>}
   */
  getLoader(modelName) {
    if (!this._loaderCache.has(modelName)) {
      const def = this.getModel(modelName);
      if (!def) throw new Error(`Unknown embedding model: "${modelName}"`);
      const promise = def.loader === 'clip' ? loadClip(def) : loadPipeline(def);
      this._loaderCache.set(modelName, promise);
    }
    return this._loaderCache.get(modelName);
  }
}

/**
 * Resolve an embedding config to capability flags.
 *
 * Accepts the same shapes as the `embedding` parameter on embed functions:
 *   - capability flags:  { good: true, multi: true }
 *   - direct model name: 'Xenova/clip-vit-base-patch16'
 *   - undefined:         use defaults
 *
 * @param {string|object|undefined} embedding
 * @returns {{ modelName?: string, caps: object }}
 */
export function resolveEmbedding(embedding) {
  if (!embedding) return { caps: {} };

  if (typeof embedding === 'string') {
    return { modelName: embedding, caps: {} };
  }

  const { modelName, ...caps } = embedding;
  return { modelName, caps };
}
