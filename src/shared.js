// Shared imports for both Node and browser environments
// Based on documented exports in README.md

// Primitives
export { default as bool } from './verblets/bool/index.js';
export { default as date } from './chains/date/index.js';
export { default as enums } from './verblets/enum/index.js';
export { default as number } from './verblets/number/index.js';
export { default as numberWithUnits } from './verblets/number-with-units/index.js';

// Math
export {
  default as scale,
  scaleSpec,
  applyScale,
  createScale,
  mapInstructions as scaleMapInstructions,
  filterInstructions as scaleFilterInstructions,
  reduceInstructions as scaleReduceInstructions,
  findInstructions as scaleFindInstructions,
  groupInstructions as scaleGroupInstructions,
} from './chains/scale/index.js';

// Probe Scan & Calibration
export { default as probeScan } from './chains/probe-scan/index.js';
export {
  default as calibrate,
  calibrateSpec,
  applyCalibrate,
  createCalibratedClassifier,
} from './chains/calibrate/index.js';

// Sensitivity — Detection
export {
  default as sensitivityScan,
  createSensitivityScanner,
} from './chains/sensitivity-scan/index.js';
export {
  default as sensitivityCheck,
  createSensitivityChecker,
} from './chains/sensitivity-check/index.js';
export {
  default as sensitivityAudit,
  aggregateAudit,
  createSensitivityAuditor,
} from './chains/sensitivity-audit/index.js';
export {
  default as sensitivityClassify,
  policyFromClassification,
  policyFromAudit,
} from './lib/sensitivity-classify/index.js';

// Sensitivity — Protection
export {
  default as redact,
  redactMode,
  redactSpec,
  applyRedact,
  createRedactor,
  mapInstructions as redactMapInstructions,
  filterInstructions as redactFilterInstructions,
  reduceInstructions as redactReduceInstructions,
  findInstructions as redactFindInstructions,
  groupInstructions as redactGroupInstructions,
} from './chains/redact/index.js';
export {
  default as depersonalize,
  depersonalizeMethod,
  depersonalizeSpec,
  applyDepersonalize,
  createDepersonalizer,
  mapInstructions as depersonalizeMapInstructions,
  filterInstructions as depersonalizeFilterInstructions,
  reduceInstructions as depersonalizeReduceInstructions,
  findInstructions as depersonalizeFindInstructions,
  groupInstructions as depersonalizeGroupInstructions,
} from './chains/depersonalize/index.js';

// Sensitivity — Orchestration
export {
  default as sensitivityGuard,
  protectionStrategy,
  createSensitivityGuard,
  mapInstructions as sensitivityGuardMapInstructions,
  filterInstructions as sensitivityGuardFilterInstructions,
  reduceInstructions as sensitivityGuardReduceInstructions,
  findInstructions as sensitivityGuardFindInstructions,
  groupInstructions as sensitivityGuardGroupInstructions,
} from './chains/sensitivity-guard/index.js';

// Sensitivity — Configuration & Constants
export { sensitivityPolicy } from './constants/sensitivity-policy.js';
export {
  SEVERITY_ORDER,
  severityAtLeast,
  CATEGORY_SEVERITY,
  PLACEHOLDER_PREFIXES,
  GENERALIZATIONS,
} from './constants/sensitivity-categories.js';
export { default as embedProbes } from './lib/embed-probes/index.js';

