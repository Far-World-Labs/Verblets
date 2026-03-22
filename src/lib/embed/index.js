import { pipeline } from '@huggingface/transformers';
import { encode } from 'gpt-tokenizer';

import { env } from '../env/index.js';
import embedNormalizeText from '../embed-normalize-text/index.js';

const DEFAULT_MODEL = 'mixedbread-ai/mxbai-embed-xsmall-v1';

let extractorPromise;

function getExtractor() {
  if (!extractorPromise) {
    const model = env.VERBLETS_EMBED_MODEL || DEFAULT_MODEL;
    extractorPromise = pipeline('feature-extraction', model, {
      dtype: 'fp32',
    });
  }
  return extractorPromise;
}

/**
 * Pre-download the embedding model so subsequent calls run without network.
 *
 * @returns {Promise<void>}
 */
export async function embedWarmup() {
  await getExtractor();
}

/**
 * Embed a single text string.
 *
 * @param {string} text
 * @returns {Promise<Float32Array>} Normalized embedding vector
 */
export async function embed(text) {
  const extractor = await getExtractor();
  const output = await extractor(embedNormalizeText(text), {
    pooling: 'cls',
    normalize: true,
  });
  return new Float32Array(output.data);
}

/**
 * Embed multiple texts. Runs them through the pipeline in a single batch.
 *
 * @param {string[]} texts
 * @returns {Promise<Float32Array[]>}
 */
export async function embedBatch(texts) {
  const extractor = await getExtractor();
  const normalized = texts.map((t) => embedNormalizeText(t));
  const output = await extractor(normalized, {
    pooling: 'cls',
    normalize: true,
  });

  const dim = output.dims.at(-1);
  const vectors = [];
  for (let i = 0; i < normalized.length; i++) {
    vectors.push(new Float32Array(output.data.slice(i * dim, (i + 1) * dim)));
  }
  return vectors;
}

/**
 * Split text into token-bounded chunks and embed each one.
 * Returns chunks with their vectors and character positions in the original text.
 *
 * @param {string} text - Source text (markdown, prose, etc.)
 * @param {object} [options]
 * @param {number} [options.maxTokens=256] - Max tokens per chunk
 * @returns {Promise<Array<{ text: string, vector: Float32Array, start: number, end: number }>>}
 */
export async function embedChunked(text, options = {}) {
  const { maxTokens = 256 } = options;
  const normalized = embedNormalizeText(text);

  const chunks = splitIntoChunks(normalized, text, maxTokens);
  if (chunks.length === 0) return [];

  const vectors = await embedBatch(chunks.map((c) => c.text));

  return chunks.map((chunk, i) => ({
    ...chunk,
    vector: vectors[i],
  }));
}

/**
 * Split text into token-bounded chunks, preserving paragraph boundaries.
 * Tracks character positions in the original (pre-normalized) text.
 */
function splitIntoChunks(normalized, original, maxTokens) {
  const paragraphs = normalized.split(/\n\n+/);
  const chunks = [];
  let currentText = '';
  let currentTokens = 0;
  let searchFrom = 0;

  const flush = () => {
    const trimmed = currentText.trim();
    if (!trimmed) return;
    const start = original.indexOf(trimmed.slice(0, 20), searchFrom);
    const end = start + trimmed.length;
    chunks.push({
      text: trimmed,
      start: Math.max(0, start),
      end: Math.min(original.length, end),
    });
    searchFrom = end;
    currentText = '';
    currentTokens = 0;
  };

  for (const paragraph of paragraphs) {
    const paraTokens = encode(paragraph).length;

    if (currentText && currentTokens + paraTokens > maxTokens) {
      flush();
    }

    // Single paragraph exceeds budget — split by sentences
    if (paraTokens > maxTokens) {
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        const sentTokens = encode(sentence).length;
        if (currentText && currentTokens + sentTokens > maxTokens) {
          flush();
        }
        currentText += (currentText ? ' ' : '') + sentence;
        currentTokens += sentTokens;
      }
    } else {
      currentText += (currentText ? '\n\n' : '') + paragraph;
      currentTokens += paraTokens;
    }
  }

  flush();
  return chunks;
}
