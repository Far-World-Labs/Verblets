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
import bulkScore from './chains/bulk-score/index.js';
import bulkConversationResponse from './chains/bulk-conversation-response/index.js';
import filterAmbiguous from './chains/filter-ambiguous/index.js';

import SummaryMap from './chains/summary-map/index.js';
import themes from './chains/themes/index.js';

import test from './chains/test/index.js';

import testAdvice from './chains/test-advice/index.js';
import ConversationChain from './chains/conversation-chain/index.js';

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
import bulkMap, { bulkMapRetry } from './chains/bulk-map/index.js';
import bulkFind, { bulkFindRetry } from './chains/bulk-find/index.js';
import bulkFilter, { bulkFilterRetry } from './chains/bulk-filter/index.js';
import stripNumeric from './lib/strip-numeric/index.js';
import stripResponse from './lib/strip-response/index.js';
import toBool from './lib/to-bool/index.js';
import toEnum from './lib/to-enum/index.js';
import toNumber from './lib/to-number/index.js';
import toNumberWithUnits from './lib/to-number-with-units/index.js';
import toDate from './lib/to-date/index.js';
import transcribe from './lib/transcribe/index.js';
import combinations, { rangeCombinations } from './lib/combinations/index.js';

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
import peopleList from './verblets/people-list/index.js';

import toObject from './verblets/to-object/index.js';

import listMap from './verblets/list-map/index.js';
import listFind from './verblets/list-find/index.js';

import bulkGroup from './chains/bulk-group/index.js';

import listGroup from './verblets/list-group/index.js';
import intersection from './verblets/intersection/index.js';

// # Concept Science
import centralTendency from './verblets/central-tendency/index.js';
import bulkCentralTendency, {
  bulkCentralTendencyRetry,
} from './chains/bulk-central-tendency/index.js';

export { default as retry } from './lib/retry/index.js';
export { default as stripResponse } from './lib/strip-response/index.js';
export { default as searchJSFiles } from './lib/search-js-files/index.js';
export { default as searchBestFirst } from './lib/search-best-first/index.js';
export {
  bulkMap,
  bulkMapRetry,
  bulkFind,
  bulkFindRetry,
  bulkFilter,
  bulkFilterRetry,
  bulkCentralTendency,
  bulkCentralTendencyRetry,
};
export { rangeCombinations } from './lib/combinations/index.js';

export const lib = {
  chatGPT,
  promptCache,
  retry,
  searchBestFirst,
  searchJSFiles,
  shortenText,
  stripNumeric,
  stripResponse,
  toBool,
  toEnum,
  toNumber,
  toNumberWithUnits,
  toDate,
  transcribe,
  combinations,
  rangeCombinations,
};

export const verblets = {
  auto,
  bool,
  enums,
  intent,
  number,
  numberWithUnits,
  schemaOrg,
  nameSimilarTo,
  name,
  peopleList,
  toObject,
  listMap,
  listFind,
  bulkMap,
  bulkFind,
  anonymize,
  Dismantle,
  intersections,
  list,
  glossary,
  questions,
  SocraticMethod,
  scanJS,
  sort,
  date,
  SummaryMap,
  themes,
  setInterval,
  test,
  testAdvice,
  ConversationChain,
  bulkConversationResponse,
  bulkScore,
  filterAmbiguous,
  bulkGroup,
  bulkFilter,
  listGroup,
  intersection,
  // # Concept Science
  centralTendency,
  bulkCentralTendency,
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

export { prompts, schemas };

export default chatGPT;