// Lists
export { default as centralTendency } from './chains/central-tendency/index.js';
export { default as centralTendencyLines } from './verblets/central-tendency-lines/index.js';
export { default as detectPatterns } from './chains/detect-patterns/index.js';
export {
  default as detectThreshold,
  calculateStatistics,
} from './chains/detect-threshold/index.js';
export {
  default as entities,
  entitySpec,
  applyEntities,
  createEntityExtractor,
  mapInstructions as entitiesMapInstructions,
  filterInstructions as entitiesFilterInstructions,
  reduceInstructions as entitiesReduceInstructions,
  findInstructions as entitiesFindInstructions,
  groupInstructions as entitiesGroupInstructions,
} from './chains/entities/index.js';
export { default as extractBlocks } from './chains/extract-blocks/index.js';
export { default as filter } from './chains/filter/index.js';
export { default as find } from './chains/find/index.js';
export { default as glossary } from './chains/glossary/index.js';
export { default as group } from './chains/group/index.js';
export { default as intersections } from './chains/intersections/index.js';
export { default as list, generateList } from './chains/list/index.js';
export { default as listBatch, ListStyle, determineStyle } from './verblets/list-batch/index.js';
export { default as listExpand } from './verblets/list-expand/index.js';
export { default as map } from './chains/map/index.js';
export { default as reduce } from './chains/reduce/index.js';
export {
  default as score,
  scoreSpec,
  applyScore,
  scoreItem,
  mapInstructions as scoreMapInstructions,
  filterInstructions as scoreFilterInstructions,
  reduceInstructions as scoreReduceInstructions,
  findInstructions as scoreFindInstructions,
  groupInstructions as scoreGroupInstructions,
} from './chains/score/index.js';
export { default as sort } from './chains/sort/index.js';
export {
  default as tags,
  tagSpec,
  applyTags,
  createTagExtractor,
  createTagger,
  mapInstructions as tagsMapInstructions,
  filterInstructions as tagsFilterInstructions,
  reduceInstructions as tagsReduceInstructions,
  findInstructions as tagsFindInstructions,
  groupInstructions as tagsGroupInstructions,
} from './chains/tags/index.js';

// Features
export { default as extractFeatures } from './chains/extract-features/index.js';

export {
  default as categorySamples,
  buildSeedGenerationPrompt,
} from './chains/category-samples/index.js';
export { default as collectTerms } from './chains/collect-terms/index.js';
export { default as commonalities } from './verblets/commonalities/index.js';
export { default as conversation } from './chains/conversation/index.js';
export { default as conversationTurnReduce } from './chains/conversation-turn-reduce/index.js';
export { default as disambiguate, getMeanings } from './chains/disambiguate/index.js';
export {
  default as dismantle,
  simplifyTree,
  dismantle as dismantleFactory,
} from './chains/dismantle/index.js';
export { default as documentShrink } from './chains/document-shrink/index.js';
export { default as fillMissing } from './verblets/fill-missing/index.js';
export { default as filterAmbiguous } from './chains/filter-ambiguous/index.js';
export { default as join } from './chains/join/index.js';
export { default as name } from './verblets/name/index.js';
export { default as nameSimilarTo } from './verblets/name-similar-to/index.js';
export { default as people } from './chains/people/index.js';
export { default as popReference } from './chains/pop-reference/index.js';
export { default as questions } from './chains/questions/index.js';
export {
  default as relations,
  relationSpec,
  applyRelations,
  createRelationExtractor,
  parseRDFLiteral,
  parseRelations,
  mapInstructions as relationsMapInstructions,
  filterInstructions as relationsFilterInstructions,
  reduceInstructions as relationsReduceInstructions,
  findInstructions as relationsFindInstructions,
  groupInstructions as relationsGroupInstructions,
} from './chains/relations/index.js';
export { default as schemaOrg } from './verblets/schema-org/index.js';
export { default as socratic } from './chains/socratic/index.js';
export { default as split } from './chains/split/index.js';
export { default as summaryMap } from './chains/summary-map/index.js';
export { default as tagVocabulary, computeTagStatistics } from './chains/tag-vocabulary/index.js';
export { default as themes } from './chains/themes/index.js';
export { default as timeline } from './chains/timeline/index.js';
export { default as toObject } from './chains/to-object/index.js';
export { default as truncate } from './chains/truncate/index.js';
export {
  default as veiledVariants,
  scientificFramingPrompt,
  causalFramePrompt,
  softCoverPrompt,
} from './chains/veiled-variants/index.js';

