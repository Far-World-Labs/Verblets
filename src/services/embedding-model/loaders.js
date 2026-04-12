/**
 * Embedding model loaders.
 *
 * Each loader downloads/caches a model on first use and returns a uniform
 * interface: { embedTexts, embedImages?, dimensions }.
 *
 * Both embedTexts and embedImages accept an options object with:
 *   batchSize   — max items per forward pass (default from model def or 64/16)
 *   abortSignal — cancel between chunks
 *
 * Large inputs are chunked automatically. Callers can throw arbitrarily
 * large arrays without worrying about memory or model limits.
 *
 * Loader types:
 *   pipeline — @huggingface/transformers feature-extraction (text only)
 *   clip     — CLIPTextModelWithProjection + CLIPVisionModelWithProjection (multimodal)
 */

import {
  pipeline,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  AutoProcessor,
  RawImage,
} from '@huggingface/transformers';

const DEFAULT_TEXT_BATCH = 64;
const DEFAULT_IMAGE_BATCH = 16;

/** L2-normalize a Float32Array. Returns a new array. */
function l2Normalize(vec) {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm === 0) return new Float32Array(vec.length);
  const out = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm;
  return out;
}

/** Slice an array into chunks of at most `size` elements. */
function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Load a text-only feature-extraction pipeline.
 *
 * @param {object} modelDef - Catalog entry
 * @returns {Promise<{ embedTexts: function, embedImages: undefined, dimensions: number }>}
 */
export async function loadPipeline(modelDef) {
  const { name, dtype = 'fp32', pooling = 'cls', normalize = true } = modelDef;
  const defaultBatch = modelDef.textBatchSize ?? DEFAULT_TEXT_BATCH;
  const startTime = Date.now();
  console.error(`[verblets:embed] Loading pipeline model "${name}"…`);

  const extractor = await pipeline('feature-extraction', name, { dtype });
  console.error(`[verblets:embed] Pipeline model "${name}" ready (${Date.now() - startTime}ms)`);

  const embedTexts = async (texts, opts = {}) => {
    const { batchSize = defaultBatch, abortSignal } = opts;
    const batches = chunk(texts, batchSize);
    const allVectors = [];

    for (const batch of batches) {
      abortSignal?.throwIfAborted();
      const output = await extractor(batch, { pooling, normalize });
      const dim = output.dims.at(-1);
      for (let i = 0; i < batch.length; i++) {
        allVectors.push(new Float32Array(output.data.slice(i * dim, (i + 1) * dim)));
      }
    }

    return allVectors;
  };

  return { embedTexts, embedImages: undefined, dimensions: modelDef.dimensions };
}

/**
 * Load a CLIP multimodal model (text + vision in the same vector space).
 *
 * @param {object} modelDef - Catalog entry
 * @returns {Promise<{ embedTexts: function, embedImages: function, dimensions: number }>}
 */
export async function loadClip(modelDef) {
  const { name, dtype = 'fp32' } = modelDef;
  const defaultTextBatch = modelDef.textBatchSize ?? DEFAULT_TEXT_BATCH;
  const defaultImageBatch = modelDef.imageBatchSize ?? DEFAULT_IMAGE_BATCH;
  const startTime = Date.now();
  console.error(`[verblets:embed] Loading CLIP model "${name}"…`);

  const [tokenizer, textModel, processor, visionModel] = await Promise.all([
    AutoTokenizer.from_pretrained(name),
    CLIPTextModelWithProjection.from_pretrained(name, { dtype }),
    AutoProcessor.from_pretrained(name),
    CLIPVisionModelWithProjection.from_pretrained(name, { dtype }),
  ]);

  console.error(`[verblets:embed] CLIP model "${name}" ready (${Date.now() - startTime}ms)`);

  const embedTexts = async (texts, opts = {}) => {
    const { batchSize = defaultTextBatch, abortSignal } = opts;
    const batches = chunk(texts, batchSize);
    const allVectors = [];

    for (const batch of batches) {
      abortSignal?.throwIfAborted();
      const inputs = tokenizer(batch, { padding: true, truncation: true });
      const output = await textModel(inputs);
      const embeds = output.text_embeds;
      const dim = embeds.dims[1];
      for (let i = 0; i < batch.length; i++) {
        allVectors.push(l2Normalize(new Float32Array(embeds.data.slice(i * dim, (i + 1) * dim))));
      }
    }

    return allVectors;
  };

  const embedImages = async (inputs, opts = {}) => {
    const { batchSize = defaultImageBatch, abortSignal } = opts;
    const batches = chunk(inputs, batchSize);
    const allVectors = [];

    for (const batch of batches) {
      abortSignal?.throwIfAborted();
      // Load all images in the batch concurrently
      const images = await Promise.all(batch.map((input) => RawImage.read(input)));
      // Processor stacks pixel_values into a single tensor for batched forward pass
      const imageInputs = await processor(images);
      const output = await visionModel(imageInputs);
      const embeds = output.image_embeds;
      const dim = embeds.dims[1];
      for (let i = 0; i < batch.length; i++) {
        allVectors.push(l2Normalize(new Float32Array(embeds.data.slice(i * dim, (i + 1) * dim))));
      }
    }

    return allVectors;
  };

  return { embedTexts, embedImages, dimensions: modelDef.dimensions };
}
