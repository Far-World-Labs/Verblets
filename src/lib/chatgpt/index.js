import fetch from 'node-fetch';

import {
  debugPromptGlobally,
  debugPromptGloballyIfChanged,
  debugResultGlobally,
  debugResultGloballyIfChanged,
  models,
} from '../../constants/models.js';
import anySignal from '../any-signal/index.js';
import { get as getPromptResult, set as setPromptResult } from '../prompt-cache/index.js';
import TimedAbortController from '../timed-abort-controller/index.js';
import modelService from '../../services/llm-model/index.js';
import { getClient as getRedis } from '../../services/redis/index.js';

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
        // If parsing fails, return the trimmed string
        return trimmed;
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

export const run = async (prompt, config = {}) => {
  // Handle config parameter - can be string (model name) or object (full options)
  let options;
  if (typeof config === 'string') {
    options = { modelOptions: { modelName: config } };
  } else {
    options = config;
  }

  const {
    abortSignal,
    debugPrompt,
    debugResult,
    forceQuery,
    modelOptions = {},
    onAfterRequest = onAfterRequestDefault,
    onBeforeRequest = onBeforeRequestDefault,
    shapeOutput = shapeOutputDefault,
    skipResponseParse,
    unwrapValues,
    unwrapCollections,
  } = options;

  // Apply global overrides to model options
  const modelOptionsWithOverrides = modelService.applyGlobalOverrides(modelOptions);

  // Check if negotiation was applied via global override
  const negotiationFromGlobalOverride = modelService.getGlobalOverride('negotiate');

  const modelNameNegotiated = modelOptionsWithOverrides.negotiate
    ? modelService.negotiateModel(
        // If negotiation came from global override, don't use preferred model
        negotiationFromGlobalOverride ? null : modelOptionsWithOverrides.modelName,
        modelOptionsWithOverrides.negotiate
      )
    : modelOptionsWithOverrides.modelName;

  const modelFound = modelService.getModel(modelNameNegotiated);

  // Use model-specific API URL and key if defined, otherwise fall back to defaults
  const apiUrl = modelFound?.apiUrl || models.fastGood.apiUrl;
  const apiKey = modelFound?.apiKey || models.fastGood.apiKey;

  const requestConfig = modelService.getRequestConfig({
    prompt,
    ...modelOptionsWithOverrides,
    modelName: modelNameNegotiated,
  });

  // Check if caching is disabled via environment variable
  const cachingDisabled = process.env.DISABLE_CACHE === 'true';

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

  let result = cacheResult;
  if (!cacheResult || forceQuery) {
    // Use custom requestTimeout from modelOptions if provided, otherwise use model default
    const requestTimeout =
      modelOptionsWithOverrides.requestTimeout ||
      modelService.getModel(modelNameNegotiated).requestTimeout;

    const timeoutController = new TimedAbortController(requestTimeout);

    // console.log(requestConfig, `${apiUrl}${modelFound.endpoint}`)

    const response = await fetch(`${apiUrl}${modelFound.endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestConfig),
      signal: anySignal([abortSignal, timeoutController.signal]),
    });

    result = await response.json();

    if (!response.ok) {
      const vars = [`status: ${response?.status}`, `type: ${result?.error?.type}`].join(', ');
      throw new Error(`Completions request [error]: ${result?.error?.message} (${vars})`);
    }

    timeoutController.clearTimeout();

    // Only cache the result if caching is not disabled
    if (!cachingDisabled && cache) {
      await setPromptResult(cache, requestConfig, result);
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

  return resultShaped;
};

export default run;
