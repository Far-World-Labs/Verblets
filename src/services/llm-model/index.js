import * as tokenizer from 'gpt-tokenizer';

import Model from './model.js';
import {
  catalog,
  frequencyPenalty as frequencyPenaltyConfig,
  models,
  presencePenalty as presencePenaltyConfig,
  temperature as temperatureConfig,
  topP as topPConfig,
} from '../../constants/models.js';
import { CAPABILITY_KEYS } from '../../constants/common.js';

// Get or lazily derive capability Set for a model key
function getModelCapabilities(model, modelKey) {
  if (model.capabilities) return model.capabilities;
  const lower = modelKey.toLowerCase();
  model.capabilities = new Set(CAPABILITY_KEYS.filter((c) => lower.includes(c)));
  return model.capabilities;
}

// Prioritized list of models (best to worst, excluding sensitive/reasoning which are never auto-invoked)
const prioritizedModels = [
  'fastGoodCheap',
  'fastGoodCheapMulti',
  'fastGood',
  'fastGoodMulti',
  'goodCheap',
  'goodCheapMulti',
  'good',
  'goodMulti',
  'fastCheap',
  'fastCheapMulti',
  'fast',
  'fastMulti',
  'cheap',
  'cheapMulti',
  'multi',
  'fastCheapReasoning',
  'fastCheapReasoningMulti',
  'fastReasoning',
  'fastReasoningMulti',
  'cheapReasoning',
  'cheapReasoningMulti',
  'reasoning',
  'reasoningMulti',
];

class ModelService {
  constructor() {
    this.models = {};
    const capabilityKeySet = new Set(CAPABILITY_KEYS);
    this.models = Object.entries(models).reduce((acc, [key, modelDef]) => {
      const lower = key.toLowerCase();
      return {
        ...acc,
        [key]: new Model({
          ...modelDef,
          key,
          capabilities: new Set([...capabilityKeySet].filter((c) => lower.includes(c))),
          tokenizer: tokenizer.encode,
        }),
      };
    }, {});

    // Always default to fastGood for public model
    this.bestPublicModelKey = 'fastGood';

    // Global overrides
    this.globalOverrides = {
      modelName: null, // Force specific model
      negotiate: null, // Force specific negotiation options
      temperature: null, // Force specific temperature
      maxTokens: null, // Force specific max tokens
      topP: null, // Force specific top_p
      frequencyPenalty: null, // Force specific frequency penalty
      presencePenalty: null, // Force specific presence penalty
    };
  }

  // Global override management
  setGlobalOverride(key, value) {
    if (!(key in this.globalOverrides)) {
      throw new Error(
        `Invalid override key: ${key}. Valid keys are: ${Object.keys(this.globalOverrides).join(
          ', '
        )}`
      );
    }
    this.globalOverrides[key] = value;
  }

  clearGlobalOverride(key) {
    if (key) {
      if (!(key in this.globalOverrides)) {
        throw new Error(
          `Invalid override key: ${key}. Valid keys are: ${Object.keys(this.globalOverrides).join(
            ', '
          )}`
        );
      }
      this.globalOverrides[key] = null;
    } else {
      // Clear all overrides
      Object.keys(this.globalOverrides).forEach((k) => {
        this.globalOverrides[k] = null;
      });
    }
  }

  getGlobalOverride(key) {
    return this.globalOverrides[key];
  }

  getAllGlobalOverrides() {
    return { ...this.globalOverrides };
  }

  // Apply global overrides to model options
  applyGlobalOverrides(modelOptions) {
    const result = { ...modelOptions };

    // Apply each override if it's set (not null)
    Object.entries(this.globalOverrides).forEach(([key, value]) => {
      if (value !== null) {
        result[key] = value;
      }
    });

    return result;
  }

  getBestPublicModel() {
    return this.models[this.bestPublicModelKey];
  }

  getBestPrivateModel() {
    if (!this.models.sensitive) {
      throw new Error(
        'No sensitive model configured. Configure a sensitive model or use a public model instead.'
      );
    }
    return this.models.sensitive;
  }

  updateBestPublicModel(name) {
    this.bestPublicModelKey = name;
  }

  getModel(name) {
    if (!name) {
      return this.getBestPublicModel();
    }

    // First try to find by key in registered models
    let modelFound = this.models[name];

    // If not found by key, try to find by model name
    if (!modelFound) {
      modelFound = Object.values(this.models).find((model) => model.name === name);
    }

    // Fall back to catalog (supports direct model names like 'claude-sonnet-4-5')
    if (!modelFound && catalog[name]) {
      modelFound = new Model({
        name,
        ...catalog[name],
        key: name,
        tokenizer: tokenizer.encode,
      });
    }

    if (!modelFound) {
      throw new Error(`Get model by name [error]: '${name}' not found.`);
    }
    return modelFound;
  }

