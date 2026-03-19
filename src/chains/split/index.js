import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import chunkSentences from '../../lib/chunk-sentences/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';
import { resolve, resolveAll, mapped, withOperation } from '../../lib/context/resolve.js';

// ===== Option Mappers =====

const DEFAULT_PRESERVATION = { short: 0.5, long: 0.1 };

/**
 * Map preservation option to maxDifference thresholds.
 * Accepts 'low'|'high' or a {short, long} object with raw thresholds.
 * @param {string|Object|undefined} value
 * @returns {{ short: number, long: number }}
 */
export const mapPreservation = (value) => {
  if (value === undefined) return DEFAULT_PRESERVATION;
  if (typeof value === 'object') return value;
  return (
    {
      low: { short: 0.7, long: 0.25 },
      med: DEFAULT_PRESERVATION,
      high: { short: 0.3, long: 0.05 },
    }[value] ?? DEFAULT_PRESERVATION
  );
};

// improbable delimiter string, similar to a multipart form boundary
const defaultDelimiter = '---763927459---';

const buildPrompt = (chunk, instructions, delimiter, context = {}) => {
  const { previousContent = '', targetSplitCount = null } = context;

  let prompt = `You are marking split points in text with "${delimiter}". 

${wrapVariable(instructions, { tag: 'instructions', forceHTML: true })}

IMPORTANT RULES:
- Only insert "${delimiter}" at natural break points - do NOT split mid-sentence
- Each section should be substantively different from adjacent sections
- Preserve ALL original text exactly - only add delimiters
- For topic changes: Look for shifts in subject matter, not just related themes
- Be selective - fewer, more meaningful splits are better than many weak ones`;

  if (targetSplitCount) {
    prompt += `\n- Aim for approximately ${targetSplitCount} sections in this chunk`;
  }

  if (previousContent) {
    prompt += `\n\nPREVIOUS CONTEXT (for continuity):\n${previousContent.slice(-200)}...\n`;
  }

  prompt += `\n\n${wrapVariable(chunk, { tag: 'text-to-process', forceHTML: true })}`;

  return prompt;
};

export default async function split(text, instructions, config = {}) {
  config = withOperation('split', config);
  const { delimiter = defaultDelimiter } = config;
  const {
    llm,
    chunkLen,
    targetSplitsPerChunk,
    maxAttempts,
    retryDelay,
    temperature,
    retryOnAll,
    preservation: preservationConfig,
  } = await resolveAll(config, {
    llm: 'fastGoodCheapCoding',
    chunkLen: 4000,
    targetSplitsPerChunk: null,
    maxAttempts: 2,
    retryDelay: 1000,
    temperature: 0.1,
    retryOnAll: false,
    preservation: mapped(mapPreservation),
  });
  const preservationShort = await resolve('preservationShort', config, preservationConfig.short);
  const preservationLong = await resolve('preservationLong', config, preservationConfig.long);

  const chunks = chunkSentences(text, chunkLen);

  // Process chunks in parallel for better performance
  const promises = chunks.map(async (chunk, index) => {
    const context = {
      targetSplitCount: targetSplitsPerChunk,
    };

    const prompt = buildPrompt(chunk, instructions, delimiter, context);
    const llmConfig = {
      ...config,
      llm,
      modelOptions: {
        temperature,
      },
    };

    try {
      const output = await retry(() => callLlm(prompt, llmConfig), {
        label: 'split',
        maxAttempts,
        retryDelay,
        retryOnAll,
        onProgress: config.onProgress,
        abortSignal: config.abortSignal,
      });

      const outputWithoutDelimiters = output.replace(
        new RegExp(delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        ''
      );
      const originalChunk = chunk.trim();

      // If the output is significantly different, fall back to original
      // Be more lenient for shorter texts (common in tests)
      const maxDifference = originalChunk.length < 100 ? preservationShort : preservationLong;
      if (
        Math.abs(outputWithoutDelimiters.length - originalChunk.length) >
        originalChunk.length * maxDifference
      ) {
        if (config.logger?.warn) {
          config.logger.warn(
            `Split output differs significantly from input for chunk ${
              index + 1
            }, using original chunk`
          );
        }
        return chunk;
      }

      return output;
    } catch (error) {
      if (config.logger?.warn) {
        config.logger.warn(`Split failed for chunk ${index + 1}:`, error.message);
      }
      return chunk;
    }
  });

  const results = await Promise.all(promises);
  return results.join('');
}
