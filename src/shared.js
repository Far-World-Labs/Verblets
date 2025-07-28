// Shared imports for both Node and browser environments
// Based on documented exports in README.md

// Primitives
export { default as bool } from './verblets/bool/index.js';
export { default as date } from './chains/date/index.js';
export { default as enums } from './verblets/enum/index.js';
export { default as number } from './verblets/number/index.js';
export { default as numberWithUnits } from './verblets/number-with-units/index.js';

// Math
export { default as scale, createScale } from './verblets/scale/index.js';

// Lists
export { default as centralTendency } from './chains/central-tendency/index.js';
export { default as detectPatterns } from './chains/detect-patterns/index.js';
export { default as detectThreshold } from './chains/detect-threshold/index.js';
export { default as entities } from './chains/entities/index.js';
export { default as filter } from './chains/filter/index.js';
export { default as find } from './chains/find/index.js';
export { default as glossary } from './chains/glossary/index.js';
export { default as group } from './chains/group/index.js';
export { default as intersections } from './chains/intersections/index.js';
export { default as list } from './chains/list/index.js';
export { default as listExpand } from './verblets/list-expand/index.js';
export { default as map } from './chains/map/index.js';
export { default as reduce } from './chains/reduce/index.js';
export { default as score } from './chains/score/index.js';
export { default as sort } from './chains/sort/index.js';

// Content
export { default as anonymize } from './chains/anonymize/index.js';
export { default as categorySamples } from './chains/category-samples/index.js';
export { default as collectTerms } from './chains/collect-terms/index.js';
export { default as commonalities } from './verblets/commonalities/index.js';
export { default as conversation } from './chains/conversation/index.js';
export { default as disambiguate } from './chains/disambiguate/index.js';
export { default as dismantle } from './chains/dismantle/index.js';
export { default as documentShrink } from './chains/document-shrink/index.js';
export { default as fillMissing } from './verblets/fill-missing/index.js';
export { default as filterAmbiguous } from './chains/filter-ambiguous/index.js';
export { default as join } from './chains/join/index.js';
export { default as name } from './verblets/name/index.js';
export { default as nameSimilarTo } from './verblets/name-similar-to/index.js';
export { default as people } from './chains/people/index.js';
export { default as popReference } from './chains/pop-reference/index.js';
export { default as questions } from './chains/questions/index.js';
export { default as schemaOrg } from './verblets/schema-org/index.js';
export { default as socratic } from './chains/socratic/index.js';
export { default as split } from './chains/split/index.js';
export { default as summaryMap } from './chains/summary-map/index.js';
export { default as themes } from './chains/themes/index.js';
export { default as timeline } from './chains/timeline/index.js';
export { default as toObject } from './verblets/to-object/index.js';
export { default as truncate } from './chains/truncate/index.js';
export { default as veiledVariants } from './chains/veiled-variants/index.js';

// Utility Operations
export { default as auto } from './verblets/auto/index.js';
export { default as expect } from './verblets/expect/index.js';
export { default as expectChain } from './chains/expect/index.js';
export { default as intent } from './verblets/intent/index.js';
export { default as llmLogger } from './chains/llm-logger/index.js';
export { default as sentiment } from './verblets/sentiment/index.js';
export { default as setInterval } from './chains/set-interval/index.js';

// Library Helpers (documented in README)
export { default as chatGPT } from './lib/chatgpt/index.js';
export { default as promptCache } from './lib/prompt-cache/index.js';
export { default as retry } from './lib/retry/index.js';
export { default as ringBuffer } from './lib/ring-buffer/index.js';

// Namespaced exports
export * as prompts from './prompts/index.js';
export * as schemas from './json-schemas/index.js';

import common from './constants/common.js';
import * as messages from './constants/messages.js';
import * as models from './constants/models.js';
import redis from './services/redis/index.js';
import modelService from './services/llm-model/model.js';

export const constants = {
  common,
  messages,
  models,
};

export const services = {
  redis,
  modelService,
};
