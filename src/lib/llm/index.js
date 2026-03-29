import fetch from 'node-fetch';

import { models } from '../../constants/model-mappings.js';
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
import createProgressEmitter, { storeContent } from '../progress/index.js';
import {
  DomainEvent,
  TelemetryEvent,
  Level,
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
 *
 * @param {Object} fetchOptions - The fetch options object to modify
 * @param {AbortSignal} [abortSignal] - Optional user-provided abort signal
 * @param {TimedAbortController} timeoutController - The timeout controller for the request
 */
function configureAbortSignal(fetchOptions, abortSignal, timeoutController) {
  if (typeof window === 'undefined') {
    if (abortSignal) {
      fetchOptions.signal = anySignal([abortSignal, timeoutController.signal]);
    } else {
      fetchOptions.signal = timeoutController.signal;
    }
  }
}

/**
 * Build a response_format object for structured JSON output.
 *
 * @param {string} name - Schema name
 * @param {object} schema - JSON Schema object
 * @returns {{ type: 'json_schema', json_schema: { name: string, schema: object } }}
 */
export const jsonSchema = (name, schema) => ({
  type: 'json_schema',
  json_schema: { name, schema },
});

export const isSimpleCollectionSchema = (responseFormat) => {
  const schema = responseFormat?.json_schema?.schema;
  if (!schema || schema.type !== 'object') return false;

  const props = schema.properties;
  const propKeys = Object.keys(props || {});

  return propKeys.length === 1 && propKeys[0] === 'items' && props.items?.type === 'array';
};

export const isSimpleValueSchema = (responseFormat) => {
  const schema = responseFormat?.json_schema?.schema;
  if (!schema || schema.type !== 'object') return false;

  const props = schema.properties;
  const propKeys = Object.keys(props || {});

  return propKeys.length === 1 && propKeys[0] === 'value';
};

const shapeOutputDefault = (result, requestConfig, options = {}) => {
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
    if (typeof content === 'object' && content !== null) {
      return content;
    }
    if (
      typeof content === 'string' &&
      requestConfig?.response_format &&
      !options.skipResponseParse
    ) {
      const trimmed = content.trim();
      try {
        const parsed = JSON.parse(trimmed);

        const unwrapCollections = options.unwrapCollections !== false;
        if (unwrapCollections && isSimpleCollectionSchema(requestConfig.response_format)) {
          if (parsed?.items && Array.isArray(parsed.items)) {
            return parsed.items;
          }
        }

        const unwrapValues = options.unwrapValues !== false;
        if (unwrapValues && isSimpleValueSchema(requestConfig.response_format)) {
          if ('value' in parsed) {
            return parsed.value;
          }
        }

        return parsed;
      } catch {
        throw new Error(
          `Structured output parse failed — model returned non-JSON: ${trimmed.slice(0, 200)}`
        );
      }
    }
    return content.trim();
  }
  return result.choices[0].text.trim();
};

