import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';
import { constants as promptConstants } from '../../prompts/index.js';

const { onlyJSONArray } = promptConstants;

async function scoreBatch(items, instructions, reference = []) {
  const listBlock = wrapVariable(items.join('\n'), { tag: 'items' });
  const refBlock = reference.length
    ? `\nCalibration examples (score - text):\n${wrapVariable(
        reference.map((r) => `${r.score} - ${r.item}`).join('\n'),
        { tag: 'reference' }
      )}`
    : '';

  const prompt =
    `Score each line in <items> from 0 (worst) to 10 (best) based on: ${instructions}.` +
    `\nRespond only with a JSON array of numbers in the same order.` +
    `${refBlock}\n${onlyJSONArray}\n${listBlock}`;

  const response = await chatGPT(prompt, {
    modelOptions: {
      response_format: {
        type: 'json_object',
        schema: { type: 'array', items: { type: 'number' } },
      },
    },
  });
  let arr;
  try {
    arr = JSON.parse(response);
  } catch {
    throw new Error('Score batch did not return valid JSON');
  }
  if (!Array.isArray(arr) || arr.length !== items.length) {
    throw new Error('Score batch mismatch');
  }
  return arr.map((n) => Number(n));
}

export default async function bulkScore(list, instructions, { chunkSize = 10, examples } = {}) {
  if (!Array.isArray(list) || list.length === 0) {
    return { scores: [], reference: [] };
  }

  const firstScores = [];
  for (let i = 0; i < list.length; i += chunkSize) {
    // eslint-disable-next-line no-await-in-loop
    const scores = await scoreBatch(list.slice(i, i + chunkSize), instructions);
    firstScores.push(...scores);
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
      const rescored = await scoreBatch(refItems, instructions);
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
    const scores = await scoreBatch(list.slice(i, i + chunkSize), instructions, reference);
    finalScores.push(...scores);
  }

  return { scores: finalScores, reference };
}
