import fetch from 'node-fetch';
import chai from 'chai';

import * as dotenv from 'dotenv';
dotenv.config();

const expect = chai.expect;

const Model = {
  textDavinci003: 'text-davinci-003',
};

const defaultModel = Model.textDavinci003;
expect(process.env.OPENAI_API_KEY).to.exist;
const apiKey = process.env.OPENAI_API_KEY;

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

  if (returnWholeResult) {
    return result;
  }
  if (returnAllChoices) {
    return result.choices.map(c => c.text)
  }
  return result.choices[0].text.trim();
};

export default run;
