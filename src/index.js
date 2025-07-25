// Load environment variables from .env file FIRST
import dotenv from 'dotenv';
dotenv.config();

import chatGPT from './lib/chatgpt/index.js';

// chains are consumed as verblets

import anonymize from './chains/anonymize/index.js';

import Dismantle from './chains/dismantle/index.js';

import intersections from './chains/intersections/index.js';

import list from './chains/list/index.js';
import glossary from './chains/glossary/index.js';

import questions from './chains/questions/index.js';

import SocraticMethod from './chains/socratic/index.js';

import scanJS from './chains/scan-js/index.js';

import sort from './chains/sort/index.js';
import date from './chains/date/index.js';
import setInterval from './chains/set-interval/index.js';
import score from './chains/score/index.js';
import filterAmbiguous from './chains/filter-ambiguous/index.js';

import SummaryMap from './chains/summary-map/index.js';
import themes from './chains/themes/index.js';
import timeline from './chains/timeline/index.js';

import split from './chains/split/index.js';
import test from './chains/test/index.js';

import testAdvice from './chains/test-advice/index.js';
import Conversation from './chains/conversation/index.js';
import * as turnPolicies from './chains/conversation/turn-policies.js';

// Missing chains
import reduce from './chains/reduce/index.js';
import collectTerms from './chains/collect-terms/index.js';
import disambiguate from './chains/disambiguate/index.js';
import categorySamples from './chains/category-samples/index.js';
import veiledVariants from './chains/veiled-variants/index.js';
import expectChain from './chains/expect/index.js';
import * as llmLogger from './chains/llm-logger/index.js';
import detectPatterns from './chains/detect-patterns/index.js';
import detectThreshold from './chains/detect-threshold/index.js';
import documentShrink from './chains/document-shrink/index.js';
import entities from './chains/entities/index.js';
import relations from './chains/relations/index.js';

import schemas from './json-schemas/index.js';
import * as common from './constants/common.js';
import * as messages from './constants/messages.js';
import * as models from './constants/models.js';

// exported lib utilities
// internal-only: anySignal, editor, parseJsParts, pathAliases, pave, TimedAbortController
import * as promptCache from './lib/prompt-cache/index.js';
import retry from './lib/retry/index.js';
import searchBestFirst from './lib/search-best-first/index.js';
import searchJSFiles from './lib/search-js-files/index.js';
import shortenText from './lib/shorten-text/index.js';
import truncate from './chains/truncate/index.js';
import map, { mapOnce } from './chains/map/index.js';
import find, { findOnce } from './chains/find/index.js';
import filter, { filterOnce } from './chains/filter/index.js';
import stripNumeric from './lib/strip-numeric/index.js';
import stripResponse from './lib/strip-response/index.js';
import templateReplace from './lib/template-replace/index.js';
import join from './chains/join/index.js';
import windowFor from './lib/window-for/index.js';
import toBool from './lib/to-bool/index.js';
import toEnum from './lib/to-enum/index.js';
import toNumber from './lib/to-number/index.js';
import toNumberWithUnits from './lib/to-number-with-units/index.js';
import toDate from './lib/to-date/index.js';
import transcribe from './lib/transcribe/index.js';
import combinations, { rangeCombinations } from './lib/combinations/index.js';
import RingBuffer from './lib/ring-buffer/index.js';

// prompts
import * as prompts from './prompts/index.js';

// services
import * as redis from './services/redis/index.js';
import modelService from './services/llm-model/index.js';

// verblets

import auto from './verblets/auto/index.js';

import bool from './verblets/bool/index.js';

import enums from './verblets/enum/index.js';

import intent from './verblets/intent/index.js';

import number from './verblets/number/index.js';

import numberWithUnits from './verblets/number-with-units/index.js';

import schemaOrg from './verblets/schema-org/index.js';
import nameSimilarTo from './verblets/name-similar-to/index.js';

import name from './verblets/name/index.js';

import toObject from './verblets/to-object/index.js';

import listBatch from './verblets/list-batch/index.js';

import group from './chains/group/index.js';
import conversationTurnReduce from './chains/conversation-turn-reduce/index.js';
import people from './chains/people/index.js';

import fillMissing from './verblets/fill-missing/index.js';
import commonalities from './verblets/commonalities/index.js';

// Missing verblets
import expect from './verblets/expect/index.js';
import sentiment from './verblets/sentiment/index.js';
import listExpand from './verblets/list-expand/index.js';

// # Concept Science
import centralTendencyLines from './verblets/central-tendency-lines/index.js';
import centralTendency from './chains/central-tendency/index.js';
import scale, { createScale } from './verblets/scale/index.js';
import popReference from './chains/pop-reference/index.js';

export { default as retry } from './lib/retry/index.js';
export { default as stripResponse } from './lib/strip-response/index.js';
export { default as searchJSFiles } from './lib/search-js-files/index.js';
export { default as searchBestFirst } from './lib/search-best-first/index.js';
export {
  categorySamples,
  centralTendency,
  collectTerms,
  conversationTurnReduce,
  createScale,
  detectPatterns,
  detectThreshold,
  disambiguate,
  documentShrink,
  entities,
  expectChain,
  filter,
  filterOnce,
  find,
  findOnce,
  join,
  map,
  mapOnce,
  people,
  popReference,
  reduce,
  relations,
  timeline,
  truncate,
  veiledVariants,
  windowFor,
};
export { llmLogger };
export { rangeCombinations } from './lib/combinations/index.js';

export const lib = {
  chatGPT,
  promptCache,
  retry,
  RingBuffer,
  searchBestFirst,
  searchJSFiles,
  shortenText,
  stripNumeric,
  stripResponse,
  templateReplace,
  toBool,
  toEnum,
  toNumber,
  toNumberWithUnits,
  toDate,
  transcribe,
  combinations,
  rangeCombinations,
  windowFor,
};

export const verblets = {
  anonymize,
  auto,
  bool,
  categorySamples,
  centralTendency,
  centralTendencyLines,
  collectTerms,
  commonalities,
  Conversation,
  conversationTurnReduce,
  date,
  detectPatterns,
  detectThreshold,
  disambiguate,
  Dismantle,
  documentShrink,
  entities,
  enums,
  expect,
  expectChain,
  fillMissing,
  filter,
  filterAmbiguous,
  find,
  glossary,
  group,
  intent,
  intersections,
  join,
  list,
  listBatch,
  listExpand,
  map,
  name,
  nameSimilarTo,
  number,
  numberWithUnits,
  people,
  popReference,
  questions,
  reduce,
  scale,
  scanJS,
  schemaOrg,
  score,
  sentiment,
  setInterval,
  SocraticMethod,
  sort,
  split,
  SummaryMap,
  test,
  testAdvice,
  themes,
  timeline,
  toObject,
  truncate,
  veiledVariants,
};

export const services = {
  redis,
  modelService,
};

export const constants = {
  common,
  messages,
  models,
};

export { prompts, schemas, turnPolicies };

export default chatGPT;
