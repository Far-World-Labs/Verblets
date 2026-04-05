/**
 * Model Configuration — Re-export Facade
 *
 * Preserves the original import surface for existing consumers.
 * New code should import directly from the focused modules:
 *   - model-catalog.js  (catalog, systemPrompt)
 *   - model-mappings.js (defaultRules, findRule)
 *   - llm-config.js     (cacheTTL, cachingEnabled, debug*, frequency*, presence*, temperature, topP)
 */

export { catalog, systemPrompt } from './model-catalog.js';
export { defaultRules, findRule } from './model-mappings.js';
export {
  cacheTTL,
  cachingEnabled,
  debugPromptGlobally,
  debugPromptGloballyIfChanged,
  debugResultGlobally,
  debugResultGloballyIfChanged,
} from './llm-config.js';
