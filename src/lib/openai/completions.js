import crypto from 'crypto'
import fetch from 'node-fetch';

import {
  apiKey,
  cacheTTL,
  debugPromptGlobally,
  debugPromptGloballyIfChanged,
  debugResultGlobally,
  debugResultGloballyIfChanged,
  defaultModel,
  frequencyPenalty as frequencyPenaltyConfig,
  maxTokens as maxTokensConfig,
  models,
  presencePenalty as presencePenaltyConfig,
  requestTimeout as requestTimeoutConfig,
  temperature as temperatureConfig,
  topP as topPConfig,
} from '../../constants/openai.js';
import getRedis from '../redis/index.js';

const shapeOutput = (result, {
  returnWholeResult,
  returnAllChoices,
}) => {
  if (returnWholeResult) {
    return result;
  }
  if (returnAllChoices) {
    return result.choices.map(c => c.text)
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
    frequencyPenalty=frequencyPenaltyConfig,
    maxTokens=maxTokensConfig,
    model=defaultModel.name,
    presencePenalty=presencePenaltyConfig,
    prompt: promptOptions,
    requestTimeout=requestTimeoutConfig,
    returnAllChoices,
    returnWholeResult,
    temperature=temperatureConfig,
    topP=topPConfig,
  } = options ?? promptInitial;

  const prompt = promptInitial || promptOptions;

  const apiUrl = 'https://api.openai.com/v1/completions';
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
  const redis = await getRedis();

  let modelConfigFound = models
      .find(m => m.name === model)

  if (!modelConfigFound) {
    console.error(`Completions request [error]: Model not supported. Falling back to ${defaultModel.name}. (model: ${model})`);
    modelConfigFound = models
      .find(m => m.name === defaultModel.name);
  }

  const data = {
    model: modelConfigFound.name,
    temperature,
    max_tokens: maxTokens,
    top_p: topP,
    frequency_penalty: frequencyPenalty,
    presence_penalty: presencePenalty,
  };

  const hash = crypto.createHash('sha256').update(prompt+JSON.stringify(data)).digest('hex').toString();
  let result;
  let foundInRedis;
  try {
    let resultFromRedis = await redis.get(hash);

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
    console.error(`Completions request [error]: ${error.message}`)
  }

  if (debugPrompt || debugPromptGlobally || (debugPromptGloballyIfChanged && !foundInRedis)) {
    console.error(`+++ DEBUG PROMPT +++`);
    console.error(prompt);
    console.error('+++ DEBUG PROMPT END +++');
  }

  // request cancelation
  let abortSignal;
  let requestTimeoutId;
  if (!abortSignalInitial && requestTimeout) {
    const aborter = new AbortController();
    abortSignal = aborter.signal;
    requestTimeoutId = setTimeout(() => aborter.abort(), requestTimeout);
  }

  if (!foundInRedis || forceQuery) {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ prompt, ...data }),
      signal: abortSignal,
    });
    if (!response.ok) {
      const body = await response.json();
      throw new Error(`Completions request [error]: ${body.error.message} (status: ${response.status}, type: ${body.error.type})`);
    }

    result = await response.json();

    clearTimeout(requestTimeoutId);

    try {
      await redis.set(hash, JSON.stringify(result), { EX: cacheTTL });
    } catch (error) {
      console.error(`Completions request [error]: ${error.message}`)
    }
  }

  const resultShaped = shapeOutput(result, {
    returnWholeResult,
    returnAllChoices,
  });

  if (debugResult || debugResultGlobally || (debugResultGloballyIfChanged && !foundInRedis)) {
    console.error(`+++ DEBUG RESULT +++`);
    console.error(resultShaped);
    console.error('+++ DEBUG RESULT END +++');
  }

  return resultShaped;
};

export default run;