  negotiateModel(preferred, negotiation = {}) {
    const { sensitive, ...capFlags } = negotiation;

    // Sensitive models take absolute priority
    if (sensitive === true || sensitive === 'prefer') {
      const wantsGood = capFlags.good === true;
      const goodKey = wantsGood ? 'sensitiveGood' : 'sensitive';
      const fallbackKey = wantsGood ? 'sensitive' : 'sensitiveGood';

      if (this.models[goodKey]) return goodKey;
      if (this.models[fallbackKey]) return fallbackKey;
      if (sensitive === true) return undefined;
      // sensitive === 'prefer' but no sensitive model → fall through
    }

    // Split into hard constraints (true/false) and soft preferences ('prefer')
    const requires = {};
    const prefers = {};
    let hasConstraints = false;

    for (const [key, value] of Object.entries(capFlags)) {
      if (value === true || value === false) {
        requires[key] = value;
        hasConstraints = true;
      } else if (value === 'prefer') {
        prefers[key] = true;
        hasConstraints = true;
      }
    }

    // No constraints → return preferred or default
    if (!hasConstraints) {
      if (preferred && this.models[preferred]) return preferred;
      return this.bestPublicModelKey;
    }

    // Does a model satisfy all hard constraints?
    const matchesRequires = (modelKey) => {
      const model = this.models[modelKey];
      if (!model) return false;
      const caps = getModelCapabilities(model, modelKey);
      for (const [key, value] of Object.entries(requires)) {
        const has = caps.has(key);
        if (value === true && !has) return false;
        if (value === false && has) return false;
      }
      return true;
    };

    // If preferred model satisfies all requires, use it
    if (preferred && matchesRequires(preferred)) return preferred;

    const hasPrefers = Object.keys(prefers).length > 0;

    // Count how many prefer flags a model satisfies
    const getPreferScore = (modelKey) => {
      const caps = getModelCapabilities(this.models[modelKey], modelKey);
      let score = 0;
      for (const key of Object.keys(prefers)) {
        if (caps.has(key)) score += 1;
      }
      return score;
    };

    // Scan priority list: filter by requires, rank by prefer score
    let bestKey;
    let bestScore = -1;

    for (const modelKey of prioritizedModels) {
      if (!matchesRequires(modelKey)) continue;

      // No prefers — first match wins (priority order)
      if (!hasPrefers) return modelKey;

      const score = getPreferScore(modelKey);
      if (score > bestScore) {
        bestScore = score;
        bestKey = modelKey;
      }
    }

    return bestKey;
  }

  getRequestParameters(options = {}) {
    const frequencyPenalty = options.frequencyPenalty ?? frequencyPenaltyConfig;
    const presencePenalty = options.presencePenalty ?? presencePenaltyConfig;
    const temperature = options.temperature ?? temperatureConfig;
    const topP = options.topP ?? topPConfig;
    const { maxTokens, modelName, prompt } = options;

    const modelFound = this.getModel(modelName);

    let maxTokensFound = maxTokens;
    if (!maxTokens) {
      const promptTokens = modelFound.toTokens(prompt).length;
      const availableTokens = modelFound.maxContextWindow - promptTokens;
      // Cap to the model's maximum output tokens
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

    // Use explicit systemPrompt if provided, otherwise fall back to model's default
    const effectiveSystemPrompt = systemPrompt ?? modelFound.systemPrompt;

    let requestPrompt = { prompt };
    if (/chat|responses|messages/.test(modelFound.endpoint)) {
      const userMessage = { role: 'user', content: prompt };
      const systemMessages = effectiveSystemPrompt
        ? [
            {
              role: 'system',
              content: effectiveSystemPrompt,
            },
          ]
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
      // Strip $schema from json_schema.schema — LLM APIs don't support the JSON Schema meta-schema keyword
      if (response_format.json_schema?.schema?.$schema) {
        const schema = { ...response_format.json_schema.schema };
        delete schema.$schema;
        result.response_format = {
          ...response_format,
          json_schema: {
            ...response_format.json_schema,
            schema,
          },
        };
      } else {
        result.response_format = response_format;
      }
    }

    return result;
  }
}

const modelService = new ModelService();

export default modelService;

/**
 * Resolve an llm config to the model key that would be selected.
 *
 * Accepts the same shapes as the `llm` parameter on chains/verblets:
 *   - string:            'fastGood'
 *   - capability flags:  { fast: true, good: 'prefer' }
 *   - full config:       { modelName: 'fastGood', good: true }
 *
 * Returns the model key (e.g. 'fastGoodCheap') or undefined.
 */
export function resolveModel(llm) {
  if (typeof llm === 'string') {
    try {
      return modelService.getModel(llm) ? llm : undefined;
    } catch {
      return undefined;
    }
  }

  if (!llm || typeof llm !== 'object') {
    return modelService.bestPublicModelKey;
  }

  const { modelName, negotiate: explicitNegotiate, ...rest } = llm;

  // Build negotiation from explicit negotiate or flat capability flags
  const capSet = new Set(CAPABILITY_KEYS);
  const negotiation = { ...explicitNegotiate };
  for (const [key, value] of Object.entries(rest)) {
    if (capSet.has(key)) {
      negotiation[key] = value;
    }
  }

  return modelService.negotiateModel(modelName, negotiation);
}

/**
 * Get the capability Set for a registered model key.
 *
 *   getCapabilities('fastGoodCheap')  // → Set(['fast', 'good', 'cheap'])
 *   getCapabilities('reasoning')      // → Set(['reasoning'])
 *
 * Returns undefined if the model key is not registered.
 */
export function getCapabilities(modelKey) {
  const model = modelService.models[modelKey];
  if (!model) return undefined;
  return getModelCapabilities(model, modelKey);
}

/**
 * Check whether sensitive models are configured.
 *
 *   sensitivityAvailable()  // → { available: true, fast: true, good: true }
 */
export function sensitivityAvailable() {
  const good = !!modelService.models.sensitiveGood;
  const fast = !!modelService.models.sensitive;
  return { available: good || fast, fast, good };
}
