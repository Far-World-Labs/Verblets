// Shared imports for both Node and browser environments
// Based on documented exports in README.md

// Primitives
export { default as bool } from './verblets/bool/index.js';
export { default as date } from './chains/date/index.js';
export { default as classify } from './verblets/enum/index.js';
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

// Context
export {
  CONTEXT_KINDS,
  ENVIRONMENT,
  DOMAIN,
  COMPLIANCE,
  QUALITY_INTENT,
  COST_POSTURE,
} from './constants/context.js';
export {
  createContextBuilder,
  observeApplication,
  observeProviders,
  nameStep,
  getOption,
  getOptionDetail,
  getOptions,
  withPolicy,
  descriptorToSchema,
} from './lib/context/index.js';
export { default as valueArbitrate } from './chains/value-arbitrate/index.js';
export { default as createTraceCollector, eventToTrace } from './lib/trace-collector/index.js';
export {
  OPS as targetingRuleOps,
  clause as targetingClause,
  rule as targetingRule,
  validate as validateTargetingRules,
  schema as targetingRuleSchema,
  evaluateClause as evaluateTargetingClause,
  evaluateRule as evaluateTargetingRule,
  applyFirst as applyFirstTargetingRule,
  applyAll as applyAllTargetingRules,
} from './lib/targeting-rule/index.js';
export { default as suggestTargetingRules } from './verblets/suggest-targeting-rules/index.js';

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

export {
  default as categorySamples,
  buildSeedGenerationPrompt,
} from './chains/category-samples/index.js';
export { default as collectTerms } from './chains/collect-terms/index.js';
export { default as commonalities } from './verblets/commonalities/index.js';
export { default as Conversation } from './chains/conversation/index.js';
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
export { default as SocraticMethod, socratic } from './chains/socratic/index.js';
export { default as split } from './chains/split/index.js';
export { default as SummaryMap } from './chains/summary-map/index.js';
export { default as tagVocabulary, computeTagStatistics } from './chains/tag-vocabulary/index.js';
export { default as themes } from './chains/themes/index.js';
export { default as timeline } from './chains/timeline/index.js';
export { default as toObject } from './chains/to-object/index.js';
export { default as truncate } from './chains/truncate/index.js';
export {
  default as veiledVariants,
  ALL_STRATEGIES as veiledVariantStrategies,
  scientificFramingPrompt,
  causalFramePrompt,
  softCoverPrompt,
} from './chains/veiled-variants/index.js';

// Vision
export {
  default as analyzeImage,
  mapDetail as analyzeImageMapDetail,
} from './chains/analyze-image/index.js';
export { buildVisionPrompt } from './lib/llm/index.js';

// Utility Operations
export { default as auto } from './verblets/auto/index.js';
export { default as expect } from './verblets/expect/index.js';
export { default as aiExpect } from './chains/expect/index.js';
export { default as intent } from './verblets/intent/index.js';
export { default as llmLogger } from './chains/llm-logger/index.js';
export { default as makePrompt } from './verblets/phail-forge/index.js'; // Alias for phailForge
export { default as phailForge } from './verblets/phail-forge/index.js';
export { default as sentiment } from './verblets/sentiment/index.js';
export { default as setInterval } from './chains/set-interval/index.js';

// Embedding Primitives
export {
  embed,
  embedBatch,
  embedChunked,
  embedWarmup,
  setEmbedEnabled,
  embedImage,
  embedImageBatch,
} from './embed/local/index.js';

// Embedding Collection
export { default as embedScore } from './chains/embed-score/index.js';

// RAG Helpers
export { default as embedRewriteQuery } from './verblets/embed-rewrite-query/index.js';
export { default as embedMultiQuery } from './verblets/embed-multi-query/index.js';
export { default as embedStepBack } from './verblets/embed-step-back/index.js';
export { default as embedSubquestions } from './verblets/embed-subquestions/index.js';
export { default as embedRewriteToOutputDoc } from './verblets/embed-rewrite-to-output-doc/index.js';
export { default as embedNormalizeText } from './embed/normalize-text/index.js';
export {
  default as embedNeighborChunks,
  buildIndex as embedBuildIndex,
  mergeRanges as embedMergeRanges,
  assembleSpan as embedAssembleSpan,
  standaloneSpan as embedStandaloneSpan,
} from './embed/neighbor-chunks/index.js';

// Library Helpers (documented in README)
export { default as combinations, rangeCombinations } from './lib/combinations/index.js';
export { default as chunkSentences } from './lib/chunk-sentences/index.js';
export { debug } from './lib/debug/index.js';
export { default as createBatches } from './lib/text-batch/index.js';
export { default as llm, jsonSchema } from './lib/llm/index.js';
export { default as normalizeLlm } from './lib/normalize-llm/index.js';
export { default as parallel, parallelMap } from './lib/parallel-batch/index.js';
export { default as retry } from './lib/retry/index.js';
export { default as anySignal } from './lib/any-signal/index.js';
export { default as TimedAbortController } from './lib/timed-abort-controller/index.js';
export { default as templateReplace } from './lib/template-replace/index.js';
export { default as ringBuffer } from './lib/ring-buffer/index.js';
export { default as createProgressEmitter, scopePhase } from './lib/progress/index.js';
export {
  DomainEvent,
  OpEvent,
  ChainEvent,
  TelemetryEvent,
  Kind,
  Level,
  StatusCode,
  ModelSource,
  OptionSource,
} from './lib/progress/constants.js';
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
  sortBy,
  unionBy,
  vectorSearch,
  zipWith,
} from './lib/pure/index.js';
export { default as shuffle } from './lib/shuffle/index.js';
export { default as pipe } from './lib/pipe/index.js';

// Namespaced exports
export * as prompts from './prompts/index.js';
export * as schemas from './json-schemas/index.js';
export * as promptCache from './lib/prompt-cache/index.js';
export * as promptPiece from './lib/prompt-piece/index.js';
export * as sem from './embed/sem.js';

import * as common from './constants/common.js';
import * as contextConsts from './constants/context.js';
import * as messages from './constants/messages.js';
import * as models from './constants/models.js';
export { resolveModel } from './services/llm-model/index.js';
export { ModelService } from './services/llm-model/index.js';
export { EmbeddingService, resolveEmbedding } from './services/embedding-model/index.js';
export { CAPABILITY_KEYS } from './constants/common.js';
export { default as init } from './init.js';
export * as config from './lib/config/index.js';

export const constants = {
  common,
  context: contextConsts,
  messages,
  models,
};
