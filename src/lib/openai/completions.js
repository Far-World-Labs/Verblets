import crypto from 'crypto'
import fetch from 'node-fetch';
import { encoding_for_model as encodingForModel } from '@dqbd/tiktoken';

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
}

export const run = async (prompt, options={}) => {
  const {
    debugPrompt,
    debugResult,
    forceQuery,
    frequencyPenalty=frequencyPenaltyConfig,
    maxTokens=maxTokensConfig,
    model=defaultModel.name,
    presencePenalty=presencePenaltyConfig,
    returnAllChoices,
    returnWholeResult,
    temperature=temperatureConfig,
    topP=topPConfig,
  } = options;

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

  // To get the tokeniser corresponding to a specific model in the OpenAI API:
  const enc = encodingForModel(modelConfigFound.name);

  const promptTokenCount = enc.encode(prompt).length;

  const tokensForCompletionAvailable = modelConfigFound.maxTokens - promptTokenCount;

  const tokensForCompletion = Math.min(tokensForCompletionAvailable, maxTokens);

  const data = {
    model: modelConfigFound.name,
    temperature,
    max_tokens: tokensForCompletion,
    top_p: topP,
    frequency_penalty: frequencyPenalty,
    presence_penalty: presencePenalty,
  };

  const hash = crypto.createHash('sha256').update(prompt+JSON.stringify(data)).digest('hex').toString();
  let result;
  let foundInRedis;
  try {
    const resultFromRedis = await redis.get(hash);
    foundInRedis = resultFromRedis !== null;
    if (foundInRedis) {
      result = JSON.parse(resultFromRedis);
    }
  } catch (error) {
    console.error(`Completions request [error]: ${error.message}`)
  }

  if (debugPrompt || debugPromptGlobally || (debugPromptGloballyIfChanged && !foundInRedis)) {
    console.error(`+++ DEBUG PROMPT +++`);
    console.error(prompt);
    console.error('+++ DEBUG PROMPT END +++');
  }

  if (!foundInRedis || forceQuery) {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ prompt, ...data })
    });

    if (!response.ok) {
      const body = await response.json();
      throw new Error(`Completions request [error]: ${body.error.message} (status: ${response.status}, type: ${body.error.type})`);
    }

    result = await response.json();

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
