import * as tokenizer from 'gpt-tokenizer';

import Model from './model.js';
import {
  defaultRules,
  DEFAULT_GATED_CAPABILITIES,
  resolveCatalogEntry,
} from '../../constants/model-mappings.js';
import { CAPABILITY_KEYS } from '../../constants/common.js';

class ModelService {
  constructor() {
    this.rules = defaultRules;
    this.gatedCapabilities = new Set(DEFAULT_GATED_CAPABILITIES);
    this.customModels = {};
    this._modelCache = new Map();
  }

  // ── Rule management ───────────────────────────────────────────────

  /**
   * Replace the negotiation rules. Fully overrides defaults.
   * @param {Array<{ match?: object, use: string }>} rules
   */
  setRules(rules) {
    this.rules = rules;
    this._modelCache.clear();
  }

  /**
   * Extend the model catalog with custom definitions.
   * Custom models are checked before the built-in catalog.
   * @param {Record<string, object>} models - { 'my-model': { provider, apiUrl, ... } }
   */
  addModels(models) {
    Object.assign(this.customModels, models);
    this._modelCache.clear();
  }

  // ── Model resolution ──────────────────────────────────────────────

  /**
   * Resolve a model name to a Model instance.
   * Checks: cache → customModels → catalog. Returns undefined if not found.
   */
  _resolveModel(name) {
    if (!name) return undefined;

    const cached = this._modelCache.get(name);
    if (cached) return cached;

    // Custom models (from addModels)
    const custom = this.customModels[name];
    if (custom) {
      const merged = Object.defineProperties(
        { name, key: name, tokenizer: tokenizer.encode },
        Object.getOwnPropertyDescriptors(custom)
      );
      const model = new Model(merged);
      this._modelCache.set(name, model);
      return model;
    }

    // Built-in catalog
    const entry = resolveCatalogEntry(name);
    if (entry) {
      const merged = Object.defineProperties(
        { key: name, tokenizer: tokenizer.encode },
        Object.getOwnPropertyDescriptors(entry)
      );
      const model = new Model(merged);
      this._modelCache.set(name, model);
      return model;
    }

    return undefined;
  }

  // ── Default model ─────────────────────────────────────────────────

  /**
   * The default model — the catch-all rule (no match or empty match).
   */
  getDefaultModel() {
    const defaultRule = this.rules.find((r) => !r.match || Object.keys(r.match).length === 0);
    if (defaultRule) return this._resolveModel(defaultRule.use);
    // Fallback: last rule
    const last = this.rules[this.rules.length - 1];
    return last ? this._resolveModel(last.use) : undefined;
  }

  getBestPublicModel() {
    return this.getDefaultModel();
  }

  getBestPrivateModel() {
    const rule = this.rules.find((r) => r.match?.sensitive === true);
    if (!rule) {
      throw new Error(
        'No sensitive model configured. Configure a sensitive model or use a public model instead.'
      );
    }
    const model = this._resolveModel(rule.use);
    if (!model) {
      throw new Error(`Sensitive model '${rule.use}' not found in catalog.`);
    }
    return model;
  }

  // ── Model lookup ──────────────────────────────────────────────────

  getModel(name) {
    if (!name) return this.getDefaultModel();

    const model = this._resolveModel(name);
    if (model) return model;

    throw new Error(`Get model by name [error]: '${name}' not found.`);
  }

  // ── Negotiation ───────────────────────────────────────────────────

  /**
   * Find the best model by walking rules in order (first match wins).
   *
   * Consumers express intent as capability objects:
   *   { fast: true, good: true }    — require fast and good
   *   { reasoning: true }            — require reasoning (gated)
   *   { sensitive: true }            — require sensitive (gated, safe)
   *   { cheap: true, good: false }   — require cheap, exclude good
   *   { sensitive: 'prefer' }        — prefer sensitive, fall through if unavailable
   *
   * A rule's `match` maps capabilities to true (must be requested) or false
   * (must NOT be requested). Unmentioned capabilities are don't-care.
   * Consumer 'prefer' satisfies a true condition.
   *
   * Gating: if consumer hard-requires a gated capability (true, not 'prefer'),
   * rules that don't mention it are skipped. Prevents sensitive data from
   * reaching cloud models.
   *
   * @param {string|undefined} preferredModelName - Direct model name (escape hatch)
   * @param {Object} negotiation - Capability flags (true, false, or 'prefer')
   * @returns {Model|undefined} The selected model, or undefined if no match
   */
  negotiateModel(preferredModelName, negotiation = {}) {
    // Escape hatch: preferred model name resolves directly
    if (preferredModelName) {
      const model = this._resolveModel(preferredModelName);
      if (model) return model;
    }

    // Walk rules in order, first match wins
    for (const rule of this.rules) {
      if (this._ruleMatches(rule, negotiation)) {
        const model = this._resolveModel(rule.use);
        if (model) return model;
      }
    }

    return undefined;
  }

