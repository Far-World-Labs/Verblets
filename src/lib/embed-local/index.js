/**
 * Local embedding functions.
 *
 * All functions resolve their embedding model through an EmbeddingService —
 * either from config (injected by withConfig) or a global fallback created
 * when setEmbedEnabled(true) is called standalone.
 *
 * Default model: CLIP multimodal (text + images in same vector space).
 * Request { embedding: { good: true } } for the text-only pipeline model.
 */

import { encode } from 'gpt-tokenizer';

import embedNormalizeText from '../embed-normalize-text/index.js';
import { EmbeddingService, resolveEmbedding } from '../../services/embedding-model/index.js';
import { isEmbedEnabled, setEmbedEnabled, getGlobalService, setGlobalService } from './state.js';

export { setEmbedEnabled };

/**
 * Get the EmbeddingService from config or global fallback.
 * Throws if embedding is disabled and no service is provided.
 */
function getService(config) {
  if (config?.embeddingService) return config.embeddingService;
  if (!isEmbedEnabled()) {
    throw new Error('Local embeddings are disabled. Call init({ embed: true }) to enable.');
  }
  let service = getGlobalService();
  if (!service) {
    service = new EmbeddingService();
    setGlobalService(service);
  }
  return service;
}

/**
 * Resolve config.embedding to a model definition.
 * If a direct model name is given, looks it up. Otherwise negotiates via capabilities.
 */
function resolveModel(service, config) {
  const { modelName, caps } = resolveEmbedding(config?.embedding);
  if (modelName) {
    const model = service.getModel(modelName);
    if (model) return model;
  }
  return service.negotiate(caps);
}

/**
 * Pre-download the embedding model so subsequent calls run without network.
 *
 * @param {object} [config]
 * @returns {Promise<void>}
 */
export async function embedWarmup(config = {}) {
  const service = getService(config);
  const model = resolveModel(service, config);
  await service.getLoader(model.name);
}

/**
 * Embed a single text string.
 *
 * @param {string} text
 * @param {object} [config]
 * @returns {Promise<Float32Array>} Normalized embedding vector
 */
export async function embed(text, config = {}) {
  const service = getService(config);
  const model = resolveModel(service, config);
  const loader = await service.getLoader(model.name);
  const [vector] = await loader.embedTexts([embedNormalizeText(text)]);
  return vector;
}

/**
 * Embed multiple texts. Runs them through the model in a single batch.
 *
 * @param {string[]} texts
 * @param {object} [config]
 * @param {AbortSignal} [config.abortSignal] - Signal to abort the embedding operation
 * @returns {Promise<Float32Array[]>}
 */
export async function embedBatch(texts, config = {}) {
  const { abortSignal } = config;
  abortSignal?.throwIfAborted();

  const service = getService(config);
  const model = resolveModel(service, config);
  const loader = await service.getLoader(model.name);
  abortSignal?.throwIfAborted();

  const normalized = texts.map((t) => embedNormalizeText(t));
  return loader.embedTexts(normalized);
}

/**
 * Embed a single image. Requires a multimodal model (auto-negotiates multi).
 *
 * @param {string|object} input - URL, file path, or RawImage
 * @param {object} [config]
 * @returns {Promise<Float32Array>} Normalized embedding vector (same space as text)
 */
export async function embedImage(input, config = {}) {
  const service = getService(config);
  const { modelName, caps } = resolveEmbedding(config?.embedding);
  const model = modelName
    ? service.getModel(modelName)
    : service.negotiate({ ...caps, multi: true });
  const loader = await service.getLoader(model.name);
  if (!loader.embedImages) {
    throw new Error(`Model "${model.name}" does not support image embedding. Use a multi model.`);
  }
  const [vector] = await loader.embedImages([input]);
  return vector;
}

/**
 * Embed multiple images. Requires a multimodal model (auto-negotiates multi).
 *
 * @param {Array<string|object>} inputs - URLs, file paths, or RawImages
 * @param {object} [config]
 * @returns {Promise<Float32Array[]>}
 */
export async function embedImageBatch(inputs, config = {}) {
  const service = getService(config);
  const { modelName, caps } = resolveEmbedding(config?.embedding);
  const model = modelName
    ? service.getModel(modelName)
    : service.negotiate({ ...caps, multi: true });
  const loader = await service.getLoader(model.name);
  if (!loader.embedImages) {
    throw new Error(`Model "${model.name}" does not support image embedding. Use a multi model.`);
  }
  return loader.embedImages(inputs);
}

/**
 * Split text into token-bounded chunks and embed each one.
 * Returns chunks with their vectors and character positions in the original text.
 *
 * @param {string} text - Source text (markdown, prose, etc.)
 * @param {object} [config]
 * @param {number} [config.maxTokens=256] - Max tokens per chunk
 * @param {AbortSignal} [config.abortSignal] - Signal to abort the embedding operation
 * @returns {Promise<Array<{ text: string, vector: Float32Array, start: number, end: number }>>}
 */
export async function embedChunked(text, config = {}) {
  const { maxTokens = 256, abortSignal } = config;
  const service = getService(config);
  const model = resolveModel(service, config);
  const loader = await service.getLoader(model.name);

  const normalized = embedNormalizeText(text);
  const chunks = splitIntoChunks(normalized, text, maxTokens);
  if (chunks.length === 0) return [];

  abortSignal?.throwIfAborted();
  const vectors = await loader.embedTexts(chunks.map((c) => c.text));

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