// Keys that belong to the model/request layer (as opposed to callLlm control keys).
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
  let options;
  if (typeof config === 'string') {
    options = { modelName: config };
  } else {
    options = config;
  }

  const {
    abortSignal,
    forceQuery: _forceQuery,
    llm,
    onBeforeRequest,
    onAfterRequest,
    shapeOutput = shapeOutputDefault,
    skipResponseParse,
    unwrapValues,
    unwrapCollections,
    promptTrace,
    contentStore,
  } = options;
  const forceQuery = await getOption('forceQuery', options, false);

  // Build modelOptions from flat config, resolving through context system.
  const modelOptions = { ...normalizeLlm(llm) };
  for (const key of MODEL_KEYS) {
    const resolved = await getOption(key, options, undefined);
    if (resolved !== undefined) modelOptions[key] = resolved;
  }
  for (const key of CAPABILITY_KEYS) {
    const resolved = await getOption(key, options, undefined);
    if (resolved !== undefined) modelOptions[key] = resolved;
  }

  const startTime = Date.now();

  const modelOptionsWithOverrides = modelService.applyGlobalOverrides(modelOptions);

  const negotiation = {};
  let shouldNegotiate = false;

  if (modelOptionsWithOverrides.negotiate) {
    Object.assign(negotiation, modelOptionsWithOverrides.negotiate);
    shouldNegotiate = true;
  }

  for (const key of CAPABILITY_KEYS) {
    if (key in modelOptionsWithOverrides) {
      negotiation[key] = modelOptionsWithOverrides[key];
      shouldNegotiate = true;
    }
  }

  const negotiationFromGlobalOverride = modelService.getGlobalOverride('negotiate');
  const preferred = negotiationFromGlobalOverride ? null : modelOptionsWithOverrides.modelName;

  const modelNameNegotiated = shouldNegotiate
    ? modelService.negotiateModel(preferred, negotiation)
    : modelOptionsWithOverrides.modelName;

  const modelFound = modelService.getModel(modelNameNegotiated);

  // Model selection — domain event
  const emitter = createProgressEmitter('llm', options.onProgress, options);
  const modelSource = shouldNegotiate
    ? ModelSource.negotiated
    : modelOptionsWithOverrides.modelName
      ? ModelSource.config
      : ModelSource.default;

  emitter.emit({
    event: DomainEvent.llmModel,
    level: Level.info,
    message: `Model selected: ${modelNameNegotiated} (${modelSource})`,
    model: modelNameNegotiated,
    provider: modelFound.provider || 'openai',
    source: modelSource,
    negotiation: shouldNegotiate ? negotiation : undefined,
    preferred: negotiationFromGlobalOverride ? undefined : modelOptionsWithOverrides.modelName,
    promptLength: typeof prompt === 'string' ? prompt.length : undefined,
  });

  const apiUrl = modelFound?.apiUrl || models.fastGood.apiUrl;
  const apiKey = modelFound?.apiKey || models.fastGood.apiKey;

  const requestConfig = modelService.getRequestConfig({
    prompt,
    ...modelOptionsWithOverrides,
    modelName: modelNameNegotiated,
  });

  const needsJsonExtraction =
    modelFound.structuredOutput === false && !!requestConfig.response_format;
  let fetchConfig = requestConfig;

  if (needsJsonExtraction) {
    const schema = requestConfig.response_format?.json_schema?.schema;
    const schemaInstruction = schema
      ? `${onlyJSON} ${contentIsSchema} ${asXML(JSON.stringify(schema), { tag: 'json-schema--do-not-output' })}`
      : onlyJSON;

    const messages =
      requestConfig.messages?.map((msg, i, arr) =>
        i === arr.length - 1 && msg.role === 'user'
          ? { ...msg, content: `${msg.content}\n\n${schemaInstruction}` }
          : msg
      ) ?? requestConfig.messages;

    // eslint-disable-next-line no-unused-vars
    const { response_format: _rf, ...rest } = requestConfig;
    fetchConfig = { ...rest, messages };
  }

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

  if (onBeforeRequest) {
    onBeforeRequest({
      isCached: !!cacheResult,
      prompt,
      requestConfig,
    });
  }

  try {
    let result = cacheResult;
    if (!cacheResult || forceQuery) {
      const requestTimeout =
        modelOptionsWithOverrides.requestTimeout ||
        modelService.getModel(modelNameNegotiated).requestTimeout;

      const timeoutController = new TimedAbortController(requestTimeout);

      const providerName = modelFound.provider || 'openai';
      const provider = getProvider(providerName);
      const { url: fetchUrl, fetchOptions } = provider.buildRequest(
        apiUrl,
        apiKey,
        modelFound.endpoint,
        fetchConfig
      );

      configureAbortSignal(fetchOptions, abortSignal, timeoutController);

      const response = await fetch(fetchUrl, fetchOptions);

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
        const errorMessage = rawJson?.error?.message || rawJson?.error?.type || 'Unknown error';
        const vars = [`status: ${response?.status}`, `type: ${rawJson?.error?.type}`].join(', ');
        const err = new Error(`Completions request [error]: ${errorMessage} (${vars})`);
        err.httpStatus = response.status;
        err.errorType = rawJson?.error?.type;
        throw err;
      }

      result = provider.parseResponse(rawJson);

      if (!cachingDisabled && cache) {
        await setPromptResult(
          cache,
          requestConfig,
          result,
          ...(cacheTTL !== undefined ? [cacheTTL] : [])
        );
      }
    }

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

    if (onAfterRequest) {
      onAfterRequest({
        isCached: !!cacheResult,
        prompt,
        requestConfig,
        result,
        resultShaped,
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

    // Prompt trace — conditional, uses content store for large payloads
    if (promptTrace) {
      const sid = options.spanId || 'unknown';
      const traceKey = `prompt:${sid}:${Date.now()}`;
      const promptData =
        typeof prompt === 'string' ? prompt : JSON.stringify(requestConfig.messages);
      const responseData =
        typeof resultShaped === 'string' ? resultShaped : JSON.stringify(resultShaped);

      emitter.emit({
        event: DomainEvent.promptTrace,
        level: Level.debug,
        message: `LLM ${cacheResult ? 'cache hit' : 'call'}: ${modelNameNegotiated}`,
        model: modelNameNegotiated,
        provider: modelFound.provider || 'openai',
        cached: !!cacheResult,
        prompt: await storeContent(contentStore, `${traceKey}:input`, promptData),
        response: await storeContent(contentStore, `${traceKey}:output`, responseData),
      });
    }

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

    // Prompt trace on error — capture prompt without response
    // Wrapped in try/catch so a content store failure never masks the real LLM error
    if (promptTrace) {
      try {
        const sid = options.spanId || 'unknown';
        const traceKey = `prompt:${sid}:${Date.now()}`;
        const promptData =
          typeof prompt === 'string' ? prompt : JSON.stringify(requestConfig.messages);

        emitter.emit({
          event: DomainEvent.promptTrace,
          level: Level.debug,
          message: `LLM error: ${modelNameNegotiated}: ${err.message}`,
          model: modelNameNegotiated,
          provider: modelFound.provider || 'openai',
          cached: false,
          prompt: await storeContent(contentStore, `${traceKey}:input`, promptData),
          error: { message: err.message, httpStatus: err.httpStatus, type: err.errorType },
        });
      } catch {
        // Tracing must not mask the original error.
      }
    }

    throw err;
  }
};

export default run;
