import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chatGPT from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';

const { onlyJSONArray } = promptConstants;

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load the JSON schema for score results
 * @returns {Promise<Object>} JSON schema for validation
 */
async function getScoreSchema() {
  const schemaPath = path.join(__dirname, 'score-result.json');
  return JSON.parse(await fs.readFile(schemaPath, 'utf8'));
}

/**
 * Create model options for structured outputs
 * @param {string|Object} llm - LLM model name or configuration object
 * @returns {Promise<Object>} Model options for chatGPT
 */
async function createModelOptions(llm = 'fastGoodCheap') {
  const schema = await getScoreSchema();

  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: 'score_result',
      schema,
    },
  };

  if (typeof llm === 'string') {
    return {
      modelName: llm,
      response_format: responseFormat,
    };
  } else {
    return {
      ...llm,
      response_format: responseFormat,
    };
  }
}

async function scoreBatch(items, instructions, reference = [], config = {}) {
  const { llm, ...options } = config;
  const listBlock = asXML(items.join('\n'), { tag: 'items' });
  const refBlock = reference.length
    ? `\nCalibration examples (score - text):\n${asXML(
        reference.map((r) => `${r.score} - ${r.item}`).join('\n'),
        { tag: 'reference' }
      )}`
    : '';

  const prompt =
    `Score each line in <items> from 0 (worst) to 10 (best) based on: ${instructions}.` +
    `\nRespond with a JSON object containing a "scores" array of numbers in the same order.` +
    `${refBlock}\n${onlyJSONArray}\n${listBlock}`;

  const modelOptions = await createModelOptions(llm);
  const response = await chatGPT(prompt, {
    modelOptions,
    ...options,
  });

  // With structured outputs, response should already be parsed and validated
  const parsed = typeof response === 'string' ? JSON.parse(response) : response;
  // Extract scores from the object structure
  const arr = parsed?.scores || parsed;

  if (!Array.isArray(arr)) {
    throw new Error('Score batch mismatch: expected array of scores');
  }

  // Handle length mismatch gracefully
  if (arr.length !== items.length) {
    if (arr.length < items.length) {
      // Pad with neutral scores (5) if we got fewer scores than items
      const paddedScores = [...arr];
      while (paddedScores.length < items.length) {
        paddedScores.push(5);
      }
      return paddedScores.map((n) => Number(n));
    } else {
      // Truncate if we got more scores than items
      return arr.slice(0, items.length).map((n) => Number(n));
    }
  }

  return arr.map((n) => Number(n));
}

export default async function score(list, instructions, config = {}) {
  const { chunkSize = 10, examples, llm, stopOnThreshold, ...options } = config;
  if (!Array.isArray(list) || list.length === 0) {
    return { scores: [], reference: [] };
  }

  const firstScores = [];
  for (let i = 0; i < list.length; i += chunkSize) {
    // eslint-disable-next-line no-await-in-loop
    const scores = await scoreBatch(list.slice(i, i + chunkSize), instructions, [], {
      llm,
      ...options,
    });
    firstScores.push(...scores);

    // Simple early termination check
    if (stopOnThreshold !== undefined) {
      const belowThreshold = scores.findIndex((score) => score < stopOnThreshold);
      if (belowThreshold >= 0) {
        const stopIndex = i + belowThreshold;
        return {
          scores: firstScores.slice(0, stopIndex + 1),
          reference: [],
          stoppedAt: stopIndex,
        };
      }
    }
  }

  const scored = list.map((item, idx) => ({ item, score: firstScores[idx] }));

  let reference = examples;
  if (!reference) {
    const valid = scored.filter((s) => Number.isFinite(s.score));
    if (valid.length) {
      valid.sort((a, b) => a.score - b.score);
      const lows = valid.slice(0, 3);
      const highs = valid.slice(-3);
      const midStart = Math.max(0, Math.floor(valid.length / 2) - 1);
      const mids = valid.slice(midStart, midStart + 3);
      reference = [...lows, ...mids, ...highs];
      const refItems = reference.map((r) => r.item);
      const rescored = await scoreBatch(refItems, instructions, [], { llm, ...options });
      rescored.forEach((score, idx) => {
        reference[idx].score = score;
      });
    } else {
      reference = [];
    }
  }

  const finalScores = [];
  for (let i = 0; i < list.length; i += chunkSize) {
    // eslint-disable-next-line no-await-in-loop
    const scores = await scoreBatch(list.slice(i, i + chunkSize), instructions, reference, {
      llm,
      ...options,
    });
    finalScores.push(...scores);
  }

  return { scores: finalScores, reference };
}
