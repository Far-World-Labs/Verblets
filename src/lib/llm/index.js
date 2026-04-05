import fetch from 'node-fetch';

import {
  debugPromptGlobally,
  debugPromptGloballyIfChanged,
  debugResultGlobally,
  debugResultGloballyIfChanged,
} from '../../constants/llm-config.js';
import { getProvider } from './providers/index.js';
import normalizeLlm from '../normalize-llm/index.js';
import { CAPABILITY_KEYS } from '../../constants/common.js';
import anySignal from '../any-signal/index.js';
import { get as getPromptResult, set as setPromptResult } from '../prompt-cache/index.js';
import TimedAbortController from '../timed-abort-controller/index.js';
import modelService from '../../services/llm-model/index.js';
import { getClient as getRedis } from '../../services/redis/index.js';
import { get as configGet } from '../config/index.js';
import extractJson from '../extract-json/index.js';
import stripResponse from '../strip-response/index.js';
import { onlyJSON, contentIsSchema } from '../../prompts/constants.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { getOption } from '../context/option.js';
import createProgressEmitter from '../progress/index.js';
import {
  TelemetryEvent,
  LlmStatus,
  ModelSource,
  Metric,
  TokenType,
} from '../progress/constants.js';

/**
 * Configure the appropriate abort signal for fetch requests.
 *
 * Browser environments (specifically jsdom in tests) have compatibility issues with AbortSignal
 * where the signal object gets serialized to "AbortSignal {}" causing fetch to reject it.
 * This is a known issue with jsdom's fetch implementation not properly handling AbortController instances.
 *
 * In production browsers, AbortSignal works correctly, but we disable it in test environments
 * to avoid false failures. This means browser tests won't have timeout protection, but the
 * trade-off is acceptable since timeouts are primarily important in production Node.js environments.
 *
 * @param {Object} fetchOptions - The fetch options object to modify
 * @param {AbortSignal} [abortSignal] - Optional user-provided abort signal
 * @param {TimedAbortController} timeoutController - The timeout controller for the request
 */
function configureAbortSignal(fetchOptions, abortSignal, timeoutController) {
  // Only configure signals in Node.js environments
  if (typeof window === 'undefined') {
    if (abortSignal) {
      // Combine user-provided signal with timeout signal
      fetchOptions.signal = anySignal([abortSignal, timeoutController.signal]);
    } else {
      // Just use timeout signal
      fetchOptions.signal = timeoutController.signal;
    }
  }
  // In browser/jsdom environments, we skip the signal to avoid compatibility issues
}

/**
 * Build a response_format object for structured JSON output.
 * Wraps a JSON schema in the standard { type, json_schema: { name, schema } } envelope.
 *
 * @param {string} name - Schema name (e.g. 'sort_result', 'filter_decisions')
 * @param {object} schema - JSON Schema object
 * @returns {{ type: 'json_schema', json_schema: { name: string, schema: object } }}
 */
export const jsonSchema = (name, schema) => ({
  type: 'json_schema',
  json_schema: { name, schema },
});

// Helper to detect if a response format schema is a simple collection wrapper
export const isSimpleCollectionSchema = (responseFormat) => {
  const schema = responseFormat?.json_schema?.schema;
  if (!schema || schema.type !== 'object') return false;

  const props = schema.properties;
  const propKeys = Object.keys(props || {});

  // Single 'items' property that's an array
  return propKeys.length === 1 && propKeys[0] === 'items' && props.items?.type === 'array';
};

// Helper to detect if a response format schema is a simple value wrapper
export const isSimpleValueSchema = (responseFormat) => {
  const schema = responseFormat?.json_schema?.schema;
  if (!schema || schema.type !== 'object') return false;

  const props = schema.properties;
  const propKeys = Object.keys(props || {});

  // Single 'value' property
  return propKeys.length === 1 && propKeys[0] === 'value';
};

