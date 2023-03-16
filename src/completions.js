import fetch from 'node-fetch';
import chai from 'chai';
import getRedis from './lib/redis/index.js';
import crypto from 'crypto'

const expect = chai.expect;

const Model = {
  textDavinci003: 'text-davinci-003',
};

const defaultModel = Model.textDavinci003;
expect(process.env.OPENAI_API_KEY).to.exist;
const apiKey = process.env.OPENAI_API_KEY;

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

const run = async (prompt, {
  model=defaultModel,
  temperature=1,
  topP=0.5,
  maxTokens=250,
  frequencyPenalty=0,
  presencePenalty=0,
  returnAllChoices,
  returnWholeResult,
}={}) => {
  const apiUrl = 'https://api.openai.com/v1/completions';
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  const redis = await getRedis();

  const hash = crypto.createHash('sha256').update(prompt).digest('hex').toString();
  let resultExisting
  try {
    const resultFromRedis = await redis.get(hash);
    if (resultFromRedis !== null) {
      resultExisting = JSON.parse(resultFromRedis);
    }
  } catch (error) {
    console.error(`Completions request [error]: ${error.message}`)
  }

  if (resultExisting) {
    // console.log(prompt, resultExisting);
    return shapeOutput(resultExisting, {
      returnWholeResult,
      returnAllChoices,
    });
  }

  // console.error(prompt);

  const data = {
    prompt,
    model,
    temperature,
    max_tokens: maxTokens,
    top_p: topP,
    frequency_penalty: frequencyPenalty,
    presence_penalty: presencePenalty,
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const body = await response.json();
    throw new Error(`Completions request [error]: ${body.error.message} (status: ${response.status}, type: ${body.error.type})`);
  }

  const result = await response.json();
  // console.error(result);


  const secondsInDay = 60 * 60 * 24;
  await redis.set(hash, JSON.stringify(result), { EX: secondsInDay });

  return shapeOutput(result, {
    returnWholeResult,
    returnAllChoices,
  });
};

export default run;
