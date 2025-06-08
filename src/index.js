// Importing dotenv config to load environment variables from .env file
// eslint-disable-next-line no-unused-vars
import dotenv from 'dotenv/config';

import chatGPT from './lib/chatgpt/index.js';

// chains are consumed as verblets

import anonymize from './chains/anonymize/index.js';

import Dismantle from './chains/dismantle/index.js';

import list from './chains/list/index.js';

import questions from './chains/questions/index.js';

import scanJS from './chains/scan-js/index.js';

import sort from './chains/sort/index.js';

import SummaryMap from './chains/summary-map/index.js';

import test from './chains/test/index.js';

import testAdvice from './chains/test-advice/index.js';

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
import transcribe from './lib/transcribe/index.js';

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

import name from './verblets/name/index.js';

import toObject from './verblets/to-object/index.js';

import listMap from './verblets/list-map/index.js';
import listFind from './verblets/list-find/index.js';

import bulkGroup from './chains/bulk-group/index.js';

import listGroup from './verblets/list-group/index.js';

export { default as retry } from './lib/retry/index.js';
export { default as stripResponse } from './lib/strip-response/index.js';
export { default as searchJSFiles } from './lib/search-js-files/index.js';
export { default as searchBestFirst } from './lib/search-best-first/index.js';
export { bulkMap, bulkMapRetry, bulkFind, bulkFindRetry, bulkFilter, bulkFilterRetry };

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
  transcribe,
};

export const verblets = {
  auto,
  bool,
  enums,
  intent,
  number,
  numberWithUnits,
  schemaOrg,
  name,
  toObject,
  listMap,
  listFind,
  bulkMap,
  bulkFind,
  anonymize,
  Dismantle,
  list,
  questions,
  scanJS,
  sort,
  SummaryMap,
  test,
  testAdvice,
  bulkGroup,
  bulkFilter,
  listGroup,
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
