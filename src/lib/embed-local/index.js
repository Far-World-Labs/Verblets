import { pipeline } from '@huggingface/transformers';
import { encode } from 'gpt-tokenizer';

import { get as configGet } from '../config/index.js';
import embedNormalizeText from '../embed-normalize-text/index.js';
import {
  isEmbedEnabled,
  setEmbedEnabled,
  getExtractorPromise,
  setExtractorPromise,
} from './state.js';

export { setEmbedEnabled };

function getExtractor() {
  let extractorPromise = getExtractorPromise();
  if (!extractorPromise) {
    if (!isEmbedEnabled()) {
      throw new Error('Local embeddings are disabled. Call init({ embed: true }) to enable.');
    }
    const model = configGet('VERBLETS_EMBED_MODEL');
    const startTime = Date.now();
    console.error(`[verblets:embed] Loading model "${model}"…`);
    extractorPromise = pipeline('feature-extraction', model, {
      dtype: 'fp32',
    }).then((extractor) => {
      console.error(`[verblets:embed] Model "${model}" ready (${Date.now() - startTime}ms)`);
      return extractor;
    });
    setExtractorPromise(extractorPromise);
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
 * @param {object} [config]
 * @param {AbortSignal} [config.abortSignal] - Signal to abort the embedding operation
 * @returns {Promise<Float32Array[]>}
 */
export async function embedBatch(texts, config = {}) {
  const { abortSignal } = config;
  abortSignal?.throwIfAborted();

  const extractor = await getExtractor();
  abortSignal?.throwIfAborted();

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
  const { maxTokens = 256, abortSignal } = options;
  const normalized = embedNormalizeText(text);

  const chunks = splitIntoChunks(normalized, text, maxTokens);
  if (chunks.length === 0) return [];

  const vectors = await embedBatch(
    chunks.map((c) => c.text),
    { abortSignal }
  );

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