const shapeOutputDefault = (result, requestConfig, options = {}) => {
  // GPT-4
  if (result.choices[0].message.tool_calls?.length) {
    const toolCall = result.choices[0].message.tool_calls[0];
    return {
      name: toolCall.function.name,
      arguments: JSON.parse(toolCall.function.arguments),
      result: result.choices[0].message.tool_calls[0].function,
    };
  }
  if (result.choices[0].message) {
    const content = result.choices[0].message.content;
    // If content is already an object (structured output), return it directly
    if (typeof content === 'object' && content !== null) {
      return content;
    }
    // If using response_format and content is a string, parse it as JSON unless disabled
    if (
      typeof content === 'string' &&
      requestConfig?.response_format &&
      !options.skipResponseParse
    ) {
      const trimmed = content.trim();
      try {
        const parsed = JSON.parse(trimmed);

        // Auto-unwrap simple collection wrappers (default enabled)
        const unwrapCollections = options.unwrapCollections !== false;
        if (unwrapCollections && isSimpleCollectionSchema(requestConfig.response_format)) {
          if (parsed?.items && Array.isArray(parsed.items)) {
            return parsed.items;
          }
        }

        // Auto-unwrap simple value wrappers (default enabled)
        const unwrapValues = options.unwrapValues !== false;
        if (unwrapValues && isSimpleValueSchema(requestConfig.response_format)) {
          if ('value' in parsed) {
            return parsed.value;
          }
        }

        return parsed;
      } catch {
        // Models without structured output may return unparseable text despite
        // response_format being set. Throwing lets the caller's retry wrapper
        // re-attempt the LLM call rather than silently returning a string.
        throw new Error(
          `Structured output parse failed — model returned non-JSON: ${trimmed.slice(0, 200)}`
        );
      }
    }
    // Otherwise, it's a string, so trim it
    return content.trim();
  }
  return result.choices[0].text.trim();
};

const onBeforeRequestDefault = ({ debugPrompt, isCached, prompt }) => {
  if (debugPrompt || debugPromptGlobally || (debugPromptGloballyIfChanged && !isCached)) {
    console.error('+++ DEBUG PROMPT +++');
    console.error(prompt);
    console.error('+++ DEBUG PROMPT END +++');
  }
};

const onAfterRequestDefault = ({ debugResult, isCached, resultShaped }) => {
  if (debugResult || debugResultGlobally || (debugResultGloballyIfChanged && !isCached)) {
    console.error('+++ DEBUG RESULT +++');
    console.error(resultShaped);
    console.error('+++ DEBUG RESULT END +++');
  }
};

// ── Base policy ─────────────────────────────────────────────────────
// Module-level policy set via init({ policy }). Merged under per-call
// policy so per-call always wins.
let basePolicy;
export const setBasePolicy = (policy) => {
  basePolicy = policy;
};

// Keys that belong to the model/request layer (as opposed to callLlm control keys).
// Exported so consumers can discover which keys are policy-resolvable at the LLM level.
export const MODEL_KEYS = [
  'response_format',
  'temperature',
  'frequencyPenalty',
  'presencePenalty',
  'systemPrompt',
  'requestTimeout',
  'tools',
  'toolChoice',
  'maxTokens',
  'topP',
];

