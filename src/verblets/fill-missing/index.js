import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import { constants as promptConstants, wrapVariable } from '../../prompts/index.js';

const { tryCompleteData, contentIsMain, asJSON } = promptConstants;

// Determine directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getFillMissingSchema() {
  const schemaPath = path.join(__dirname, 'fill-missing-result.json');
  return JSON.parse(await fs.readFile(schemaPath, 'utf8'));
}

async function createModelOptions(llm = 'fastGoodCheap') {
  const schema = await getFillMissingSchema();

  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: 'fill_missing_result',
      schema,
    },
  };

  if (typeof llm === 'string') {
    return {
      modelName: llm,
      response_format: responseFormat,
    };
  }
  return {
    ...llm,
    response_format: responseFormat,
  };
}

export const buildPrompt = (text) =>
  `${tryCompleteData} ${contentIsMain} ${wrapVariable(text, { tag: 'input' })}\n\n` +
  `Return JSON with "template" and "variables" where each variable has "original", ` +
  `"candidate", and "confidence". ${asJSON}`;

export default async function fillMissing(text, config = {}) {
  const { llm, ...options } = config;
  const prompt = buildPrompt(text);
  const modelOptions = await createModelOptions(llm);
  const response = await chatGPT(prompt, { modelOptions, ...options });
  try {
    return JSON.parse(stripResponse(response));
  } catch {
    return { template: text, variables: {} };
  }
}
