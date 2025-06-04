// Importing dotenv config to load environment variables from .env file
// eslint-disable-next-line no-unused-vars
import dotenv from 'dotenv/config';

import chatGPT from './lib/chatgpt/index.js';

// chains are consumed as verblets
// eslint-disable-next-line import/no-named-as-default
import anonymize from './chains/anonymize/index.js';
// eslint-disable-next-line import/no-named-as-default
import Dismantle from './chains/dismantle/index.js';
// eslint-disable-next-line import/no-named-as-default
import list from './chains/list/index.js';
// eslint-disable-next-line import/no-named-as-default
import questions from './chains/questions/index.js';
// eslint-disable-next-line import/no-named-as-default
import scanJS from './chains/scan-js/index.js';
// eslint-disable-next-line import/no-named-as-default
import sort from './chains/sort/index.js';
// eslint-disable-next-line import/no-named-as-default
import SummaryMap from './chains/summary-map/index.js';
// eslint-disable-next-line import/no-named-as-default
import test from './chains/test/index.js';
// eslint-disable-next-line import/no-named-as-default
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
import bulkMap, { bulkMapRetry } from './lib/bulk-map/index.js';
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
// eslint-disable-next-line import/no-named-as-default
import auto from './verblets/auto/index.js';
// eslint-disable-next-line import/no-named-as-default
import bool from './verblets/bool/index.js';
// eslint-disable-next-line import/no-named-as-default
import enums from './verblets/enum/index.js';
// eslint-disable-next-line import/no-named-as-default
import intent from './verblets/intent/index.js';
// eslint-disable-next-line import/no-named-as-default
import number from './verblets/number/index.js';
// eslint-disable-next-line import/no-named-as-default
import numberWithUnits from './verblets/number-with-units/index.js';
// eslint-disable-next-line import/no-named-as-default
import schemaOrg from './verblets/schema-org/index.js';
// eslint-disable-next-line import/no-named-as-default
import toObject from './verblets/to-object/index.js';
// eslint-disable-next-line import/no-named-as-default
import listMap from './verblets/list-map/index.js';

export { default as retry } from './lib/retry/index.js';
export { default as stripResponse } from './lib/strip-response/index.js';
export { default as searchJSFiles } from './lib/search-js-files/index.js';
export { default as searchBestFirst } from './lib/search-best-first/index.js';
export { default as bulkMap } from './lib/bulk-map/index.js';
export { bulkMapRetry } from './lib/bulk-map/index.js';

export const lib = {
  chatGPT,
  promptCache,
  retry,
  searchBestFirst,
  searchJSFiles,
  shortenText,
  bulkMap,
  bulkMapRetry,
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
  toObject,
  listMap,
  anonymize,
  Dismantle,
  list,
  questions,
  scanJS,
  sort,
  SummaryMap,
  test,
  testAdvice,
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
