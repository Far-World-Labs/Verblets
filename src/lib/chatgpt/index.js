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

const shapeOutputDefault = (result) => {
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
    return result.choices[0].message.content.trim();
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
    const timeoutController = new TimedAbortController(
      modelService.getModel(modelNameNegotiated).requestTimeout
    );

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

  const resultShaped = shapeOutput(result);

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