export const run = async (prompt, config = {}) => {
  // Handle config parameter - can be string (model name) or object (full options)
  let options;
  if (typeof config === 'string') {
    options = { modelName: config };
  } else {
    options = config;
  }

  const {
    abortSignal,
    debugPrompt,
    debugResult,
    forceQuery: _forceQuery,
    llm,
    logger,
    onAfterRequest = onAfterRequestDefault,
    onBeforeRequest = onBeforeRequestDefault,
    shapeOutput = shapeOutputDefault,
    skipResponseParse,
    unwrapValues,
    unwrapCollections,
  } = options;
  // Merge base policy (from init) under per-call policy so per-call wins
  const effectiveOptions =
    basePolicy && !options.policy
      ? { ...options, policy: basePolicy }
      : basePolicy
        ? { ...options, policy: { ...basePolicy, ...options.policy } }
        : options;

  const forceQuery = await getOption('forceQuery', effectiveOptions, false);

  // Build modelOptions from flat config, resolving through context system.
  // This allows per-operation behavioral policy via the policy channel.
  const modelOptions = { ...normalizeLlm(llm) };
  for (const key of MODEL_KEYS) {
    const resolved = await getOption(key, effectiveOptions, undefined);
    if (resolved !== undefined) modelOptions[key] = resolved;
  }
  for (const key of CAPABILITY_KEYS) {
    const resolved = await getOption(key, effectiveOptions, undefined);
    if (resolved !== undefined) modelOptions[key] = resolved;
  }

  // Log start of llm execution
  const startTime = Date.now();

  // Extract capability flags for model negotiation
  // Supports both flat keys ({ fast: true }) and legacy negotiate wrapper ({ negotiate: { fast: true } })
  const negotiation = {};
  let shouldNegotiate = false;

  if (modelOptions.negotiate) {
    Object.assign(negotiation, modelOptions.negotiate);
    shouldNegotiate = true;
  }

  for (const key of CAPABILITY_KEYS) {
    if (key in modelOptions) {
      negotiation[key] = modelOptions[key];
      shouldNegotiate = true;
    }
  }

  const preferred = modelOptions.modelName;

  let modelFound;
  let modelNameNegotiated;

  if (shouldNegotiate) {
    modelFound = modelService.negotiateModel(preferred, negotiation);
    modelNameNegotiated = modelFound?.name;
  } else {
    modelNameNegotiated = modelOptions.modelName;
    modelFound = modelService.getModel(modelNameNegotiated);
  }

  // Telemetry: model selection
  const emitter = createProgressEmitter('llm', options.onProgress, options);
  const modelSource = shouldNegotiate
    ? ModelSource.negotiated
    : modelOptions.modelName
      ? ModelSource.config
      : ModelSource.default;

  emitter.metrics({
    event: TelemetryEvent.llmModel,
    model: modelNameNegotiated,
    provider: modelFound?.provider || 'openai',
    source: modelSource,
    negotiation: shouldNegotiate ? negotiation : undefined,
    preferred: modelOptions.modelName,
  });

  // Log start event with model information
  const promptLength = Array.isArray(prompt)
    ? prompt.reduce((sum, block) => sum + (block.type === 'text' ? block.text.length : 0), 0)
    : prompt.length;
  if (logger?.info) {
    logger.info({
      event: 'llm:start',
      promptLength,
      model: modelNameNegotiated,
    });
  }

  // Use model-specific API URL and key if defined, otherwise fall back to defaults
  const defaultModel = modelService.getDefaultModel();
  const apiUrl = modelFound?.apiUrl || defaultModel?.apiUrl;
  const apiKey = modelFound?.apiKey || defaultModel?.apiKey;

  const requestConfig = modelService.getRequestConfig({
    prompt,
    ...modelOptions,
    modelName: modelNameNegotiated,
  });

  // Structured output fallback for models that can't do response_format (e.g. local sensitive models)
  const needsJsonExtraction =
    modelFound.structuredOutput === false && !!requestConfig.response_format;
  let fetchConfig = requestConfig;

  if (needsJsonExtraction) {
    const schema = requestConfig.response_format?.json_schema?.schema;
    const schemaInstruction = schema
      ? `${onlyJSON} ${contentIsSchema} ${asXML(JSON.stringify(schema), { tag: 'json-schema--do-not-output' })}`
      : onlyJSON;

    // Augment the last user message with JSON format instructions
    const appendInstruction = (content) => {
      if (Array.isArray(content)) {
        return [...content, { type: 'text', text: schemaInstruction }];
      }
      return `${content}\n\n${schemaInstruction}`;
    };
    const messages =
      requestConfig.messages?.map((msg, i, arr) =>
        i === arr.length - 1 && msg.role === 'user'
          ? { ...msg, content: appendInstruction(msg.content) }
          : msg
      ) ?? requestConfig.messages;

    // Build fetch config without response_format
    // eslint-disable-next-line no-unused-vars
    const { response_format: _rf, ...rest } = requestConfig;
    fetchConfig = { ...rest, messages };
  }

  // Check if caching is disabled — per-call option takes precedence over environment variable
  const cacheEnabled = await getOption('cacheEnabled', options, undefined);
  const cachingDisabled =
    cacheEnabled === false ||
    (cacheEnabled === undefined && configGet('VERBLETS_DISABLE_CACHE') === true);
  const cacheTTL = await getOption('cacheTTL', options, undefined);

  let cacheResult = null;
  let cache = null;

  if (!cachingDisabled) {
    cache = await getRedis();
    const { result } = await getPromptResult(cache, requestConfig);
    cacheResult = result;
  }

  onBeforeRequest({
    isCached: !!cacheResult,
    debugPrompt,
    prompt,
    requestConfig,
  });

  try {
    let result = cacheResult;
    if (!cacheResult || forceQuery) {
      // Use custom requestTimeout from modelOptions if provided, otherwise use model default
      const requestTimeout =
        modelOptions.requestTimeout || modelService.getModel(modelNameNegotiated).requestTimeout;

      const timeoutController = new TimedAbortController(requestTimeout);

      // Delegate request building to the provider adapter
      const providerName = modelFound.provider || 'openai';
      const provider = getProvider(providerName);
      const { url: fetchUrl, fetchOptions } = provider.buildRequest(
        apiUrl,
        apiKey,
        modelFound.endpoint,
        fetchConfig
      );

      // Configure abort signal (see function documentation for browser compatibility notes)
      configureAbortSignal(fetchOptions, abortSignal, timeoutController);

      const response = await fetch(fetchUrl, fetchOptions);

      // Timer's only purpose is to abort the fetch — clear it as soon as we have a response
      timeoutController.clearTimeout();

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json') && !contentType.includes('text/json')) {
        const bodyPreview = await response.text().then((t) => t.slice(0, 200));
        const err = new Error(
          `Completions request [error]: expected JSON response but got ${contentType || 'unknown content-type'} (status: ${response.status}, body: ${bodyPreview})`
        );
        err.httpStatus = response.status;
        throw err;
      }

      const rawJson = await response.json();

      if (!response.ok) {
        // Anthropic uses error.message, OpenAI uses error.message — both work
        const errorMessage = rawJson?.error?.message || rawJson?.error?.type || 'Unknown error';
        const vars = [`status: ${response?.status}`, `type: ${rawJson?.error?.type}`].join(', ');
        const err = new Error(`Completions request [error]: ${errorMessage} (${vars})`);
        err.httpStatus = response.status;
        err.errorType = rawJson?.error?.type;
        throw err;
      }

      // Normalize response to canonical (OpenAI) shape
      result = provider.parseResponse(rawJson);

      // Only cache the result if caching is not disabled
      if (!cachingDisabled && cache) {
        await setPromptResult(
          cache,
          requestConfig,
          result,
          ...(cacheTTL !== undefined ? [cacheTTL] : [])
        );
      }
    }

    // Extract JSON from freeform text for models without structured output support
    if (needsJsonExtraction && typeof result.choices?.[0]?.message?.content === 'string') {
      const cleaned = stripResponse(result.choices[0].message.content);
      try {
        const extracted = extractJson(cleaned);
        result = {
          ...result,
          choices: [
            {
              ...result.choices[0],
              message: { ...result.choices[0].message, content: JSON.stringify(extracted) },
            },
          ],
        };
      } catch {
        // extractJson failed — shapeOutput will throw, letting retry re-attempt
      }
    }

    const resultShaped = shapeOutput(result, requestConfig, {
      skipResponseParse,
      unwrapValues,
      unwrapCollections,
    });

    onAfterRequest({
      debugResult,
      isCached: !!cacheResult,
      prompt,
      requestConfig,
      result,
      resultShaped,
    });

    // Log end of llm execution
    if (logger?.info) {
      logger.info({
        event: 'llm:end',
        duration: Date.now() - startTime,
        cached: !!cacheResult,
        model: modelNameNegotiated,
      });
    }

    // Telemetry: successful LLM call
    const callAttrs = {
      model: modelNameNegotiated,
      provider: modelFound.provider || 'openai',
      cached: !!cacheResult,
    };

    emitter.metrics({
      event: TelemetryEvent.llmCall,
      status: LlmStatus.success,
      ...callAttrs,
    });

    const usage = result?.usage;
    const inputTokens = usage?.prompt_tokens ?? 0;
    const outputTokens = usage?.completion_tokens ?? 0;

    emitter.measure({
      metric: Metric.tokenUsage,
      tokenType: TokenType.input,
      value: inputTokens,
      ...callAttrs,
    });
    emitter.measure({
      metric: Metric.tokenUsage,
      tokenType: TokenType.output,
      value: outputTokens,
      ...callAttrs,
    });
    emitter.measure({
      metric: Metric.llmDuration,
      value: Date.now() - startTime,
      ...callAttrs,
    });

    return resultShaped;
  } catch (err) {
    // Telemetry: failed LLM call
    const errAttrs = {
      model: modelNameNegotiated,
      provider: modelFound.provider || 'openai',
    };

    emitter.metrics({
      event: TelemetryEvent.llmCall,
      status: LlmStatus.error,
      ...errAttrs,
      error: {
        message: err.message,
        httpStatusCode: err.httpStatus,
        type: err.errorType,
      },
    });

    emitter.measure({
      metric: Metric.llmDuration,
      value: Date.now() - startTime,
      ...errAttrs,
    });
    throw err;
  }
};

export function buildVisionPrompt(text, images) {
  return [
    { type: 'text', text },
    ...images.map((img) => ({ type: 'image', data: img.data, mediaType: img.mediaType })),
  ];
}

export default run;
