import fetch from 'node-fetch';

import {
  apiKey,
  apiUrl,
  debugPromptGlobally,
  debugPromptGloballyIfChanged,
  debugResultGlobally,
  debugResultGloballyIfChanged,
} from '../../constants/openai.js';
import anySignal from '../any-signal/index.js';
import {
  get as getPromptResult,
  set as setPromptResult,
} from '../prompt-cache/index.js';
import TimedAbortController from '../timed-abort-controller/index.js';
import modelService from '../../services/llm-model/index.js';
import { getClient as getRedis } from '../../services/redis/index.js';

const shapeOutputDefault = (result) => {
  // GPT-4
  if (result.choices[0].message) {
    return result.choices[0].message.content.trim();
  }
  return result.choices[0].text.trim();
};

const onBeforeRequestDefault = ({ debugPrompt, isCached, prompt }) => {
  if (
    debugPrompt ||
    debugPromptGlobally ||
    (debugPromptGloballyIfChanged && !isCached)
  ) {
    console.error(`+++ DEBUG PROMPT +++`);
    console.error(prompt);
    console.error('+++ DEBUG PROMPT END +++');
  }
};

const onAfterRequestDefault = ({ debugResult, isCached, resultShaped }) => {
  if (
    debugResult ||
    debugResultGlobally ||
    (debugResultGloballyIfChanged && !isCached)
  ) {
    console.error(`+++ DEBUG RESULT +++`);
    console.error(resultShaped);
    console.error('+++ DEBUG RESULT END +++');
  }
};

export const run = async (prompt, options = {}) => {
  const {
    abortSignal,
    debugPrompt,
    debugResult,
    forceQuery,
    modelOptions = {},
    onBeforeRequest = onBeforeRequestDefault,
    onAfterRequest = onAfterRequestDefault,
    shapeOutput = shapeOutputDefault,
  } = options;

  const modelFound = modelService.getModel(modelOptions.modelName);

  const requestConfig = modelService.getRequestConfig({
    prompt,
    ...modelOptions,
  });

  const cache = await getRedis();
  const { result: cacheResult } = await getPromptResult(cache, requestConfig);

  onBeforeRequest({
    isCached: !!cacheResult,
    debugPrompt,
    prompt,
    requestConfig,
  });

  let result = cacheResult;
  if (!cacheResult || forceQuery) {
    const timeoutController = new TimedAbortController(
      modelService.getModel(modelOptions.modelName).requestTimeout
    );

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
      const vars = [
        `status: ${response?.status}`,
        `type: ${result?.error?.type}`,
      ].join(', ');
      throw new Error(
        `Completions request [error]: ${result?.error?.message} (${vars})`
      );
    }

    timeoutController.clearTimeout();

    await setPromptResult(cache, requestConfig, result);
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
