import crypto from 'node:crypto';
import fetch from 'node-fetch';

import {
  apiKey,
  cacheTTL,
  debugPromptGlobally,
  debugPromptGloballyIfChanged,
  debugResultGlobally,
  debugResultGloballyIfChanged,
  frequencyPenalty as frequencyPenaltyConfig,
  presencePenalty as presencePenaltyConfig,
  temperature as temperatureConfig,
  topP as topPConfig,
} from '../../constants/openai.js';
import modelService from '../../services/llm-model/index.js';
import { getClient as getRedis } from '../../services/redis/index.js';

const shapeOutput = (result, { returnWholeResult, returnAllChoices }) => {
  if (returnWholeResult) {
    return result;
  }
  if (returnAllChoices) {
    return result.choices.map((c) => c.text);
  }
  // GPT-4
  if (result.choices[0].message) {
    return result.choices[0].message.content.trim();
  }
  return result.choices[0].text.trim();
};

export const run = async (promptInitial, options) => {
  const {
    abortSignal: abortSignalInitial,
    debugPrompt,
    debugResult,
    deleteCache,
    forceQuery,
    frequencyPenalty = frequencyPenaltyConfig,
    maxTokens,
    modelName,
    presencePenalty = presencePenaltyConfig,
    prompt: promptOptions,
    requestTimeout,
    returnAllChoices,
    returnWholeResult,
    temperature = temperatureConfig,
    topP = topPConfig,
  } = options ?? promptInitial;

  const prompt = promptInitial || promptOptions;

  const apiUrl = 'https://api.openai.com/';
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const redis = await getRedis();

  let modelFound = modelService.getBestAvailableModel();
  if (modelName) {
    modelFound = modelService.getModelByName(modelName);
  }

  let maxTokensFound = maxTokens;
  if (!maxTokens) {
    maxTokensFound = modelFound.maxTokens - modelFound.toTokens(prompt);
  }

  const data = {
    model: modelFound.name,
    temperature,
    max_tokens: maxTokensFound,
    top_p: topP,
    frequency_penalty: frequencyPenalty,
    presence_penalty: presencePenalty,
  };

  const hash = crypto
    .createHash('sha256')
    .update(prompt + JSON.stringify(data))
    .digest('hex')
    .toString();
  let result;
  let foundInRedis;
  try {
    const resultFromRedis = await redis.get(hash);

    foundInRedis = resultFromRedis !== null;
    if (foundInRedis) {
      if (deleteCache) {
        await redis.del(hash);
        foundInRedis = false;
      } else {
        result = JSON.parse(resultFromRedis);
      }
    }
  } catch (error) {
    console.error(`Completions request [error]: ${error.message}`);
  }

  if (
    debugPrompt ||
    debugPromptGlobally ||
    (debugPromptGloballyIfChanged && !foundInRedis)
  ) {
    console.error(`+++ DEBUG PROMPT +++`);
    console.error(prompt);
    console.error('+++ DEBUG PROMPT END +++');
  }

  // request cancelation
  let requestTimeoutFound = requestTimeout;
  if (!requestTimeout) {
    requestTimeoutFound = modelFound.requestTimeout;
  }

  let abortSignal;
  let requestTimeoutId;
  if (!abortSignalInitial && requestTimeoutFound) {
    const aborter = new AbortController();
    abortSignal = aborter.signal;
    requestTimeoutId = setTimeout(() => aborter.abort(), requestTimeoutFound);
  }

  if (!foundInRedis || forceQuery) {
    let requestPrompt = { prompt };
    if (/chat/.test(modelFound.endpoint)) {
      requestPrompt = { messages: [{ role: 'user', content: prompt }] };
    }

    const response = await fetch(`${apiUrl}${modelFound.endpoint}`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ ...requestPrompt, ...data }),
      signal: abortSignal,
    });
    if (!response.ok) {
      const body = await response.json();
      throw new Error(
        `Completions request [error]: ${body.error.message} (status: ${response.status}, type: ${body.error.type})`
      );
    }

    result = await response.json();

    clearTimeout(requestTimeoutId);

    try {
      await redis.set(hash, JSON.stringify(result), { EX: cacheTTL });
    } catch (error) {
      console.error(`Completions request [error]: ${error.message}`);
    }
  }

  const resultShaped = shapeOutput(result, {
    returnWholeResult,
    returnAllChoices,
  });

  if (
    debugResult ||
    debugResultGlobally ||
    (debugResultGloballyIfChanged && !foundInRedis)
  ) {
    console.error(`+++ DEBUG RESULT +++`);
    console.error(resultShaped);
    console.error('+++ DEBUG RESULT END +++');
  }

  return resultShaped;
};

export default run;
