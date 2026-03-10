/**
 * Model Configuration — Re-export Facade
 *
 * Preserves the original import surface for existing consumers.
 * New code should import directly from the focused modules:
 *   - model-catalog.js  (catalog, systemPrompt)
 *   - model-mappings.js (defaultMapping, models)
 *   - llm-config.js     (cacheTTL, cachingEnabled, debug*, frequency*, presence*, temperature, topP)
 */

export { catalog, systemPrompt } from './model-catalog.js';
export { defaultMapping, models } from './model-mappings.js';
export {
  cacheTTL,
  cachingEnabled,
  debugPromptGlobally,
  debugPromptGloballyIfChanged,
  debugResultGlobally,
  debugResultGloballyIfChanged,
  frequencyPenalty,
  presencePenalty,
  temperature,
  topP,
} from './llm-config.js';
