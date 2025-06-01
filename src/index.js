// Importing dotenv config to load environment variables from .env file
// eslint-disable-next-line no-unused-vars
import dotenv from 'dotenv/config';

import chatGPT from './lib/chatgpt/index.js';

// Internal-only lib utilities not exported:
// anySignal, editor, parseJsParts, pathAliases, pave, TimedAbortController

import retry from './lib/retry/index.js';
import searchBestFirst from './lib/search-best-first/index.js';
import searchJSFiles from './lib/search-js-files/index.js';
import shortenText from './lib/shorten-text/index.js';
import stripNumeric from './lib/strip-numeric/index.js';
import stripResponse from './lib/strip-response/index.js';
import toBool from './lib/to-bool/index.js';
import toEnum from './lib/to-enum/index.js';
import toNumber from './lib/to-number/index.js';
import toNumberWithUnits from './lib/to-number-with-units/index.js';
import transcribe from './lib/transcribe/index.js';
import * as promptCache from './lib/prompt-cache/index.js';

import * as common from './constants/common.js';
import * as messages from './constants/messages.js';
import * as models from './constants/models.js';

import * as prompts from './prompts/index.js';

import * as redis from './services/redis/index.js';
import modelService from './services/llm-model/index.js';

import anonymizeChain from './chains/anonymize/index.js';
import Dismantle from './chains/dismantle/index.js';
import list from './chains/list/index.js';
import questions from './chains/questions/index.js';
import scanJS from './chains/scan-js/index.js';
import sort from './chains/sort/index.js';
import SummaryMap from './chains/summary-map/index.js';
import test from './chains/test/index.js';
import testAdvice from './chains/test-advice/index.js';
import veiledVariants from './chains/veiled-variants/index.js';

import auto from './verblets/auto/index.js';
import bool from './verblets/bool/index.js';
import enums from './verblets/enum/index.js';
import intent from './verblets/intent/index.js';
import number from './verblets/number/index.js';
import numberWithUnits from './verblets/number-with-units/index.js';
import schemaOrg from './verblets/schema-org/index.js';
import toObject from './verblets/to-object/index.js';

const lib = {
  chatGPT,
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
  promptCache,
};

const constants = { common, messages, models };

const services = { redis, modelService };

const verblets = {
  anonymize: anonymizeChain,
  Dismantle,
  list,
  questions,
  scanJS,
  sort,
  SummaryMap,
  test,
  testAdvice,
  veiledVariants,
  auto,
  bool,
  enums,
  intent,
  number,
  numberWithUnits,
  schemaOrg,
  toObject,
};

export { constants, services, prompts, lib, verblets };

export default chatGPT;