  /**
   * Test whether a rule matches the consumer's capability request.
   */
  _ruleMatches(rule, caps) {
    const match = rule.match;
    if (!match || Object.keys(match).length === 0) {
      // Catch-all rule — but gating still applies
      for (const gated of this.gatedCapabilities) {
        if (caps[gated] === true) return false;
      }
      return true;
    }

    // Check all conditions in the rule
    for (const [cap, required] of Object.entries(match)) {
      const has = caps[cap] === true || caps[cap] === 'prefer';
      if (required && !has) return false;
      if (!required && has) return false;
    }

    // Gating: hard-required gated cap not addressed by this rule → skip
    for (const gated of this.gatedCapabilities) {
      if (caps[gated] === true && !(gated in match)) return false;
    }

    return true;
  }

  // ── Request building ──────────────────────────────────────────────

  getRequestParameters(options = {}) {
    const temperature = options.temperature ?? 0;
    const frequencyPenalty = options.frequencyPenalty ?? 0;
    const presencePenalty = options.presencePenalty ?? 0;
    const topP = options.topP ?? 0.5;
    const { maxTokens, modelName, prompt } = options;

    const modelFound = this.getModel(modelName);

    let maxTokensFound = maxTokens;
    if (!maxTokens) {
      const promptTokens = modelFound.toTokens(prompt).length;
      const availableTokens = modelFound.maxContextWindow - promptTokens;
      maxTokensFound = Math.min(availableTokens, modelFound.maxOutputTokens);
    }

    return {
      model: modelFound.name,
      temperature,
      max_tokens: maxTokensFound,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
    };
  }

  getRequestConfig(options) {
    const { tools, toolChoice, modelName, prompt, systemPrompt, response_format } = options;

    const modelFound = this.getModel(modelName);

    const effectiveSystemPrompt = systemPrompt ?? modelFound.systemPrompt;

    let requestPrompt = { prompt };
    if (/chat|responses|messages/.test(modelFound.endpoint)) {
      const userMessage = { role: 'user', content: prompt };
      const systemMessages = effectiveSystemPrompt
        ? [{ role: 'system', content: effectiveSystemPrompt }]
        : [];
      requestPrompt = {
        messages: [...systemMessages, userMessage],
        tools,
        tool_choice: tools && !toolChoice ? 'auto' : toolChoice,
      };
    }
    const data = this.getRequestParameters(options);

    const result = {
      ...requestPrompt,
      ...data,
    };

    if (response_format) {
      if (response_format.json_schema?.schema?.$schema) {
        const schema = { ...response_format.json_schema.schema };
        delete schema.$schema;
        result.response_format = {
          ...response_format,
          json_schema: { ...response_format.json_schema, schema },
        };
      } else {
        result.response_format = response_format;
      }
    }

    return result;
  }
}

const modelService = new ModelService();

export { ModelService };
export default modelService;

/**
 * Resolve an llm config to the model name that would be selected.
 *
 * Accepts the same shapes as the `llm` parameter on chains/verblets:
 *   - capability flags:  { fast: true, good: 'prefer' }
 *   - direct model name: 'gpt-4.1-mini'
 *   - full config:       { modelName: 'gpt-4.1-mini', good: true }
 *
 * Returns the model name (e.g. 'gpt-4.1-mini') or undefined.
 */
export function resolveModel(llm) {
  if (typeof llm === 'string') {
    try {
      return modelService.getModel(llm)?.name;
    } catch {
      return undefined;
    }
  }

  if (!llm || typeof llm !== 'object') {
    return modelService.getDefaultModel()?.name;
  }

  const { modelName, negotiate: explicitNegotiate, ...rest } = llm;

  const capSet = new Set(CAPABILITY_KEYS);
  const negotiation = { ...explicitNegotiate };
  for (const [key, value] of Object.entries(rest)) {
    if (capSet.has(key)) {
      negotiation[key] = value;
    }
  }

  const model = modelService.negotiateModel(modelName, negotiation);
  return model?.name;
}