// Utility Operations
export { default as auto } from './verblets/auto/index.js';
export { default as expect } from './verblets/expect/index.js';
export { default as expectChain } from './chains/expect/index.js';
export { default as intent } from './verblets/intent/index.js';
export { default as llmLogger } from './chains/llm-logger/index.js';
export { default as makePrompt } from './verblets/phail-forge/index.js'; // Alias for phailForge
export { default as phailForge } from './verblets/phail-forge/index.js';
export { default as sentiment } from './verblets/sentiment/index.js';
export { default as setInterval } from './chains/set-interval/index.js';

// Embedding Primitives
export { embed, embedBatch, embedChunked, embedWarmup } from './lib/embed/index.js';

// RAG Helpers
export {
  default as embedExpandQuery,
  ALL_STRATEGIES as embedStrategies,
  embedRewriteQuery,
  embedMultiQuery,
  embedStepBack,
  embedSubquestions,
} from './chains/embed-expand-query/index.js';
export { default as embedNormalizeText } from './lib/embed-normalize-text/index.js';
export {
  default as embedNeighborChunks,
  buildIndex as embedBuildIndex,
  mergeRanges as embedMergeRanges,
  assembleSpan as embedAssembleSpan,
  standaloneSpan as embedStandaloneSpan,
} from './lib/embed-neighbor-chunks/index.js';

// Library Helpers (documented in README)
export { default as combinations, rangeCombinations } from './lib/combinations/index.js';
export { default as chunkSentences } from './lib/chunk-sentences/index.js';
export { debug } from './lib/debug/index.js';
export { default as createBatches } from './lib/text-batch/index.js';
export { default as llm } from './lib/llm/index.js';
export { default as normalizeLlm } from './lib/normalize-llm/index.js';
export { default as parallel, parallelMap } from './lib/parallel-batch/index.js';
export * as promptCache from './lib/prompt-cache/index.js';
export { default as retry } from './lib/retry/index.js';
export { default as anySignal } from './lib/any-signal/index.js';
export { default as TimedAbortController } from './lib/timed-abort-controller/index.js';
export { default as templateReplace } from './lib/template-replace/index.js';
export { default as ringBuffer } from './lib/ring-buffer/index.js';
export {
  emitProgress,
  emitStart,
  emitComplete,
  emitStepProgress,
  emitBatchStart,
  emitBatchComplete,
  emitBatchProcessed,
  emitPhaseProgress,
  createBatchProgressCallback,
  createBatchContext,
  batchTracker,
  scopeProgress,
} from './lib/progress-callback/index.js';
export { default as version } from './lib/version/index.js';
export { default as windowFor } from './lib/window-for/index.js';
export { default as withInactivityTimeout } from './lib/with-inactivity-timeout/index.js';

// LLM Output Parsers
export { default as extractJson } from './lib/extract-json/index.js';
export { default as stripResponse } from './lib/strip-response/index.js';
export { default as stripNumeric } from './lib/strip-numeric/index.js';
export { default as toBool } from './lib/to-bool/index.js';
export { default as toNumber } from './lib/to-number/index.js';
export { default as toDate } from './lib/to-date/index.js';
export { default as toEnum } from './lib/to-enum/index.js';
export { default as toNumberWithUnits } from './lib/to-number-with-units/index.js';
export { default as parseLLMList } from './lib/parse-llm-list/index.js';

// Pure Utilities
export {
  chunk,
  compact,
  cosineSimilarity,
  last,
  omit,
  pick,
  unionBy,
  vectorSearch,
  zipWith,
} from './lib/pure/index.js';
export { default as shuffle } from './lib/shuffle/index.js';
export { default as pipe } from './lib/pipe/index.js';

// Namespaced exports
export * as prompts from './prompts/index.js';
export * as schemas from './json-schemas/index.js';

import * as common from './constants/common.js';
import * as messages from './constants/messages.js';
import * as models from './constants/models.js';
import * as redis from './services/redis/index.js';
import modelService from './services/llm-model/model.js';
export { resolveModel, getCapabilities, sensitivityAvailable } from './services/llm-model/index.js';
export { CAPABILITY_KEYS } from './constants/common.js';

export const constants = {
  common,
  messages,
  models,
};

export const services = {
  redis,
  modelService,
};
